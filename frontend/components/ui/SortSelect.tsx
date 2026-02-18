'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

export type SortOption = {
  id: string;
  label: string;
  sortBy: 'createdAt' | 'ratingAverage' | 'ratingCount' | 'title';
  sortOrder: 'asc' | 'desc';
  icon: typeof ClockIcon;
};

const defaultSortOptions: SortOption[] = [
  {
    id: 'newest',
    label: '最新上架',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    icon: ClockIcon,
  },
  {
    id: 'oldest',
    label: '最早上架',
    sortBy: 'createdAt',
    sortOrder: 'asc',
    icon: ClockIcon,
  },
  {
    id: 'highest-rated',
    label: '評分最高',
    sortBy: 'ratingAverage',
    sortOrder: 'desc',
    icon: ArrowTrendingUpIcon,
  },
  {
    id: 'lowest-rated',
    label: '評分最低',
    sortBy: 'ratingAverage',
    sortOrder: 'asc',
    icon: ArrowTrendingDownIcon,
  },
  {
    id: 'most-rated',
    label: '最多評分',
    sortBy: 'ratingCount',
    sortOrder: 'desc',
    icon: StarIcon,
  },
];

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  options?: SortOption[];
  disabled?: boolean;
}

export function SortSelect({
  value,
  onChange,
  options = defaultSortOptions,
  disabled = false,
}: SortSelectProps) {
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative w-44">
        <Listbox.Button
          className={`
            relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left
            border border-gray-300 shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            sm:text-sm
          `}
        >
          <span className="flex items-center gap-2">
            <value.icon className="h-4 w-4 text-gray-500" />
            <span className="block truncate">{value.label}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-10 mt-1 max-h-60 min-w-full w-max overflow-auto rounded-lg bg-white
                       py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5
                       focus:outline-none sm:text-sm"
          >
            {options.map((option) => (
              <Listbox.Option
                key={option.id}
                value={option}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`
                }
              >
                {({ selected: isSelected }) => (
                  <>
                    <span className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-gray-500" />
                      <span
                        className={`block whitespace-nowrap ${isSelected ? 'font-semibold' : 'font-normal'}`}
                      >
                        {option.label}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

export { defaultSortOptions };
