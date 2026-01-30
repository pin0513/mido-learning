import Link from 'next/link';
import { LearningComponent, CATEGORY_CONFIG } from '@/types/component';
import { TagDisplay } from './TagDisplay';

interface ComponentCardProps {
  component: LearningComponent;
  href?: string;
}

export function ComponentCard({ component, href }: ComponentCardProps) {
  const config = CATEGORY_CONFIG[component.category];
  const linkHref = href || `/components/${component.id}`;

  return (
    <Link href={linkHref} className="block group">
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
          {/* Category badge */}
          <span
            className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-1 text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-gray-700">
            {component.title}
          </h3>
          <p className="mb-3 text-sm text-gray-500 line-clamp-1">{component.subject}</p>
          <TagDisplay tags={component.tags} category={component.category} maxDisplay={3} />
        </div>
      </article>
    </Link>
  );
}
