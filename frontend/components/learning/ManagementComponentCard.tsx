'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LearningComponent, getCategoryConfig, Visibility } from '@/types/component';
import { TagDisplay } from './TagDisplay';
import { StarRating } from '@/components/ui/StarRating';
import { VisibilityBadge } from '@/components/ui/VisibilitySelect';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteComponent } from '@/lib/api/components';

interface ManagementComponentCardProps {
  component: LearningComponent;
  currentUserId?: string;
  isAdmin?: boolean;
  onDeleted?: () => void;
}

export function ManagementComponentCard({
  component,
  currentUserId,
  isAdmin = false,
  onDeleted,
}: ManagementComponentCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const config = getCategoryConfig(component.category);
  const linkHref = `/components/${component.id}`;

  const creatorUid = typeof component.createdBy === 'object'
    ? component.createdBy?.uid
    : component.createdBy;
  const isOwner = currentUserId && creatorUid === currentUserId;
  const canDelete = isOwner || isAdmin;

  const visibility: Visibility = component.visibility || 'private';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteComponent(component.id);
      setIsDeleteDialogOpen(false);
      onDeleted?.();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '刪除失敗');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="block group relative">
        <Link href={linkHref} prefetch={false}>
          <article
            className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${config.borderClass}`}
          >
            {/* Thumbnail */}
            <div className={`aspect-video w-full ${config.bgClass} relative overflow-hidden`}>
              {component.thumbnailUrl ? (
                <img
                  src={component.thumbnailUrl}
                  alt={component.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    className={`h-16 w-16 ${config.textClass} opacity-30`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              )}
              {/* Top badges */}
              <div className="absolute right-2 top-2 flex flex-col gap-1 items-end">
                {/* Category badge */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
                >
                  {config.label}
                </span>
                {/* Visibility badge */}
                <VisibilityBadge visibility={visibility} />
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="mb-1 text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-gray-700">
                {component.title}
              </h3>
              <p className="mb-2 text-sm text-gray-500 line-clamp-1">{component.subject}</p>

              {/* Rating */}
              <div className="mb-2">
                <StarRating
                  rating={component.ratingAverage || 0}
                  count={component.ratingCount || 0}
                  size="sm"
                />
              </div>

              <TagDisplay tags={component.tags} category={component.category} maxDisplay={3} />
            </div>
          </article>
        </Link>

        {/* Action buttons */}
        {canDelete && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="ml-1.5">刪除</span>
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="確認刪除教材"
        description={
          <div className="space-y-2">
            <p>確定要刪除「{component.title}」嗎？</p>
            <p className="text-red-600 font-medium">此操作無法復原。</p>
            {deleteError && (
              <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{deleteError}</p>
            )}
          </div>
        }
        confirmText="確認刪除"
        cancelText="取消"
        isLoading={isDeleting}
      />
    </>
  );
}
