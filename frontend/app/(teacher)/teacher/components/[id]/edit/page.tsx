'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LearningComponent,
  Category,
  Visibility,
  UpdateComponentRequest,
  CATEGORY_CONFIG,
} from '@/types/component';
import { Material } from '@/types/material';
import {
  getComponentById,
  updateComponent,
  updateComponentVisibility,
  deleteComponent,
} from '@/lib/api/components';
import { getMaterials, uploadMaterial } from '@/lib/api/materials';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { VisibilitySelect } from '@/components/ui/VisibilitySelect';
import { MaterialList } from '@/components/materials/MaterialList';

interface QuestionInput {
  id: string;
  question: string;
  answer: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function EditComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [component, setComponent] = useState<LearningComponent | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('adult');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadMaterials = useCallback(async () => {
    try {
      const materialsData = await getMaterials(id);
      setMaterials(materialsData);
    } catch {
      // Materials fetch may fail if none exist
      setMaterials([]);
    }
  }, [id]);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const data = await getComponentById(id);
        setComponent(data);

        // Populate form fields with null-safe access
        setTitle(data.title || '');
        setSubject(data.subject || data.theme || '');
        setDescription(data.description || '');
        setCategory((data.category as Category) || 'adult');
        setVisibility(data.visibility || 'private');
        setTagsInput((data.tags || []).join(', '));
        setThumbnailUrl(data.thumbnailUrl || '');
        const questionsData = data.questions || [];
        setQuestions(
          questionsData.map((q) => ({
            id: q.id || crypto.randomUUID(),
            question: q.question || '',
            answer: q.answer || '',
          }))
        );

        // Load materials
        await loadMaterials();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load component');
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [id, loadMaterials]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), question: '', answer: '' }]);
  };

  const removeQuestion = (qId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const updateQuestion = (qId: string, field: 'question' | 'answer', value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, [field]: value } : q))
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '請輸入標題';
    }

    if (!subject.trim()) {
      newErrors.subject = '請輸入主題';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const validQuestions = questions
        .filter((q) => q.question.trim() && q.answer.trim())
        .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }));

      const data: UpdateComponentRequest = {
        title: title.trim(),
        theme: subject.trim(),
        description: description.trim(),
        category,
        tags,
        questions: validQuestions,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      };

      await updateComponent(id, data);

      // Update visibility if changed
      if (visibility !== component?.visibility) {
        await updateComponentVisibility(id, { visibility });
      }

      router.push('/teacher/components');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteComponent(id);
      router.push('/teacher/components');
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗，請稍後再試');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!component) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error || '找不到教材'}</p>
          <Link href="/teacher/components" className="mt-4 inline-block text-blue-600 hover:underline">
            返回我的教材
          </Link>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.name.endsWith('.zip')) {
      setError('請上傳 ZIP 檔案');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('檔案大小超過限制 (最大 50MB)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      await uploadMaterial(id, file, (progress) => {
        setUploadProgress(progress);
      });
      await loadMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const config = CATEGORY_CONFIG[category];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Link href="/teacher/components">
        <Button variant="ghost" size="sm">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回我的教材
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">編輯教材</h1>
          <p className="mt-1 text-gray-600">修改教材資訊</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          刪除教材
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">確認刪除</h3>
            <p className="mt-2 text-gray-600">
              確定要刪除「{component.title}」嗎？此操作無法復原。
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '刪除中...' : '確認刪除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">教材資訊</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
                標題 <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="輸入教材標題"
                error={errors.title}
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">
                主題 <span className="text-red-500">*</span>
              </label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="輸入學習主題"
                error={errors.subject}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                可見性
              </label>
              <VisibilitySelect value={visibility} onChange={setVisibility} />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                分類 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {(['adult', 'kid'] as const).map((cat) => {
                  const catConfig = CATEGORY_CONFIG[cat];
                  return (
                    <label
                      key={cat}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                        category === cat
                          ? `${catConfig.borderClass} ${catConfig.bgClass}`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat}
                        checked={category === cat}
                        onChange={() => setCategory(cat)}
                        className="sr-only"
                      />
                      <span
                        className={`h-4 w-4 rounded-full border-2 ${
                          category === cat
                            ? cat === 'adult'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-red-600 bg-red-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {category === cat && (
                          <span className="block h-full w-full rounded-full border-2 border-white" />
                        )}
                      </span>
                      <span className="font-medium">{catConfig.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                說明
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="輸入教材說明"
                rows={4}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
                標籤
              </label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="以逗號分隔，例如: Python, 基礎, 程式設計"
              />
              <p className="mt-1 text-xs text-gray-500">多個標籤請以逗號分隔</p>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label htmlFor="thumbnailUrl" className="mb-1 block text-sm font-medium text-gray-700">
                縮圖網址
              </label>
              <Input
                id="thumbnailUrl"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Questions */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  問與答 <span className="text-xs text-gray-400">（選填）</span>
                </label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新增問答
                </Button>
              </div>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    尚未新增問與答
                  </p>
                ) : (
                  questions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`rounded-lg border p-4 ${config.borderClass} ${config.bgClass}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">問答 #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">問題</label>
                        <Input
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                          placeholder="輸入問題"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">答案</label>
                        <textarea
                          value={q.answer}
                          onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                          placeholder="輸入答案"
                          rows={3}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/teacher/components">
                <Button type="button" variant="outline">
                  取消
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    儲存中...
                  </>
                ) : (
                  '儲存變更'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Materials Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">教材管理</h2>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <svg className="mr-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    上傳中 {uploadProgress}%
                  </>
                ) : (
                  <>
                    <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    上傳新版本
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MaterialList
            materials={materials}
            componentId={id}
            canDelete={true}
            onDelete={loadMaterials}
          />
        </CardContent>
      </Card>
    </div>
  );
}
