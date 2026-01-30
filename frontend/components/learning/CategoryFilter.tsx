'use client';

import { Category, CATEGORY_CONFIG } from '@/types/component';

interface CategoryFilterProps {
  selected: Category | 'all';
  onChange: (category: Category | 'all') => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'adult', label: CATEGORY_CONFIG.adult.label },
    { value: 'kid', label: CATEGORY_CONFIG.kid.label },
  ];

  return (
    <div className="flex gap-2">
      {categories.map((cat) => {
        const isSelected = selected === cat.value;
        let buttonClasses =
          'rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

        if (isSelected) {
          if (cat.value === 'all') {
            buttonClasses += ' bg-gray-800 text-white focus:ring-gray-500';
          } else if (cat.value === 'adult') {
            buttonClasses += ' bg-blue-600 text-white focus:ring-blue-500';
          } else {
            buttonClasses += ' bg-red-600 text-white focus:ring-red-500';
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
