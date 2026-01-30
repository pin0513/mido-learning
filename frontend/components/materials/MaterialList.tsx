'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Material } from '@/types/material';
import { getDownloadUrl, deleteMaterial } from '@/lib/api/materials';
import { Button } from '@/components/ui/Button';

interface MaterialListProps {
  materials: Material[];
  componentId: string;
  canDelete?: boolean;
  onDelete?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function MaterialList({
  materials,
  componentId,
  canDelete = false,
  onDelete,
}: MaterialListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedMaterials = [...materials].sort((a, b) => b.version - a.version);
  const latestVersion = sortedMaterials.length > 0 ? sortedMaterials[0].version : 0;

  const handleDownload = (materialId: string) => {
    const url = getDownloadUrl(materialId);
    window.open(url, '_blank');
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('確定要刪除此版本的教材嗎？此操作無法復原。')) {
      return;
    }

    setDeletingId(materialId);
    setError(null);

    try {
      await deleteMaterial(materialId);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setDeletingId(null);
    }
  };

  if (materials.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">尚無教材</p>
        <p className="text-xs text-gray-400">上傳 ZIP 檔案來新增教材</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {sortedMaterials.map((material) => (
          <div
            key={material.id}
            className="flex items-center justify-between gap-4 p-3 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Version badge */}
              <span
                className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                  material.version === latestVersion
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                v{material.version}
                {material.version === latestVersion && (
                  <span className="ml-1 text-blue-500">latest</span>
                )}
              </span>

              {/* File info */}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {material.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(material.size)} - {formatDate(material.uploadedAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/components/${componentId}/materials/${material.id}`}>
                <Button variant="ghost" size="sm">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span className="ml-1 hidden sm:inline">檢視</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(material.id)}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="ml-1 hidden sm:inline">下載</span>
              </Button>

              {canDelete && material.version !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(material.id)}
                  disabled={deletingId === material.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deletingId === material.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                  <span className="ml-1 hidden sm:inline">刪除</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
