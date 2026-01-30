'use client';

import { useState } from 'react';
import { Wish, CreateComponentFromWishRequest } from '@/types/wish';
import { Category, CATEGORY_CONFIG } from '@/types/component';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreateComponentModalProps {
  wish: Wish;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (wishId: string, data: CreateComponentFromWishRequest) => Promise<void>;
  isLoading: boolean;
}

interface FormData {
  title: string;
  subject: string;
  description: string;
  category: Category;
  tags: string;
  questions: Array<{ question: string; answer: string }>;
}

function extractKeywords(content: string): string {
  // Simple keyword extraction - take first few meaningful words
  const words = content
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(0, 5);
  return words.join(' ');
}

export function CreateComponentModal({
  wish,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CreateComponentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: extractKeywords(wish.content),
    subject: '',
    description: wish.content,
    category: 'adult',
    tags: '',
    questions: [{ question: '', answer: '' }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '請輸入標題';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = '請輸入主題';
    }

    if (!formData.description.trim()) {
      newErrors.description = '請輸入描述';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const tags = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const questions = formData.questions.filter(
      (q) => q.question.trim() && q.answer.trim()
    );

    await onSubmit(wish.id, {
      title: formData.title.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      category: formData.category,
      tags,
      questions,
    });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question: '', answer: '' }],
    });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              建立學習元件
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <span className="sr-only">關閉</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
              {/* Original Wish Content */}
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">原始願望：</span>
                  {wish.content}
                </p>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  標題 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  error={errors.title}
                  placeholder="輸入學習元件標題"
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  主題 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  error={errors.subject}
                  placeholder="輸入主題"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.description
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="輸入學習元件描述"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  分類 <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Category,
                    })
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="tags"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  標籤（用逗號分隔）
                </label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="例如：Python, 程式設計, 入門"
                />
              </div>

              {/* Questions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    問答題（選填）
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addQuestion}
                  >
                    + 新增問題
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.questions.map((q, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-gray-200 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          問題 {index + 1}
                        </span>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            移除
                          </button>
                        )}
                      </div>
                      <Input
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(index, 'question', e.target.value)
                        }
                        placeholder="輸入問題"
                        className="mb-2"
                      />
                      <Input
                        value={q.answer}
                        onChange={(e) =>
                          updateQuestion(index, 'answer', e.target.value)
                        }
                        placeholder="輸入答案"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '建立中...' : '建立元件'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
