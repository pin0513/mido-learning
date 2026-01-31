'use client';

import { useState } from 'react';

interface MaterialIframeProps {
  src: string;
  title: string;
}

export function MaterialIframe({ src, title }: MaterialIframeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('無法載入教材內容');
  };

  return (
    <div className="relative h-full w-full bg-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-sm text-gray-500">載入教材中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3 text-center">
            <svg
              className="h-12 w-12 text-red-400"
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
            <div>
              <p className="font-medium text-gray-900">{error}</p>
              <p className="mt-1 text-sm text-gray-500">請確認網路連線後重試</p>
            </div>
          </div>
        </div>
      )}

      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
        allow="fullscreen; autoplay; gamepad"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
