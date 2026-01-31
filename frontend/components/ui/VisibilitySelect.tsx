'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { GlobeAltIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';
import { Visibility, VISIBILITY_CONFIG } from '@/types/component';

interface VisibilitySelectProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  disabled?: boolean;
}

const visibilityOptions: { value: Visibility; icon: typeof GlobeAltIcon }[] = [
  { value: 'published', icon: GlobeAltIcon },
  { value: 'login', icon: KeyIcon },
  { value: 'private', icon: LockClosedIcon },
];

export function VisibilitySelect({
  value,
  onChange,
  disabled = false,
}: VisibilitySelectProps) {
  const selected = visibilityOptions.find((opt) => opt.value === value) || visibilityOptions[2];
  const config = VISIBILITY_CONFIG[value];

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
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
            <selected.icon className="h-5 w-5 text-gray-500" />
            <span className="block truncate">{config.label}</span>
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
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white
                       py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5
                       focus:outline-none sm:text-sm"
          >
            {visibilityOptions.map((option) => {
              const optionConfig = VISIBILITY_CONFIG[option.value];
              return (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`
                  }
                >
                  {({ selected: isSelected, active }) => (
                    <>
                      <div className="flex items-center gap-2">
                        <option.icon
                          className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500'}`}
                        />
                        <div>
                          <span
                            className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}
                          >
                            {optionConfig.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {optionConfig.description}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              );
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const config = VISIBILITY_CONFIG[visibility];

  const Icon = {
    published: GlobeAltIcon,
    login: KeyIcon,
    private: LockClosedIcon,
  }[visibility];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
