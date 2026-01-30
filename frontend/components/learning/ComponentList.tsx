'use client';

import { LearningComponent } from '@/types/component';
import { ComponentCard } from './ComponentCard';

interface ComponentListProps {
  components: LearningComponent[];
  loading?: boolean;
  emptyMessage?: string;
  cardHrefPrefix?: string;
}

export function ComponentList({
  components,
  loading = false,
  emptyMessage = '目前沒有學習元件',
  cardHrefPrefix,
}: ComponentListProps) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="aspect-video w-full animate-pulse bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
        <svg
          className="mb-4 h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {components.map((component) => (
        <ComponentCard
          key={component.id}
          component={component}
          href={cardHrefPrefix ? `${cardHrefPrefix}/${component.id}` : undefined}
        />
      ))}
    </div>
  );
}
