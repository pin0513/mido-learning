'use client';

import { Material } from '@/types/material';
import { VersionSelector } from './VersionSelector';
import { Button } from '@/components/ui/Button';

interface MaterialHeaderProps {
  materials: Material[];
  currentMaterialId: string;
  componentTitle: string;
  isScriptOpen: boolean;
  hasScript: boolean;
  onBack: () => void;
  onVersionChange: (materialId: string) => void;
  onToggleScript: () => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
  isFullscreen: boolean;
}

export function MaterialHeader({
  materials,
  currentMaterialId,
  componentTitle,
  isScriptOpen,
  hasScript,
  onBack,
  onVersionChange,
  onToggleScript,
  onDownload,
  onToggleFullscreen,
  onClose,
  isFullscreen,
}: MaterialHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Back + Version Selector */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1"
          aria-label="返回"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="hidden sm:inline">返回</span>
        </Button>

        <div className="h-6 w-px bg-gray-200" />

        <VersionSelector
          materials={materials}
          currentMaterialId={currentMaterialId}
          componentTitle={componentTitle}
          onVersionChange={onVersionChange}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {hasScript && (
          <Button
            variant={isScriptOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleScript}
            className="gap-1"
            aria-label={isScriptOpen ? '關閉講稿' : '開啟講稿'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">講稿</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className="gap-1"
          aria-label="下載"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className="hidden sm:inline">下載</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className="gap-1"
          aria-label={isFullscreen ? '退出全螢幕' : '全螢幕'}
        >
          {isFullscreen ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
          <span className="hidden sm:inline">{isFullscreen ? '退出' : '全螢幕'}</span>
        </Button>

        <div className="h-6 w-px bg-gray-200" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="關閉"
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
    </header>
  );
}
