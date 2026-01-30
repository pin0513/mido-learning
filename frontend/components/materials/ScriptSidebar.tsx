'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ScriptSidebarProps {
  scriptUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ScriptSidebar({ scriptUrl, isOpen, onClose }: ScriptSidebarProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !scriptUrl) return;

    const fetchScript = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(scriptUrl);
        if (!response.ok) {
          throw new Error('無法載入講稿');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScript();
  }, [scriptUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-80 flex-col border-l border-gray-200 bg-white lg:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-900">講稿</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="關閉講稿"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <svg
              className="mx-auto h-8 w-8 text-red-400"
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
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && content && (
          <article className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {content}
            </div>
          </article>
        )}

        {!isLoading && !error && !content && (
          <div className="text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2">無講稿內容</p>
          </div>
        )}
      </div>
    </aside>
  );
}
