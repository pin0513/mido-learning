'use client';

import Link from 'next/link';
import { LearningComponent, getCategoryConfig, Visibility } from '@/types/component';
import { TagDisplay } from './TagDisplay';
import { StarRating } from '@/components/ui/StarRating';
import { VisibilityBadge } from '@/components/ui/VisibilitySelect';

interface ComponentCardProps {
  component: LearningComponent;
  href?: string;
  showVisibility?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function ComponentCard({
  component,
  href,
  showVisibility = false,
  currentUserId,
  isAdmin = false,
}: ComponentCardProps) {
  const config = getCategoryConfig(component.category);
  const linkHref = href || `/components/${component.id}`;

  // Determine if we should show visibility badge
  const creatorUid = typeof component.createdBy === 'object'
    ? component.createdBy?.uid
    : component.createdBy;
  const isOwner = currentUserId && creatorUid === currentUserId;
  const shouldShowVisibility = showVisibility && (isOwner || isAdmin);

  // Default visibility for backward compatibility
  const visibility: Visibility = component.visibility || 'private';

  return (
    <Link href={linkHref} className="block group" prefetch={false}>
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
            {shouldShowVisibility && (
              <VisibilityBadge visibility={visibility} />
            )}
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
  );
}
