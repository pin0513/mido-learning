'use client';

import { Wish, WishStatus, WISH_STATUS_CONFIG } from '@/types/wish';
import { Button } from '@/components/ui/Button';

interface WishCardProps {
  wish: Wish;
  onStartProcessing?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onCreateComponent?: (wish: Wish) => void;
  onLinkComponent?: (wish: Wish) => void;
  isLoading?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: WishStatus }) {
  const config = WISH_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      {config.label}
    </span>
  );
}

export function WishCard({
  wish,
  onStartProcessing,
  onDelete,
  onCreateComponent,
  onLinkComponent,
  isLoading = false,
}: WishCardProps) {
  const statusConfig = WISH_STATUS_CONFIG[wish.status];

  return (
    <div
      className={`rounded-lg border ${statusConfig.borderClass} ${statusConfig.bgClass} overflow-hidden`}
    >
      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg" aria-hidden="true">
            {'\u{1F4AD}'}
          </span>
          <p className="flex-1 text-gray-900">{wish.content}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span aria-hidden="true">{'\u{1F4E7}'}</span>
            <span>{wish.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <span aria-hidden="true">{'\u{1F550}'}</span>
            <span>{formatDate(wish.createdAt)}</span>
          </div>
        </div>

        {/* Linked Component Info (for completed wishes) */}
        {wish.status === 'completed' && wish.linkedComponentTitle && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <span aria-hidden="true">{'\u{2705}'}</span>
            <span>
              已連結:{' '}
              <span className="font-medium">{wish.linkedComponentTitle}</span>
            </span>
            {wish.linkedComponentId && (
              <a
                href={`/admin/components/${wish.linkedComponentId}`}
                className="text-blue-600 hover:underline"
              >
                {'\u{2192}'}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action Section */}
      <div
        className={`flex items-center justify-between border-t px-4 py-3 ${statusConfig.borderClass}`}
      >
        <div className="flex gap-2">
          {/* Pending Status Actions */}
          {wish.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onStartProcessing?.(wish)}
                disabled={isLoading}
              >
                開始處理
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete?.(wish)}
                disabled={isLoading}
                className="text-red-600 hover:bg-red-50"
              >
                刪除
              </Button>
            </>
          )}

          {/* Processing Status Actions */}
          {wish.status === 'processing' && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onCreateComponent?.(wish)}
                disabled={isLoading}
              >
                建立學習元件
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLinkComponent?.(wish)}
                disabled={isLoading}
              >
                連結現有元件
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete?.(wish)}
                disabled={isLoading}
                className="text-red-600 hover:bg-red-50"
              >
                刪除
              </Button>
            </>
          )}

          {/* Completed and Deleted Status - No actions */}
        </div>

        <StatusBadge status={wish.status} />
      </div>
    </div>
  );
}
