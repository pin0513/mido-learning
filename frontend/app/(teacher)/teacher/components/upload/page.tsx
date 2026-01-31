'use client';

import { useState, useCallback, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Category, CreateComponentRequest, CATEGORY_CONFIG, getCategoryConfig } from '@/types/component';
import { createComponent } from '@/lib/api/components';
import { uploadMaterial } from '@/lib/api/materials';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPE = '.zip';

interface QuestionInput {
  id: string;
  question: string;
  answer: string;
}

export default function NewComponentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state (optional)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('adult');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    if (!file.name.endsWith('.zip')) {
      return '請上傳 ZIP 檔案';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `檔案大小超過限制 (最大 50MB)`;
    }
    return null;
  }, []);

  // File handlers
  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      setSelectedFile(file);
      setFileError(null);
    },
    [validateFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect]
  );

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  // Question handlers
  const addQuestion = () => {
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), question: '', answer: '' }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: 'question' | 'answer', value: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  // Form validation - only title and subject required
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '請輸入標題';
    }
    if (!subject.trim()) {
      newErrors.subject = '請輸入主題';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create component
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const validQuestions = questions
        .filter((q) => q.question.trim() && q.answer.trim())
        .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }));

      const componentData: CreateComponentRequest = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || undefined,
        category,
        tags,
        questions: validQuestions,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      };

      const created = await createComponent(componentData);

      // Step 2: Upload material (if file selected)
      if (selectedFile) {
        await uploadMaterial(created.id, selectedFile, (progress) => {
          setUploadProgress(progress);
        });
      }

      // Redirect to component detail
      router.push(`/teacher/components/${created.id}/edit`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '建立失敗，請稍後再試');
      setIsSubmitting(false);
    }
  };

  const config = getCategoryConfig(category);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新增教材</h1>
        <p className="mt-1 text-gray-600">填寫教材資訊，可選擇同時上傳教材檔案</p>
      </div>

      {/* Error */}
      {submitError && (
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
            <p className="text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload (Optional) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">教材檔案</h2>
              <span className="text-sm text-gray-400">（選填）</span>
            </div>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPE}
                  onChange={handleInputChange}
                  className="hidden"
                />

                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-3 text-gray-600">
                  拖曳 ZIP 檔案到此處，或
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-1 font-medium text-blue-600 hover:text-blue-500"
                  >
                    點擊選擇
                  </button>
                </p>
                <p className="mt-1 text-sm text-gray-500">僅支援 ZIP 格式，最大 50MB</p>
              </div>
            )}

            {fileError && (
              <div className="mt-3 rounded-md bg-red-50 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-600">{fileError}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">教材資訊</h2>
          </CardHeader>
          <CardContent className="space-y-6">
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
                error={formErrors.title}
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
                error={formErrors.subject}
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                分類 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
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
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
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
                {uploadProgress > 0 ? `上傳中 ${uploadProgress}%` : '建立中...'}
              </>
            ) : (
              <>
                {selectedFile ? '建立並上傳' : '建立教材'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
