import { Category, CATEGORY_CONFIG } from '@/types/component';

interface TagDisplayProps {
  tags: string[];
  category?: Category;
  maxDisplay?: number;
}

export function TagDisplay({ tags, category = 'adult', maxDisplay }: TagDisplayProps) {
  const config = CATEGORY_CONFIG[category];
  const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
  const remainingCount = maxDisplay && tags.length > maxDisplay ? tags.length - maxDisplay : 0;

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayTags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
        >
          {tag}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
