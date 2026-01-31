'use client';

import { useState, useEffect, FormEvent } from 'react';
import { CreateComponentRequest, CATEGORY_CONFIG } from '@/types/component';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { getSuggestions } from '@/lib/api/categories';

interface QuestionInput {
  id: string;
  question: string;
  answer: string;
}

interface ComponentFormProps {
  onSubmit: (data: CreateComponentRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function ComponentForm({ onSubmit, isSubmitting = false }: ComponentFormProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Suggestions from API
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  useEffect(() => {
    getSuggestions()
      .then((data) => {
        setCategorySuggestions(data.categories);
        setTagSuggestions(data.tags);
      })
      .catch(console.error);
  }, []);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), question: '', answer: '' }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: 'question' | 'answer', value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
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

    if (category.length === 0) {
      newErrors.category = '請選擇或輸入分類';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const validQuestions = questions
      .filter((q) => q.question.trim() && q.answer.trim())
      .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }));

    const data: CreateComponentRequest = {
      title: title.trim(),
      theme: subject.trim(),
      description: description.trim(),
      category: category[0] || 'adult', // Use first selected category
      tags,
      questions: validQuestions,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
    };

    await onSubmit(data);
  };

  // Get config for display (use first category or default)
  const selectedCategory = category[0] as keyof typeof CATEGORY_CONFIG;
  const config = CATEGORY_CONFIG[selectedCategory] || CATEGORY_CONFIG['adult'];

  return (
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

      {/* Category */}
      <div>
        <TagInput
          label="分類"
          value={category}
          onChange={setCategory}
          suggestions={categorySuggestions}
          placeholder="選擇或輸入分類"
          maxTags={1}
          allowCustom={true}
        />
        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
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
          className={`block w-full rounded-md border px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            errors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      {/* Tags */}
      <div>
        <TagInput
          label="標籤"
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="選擇或輸入標籤"
          allowCustom={true}
        />
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
          {questions.map((q, index) => (
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
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
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
              建立中...
            </>
          ) : (
            '建立教材'
          )}
        </Button>
      </div>
    </form>
  );
}
