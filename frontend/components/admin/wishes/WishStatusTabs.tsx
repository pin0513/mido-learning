'use client';

import { WishStatus, WISH_STATUS_CONFIG } from '@/types/wish';

interface WishStatusTabsProps {
  activeStatus: WishStatus | 'all';
  onStatusChange: (status: WishStatus | 'all') => void;
  counts?: Record<WishStatus | 'all', number>;
}

const STATUS_OPTIONS: Array<{ value: WishStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: WISH_STATUS_CONFIG.pending.label },
  { value: 'processing', label: WISH_STATUS_CONFIG.processing.label },
  { value: 'completed', label: WISH_STATUS_CONFIG.completed.label },
  { value: 'deleted', label: WISH_STATUS_CONFIG.deleted.label },
];

export function WishStatusTabs({
  activeStatus,
  onStatusChange,
  counts,
}: WishStatusTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {STATUS_OPTIONS.map((option) => {
          const isActive = activeStatus === option.value;
          const count = counts?.[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {option.label}
              {count !== undefined && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
