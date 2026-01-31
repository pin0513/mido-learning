'use client';

import { CATEGORY_CONFIG, getCategoryConfig } from '@/types/component';

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories: { value: string; label: string }[] = [
    { value: 'all', label: '全部' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isSelected = selected === cat.value;
        const config = cat.value === 'all' ? null : getCategoryConfig(cat.value);

        let buttonClasses =
          'rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

        if (isSelected) {
          if (cat.value === 'all') {
            buttonClasses += ' bg-gray-800 text-white focus:ring-gray-500';
          } else if (config) {
            buttonClasses += ` ${config.buttonClass} text-white`;
          }
        } else {
          buttonClasses += ' bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500';
        }

        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={buttonClasses}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
