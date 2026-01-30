'use client';

import { useState, useRef, useEffect } from 'react';

export type Role = 'student' | 'teacher' | 'admin';

interface RoleSelectProps {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  student: '學生',
  teacher: '老師',
  admin: '管理員',
};

const ROLE_COLORS: Record<Role, string> = {
  student: 'bg-blue-100 text-blue-800',
  teacher: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
};

export function RoleSelect({ value, onChange, disabled = false }: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (role: Role) => {
    if (role !== value) {
      onChange(role);
    }
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors ${ROLE_COLORS[value]} ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        {ROLE_LABELS[value]}
        {!disabled && (
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-lg">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                role === value ? 'bg-gray-100 font-medium' : ''
              }`}
            >
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
