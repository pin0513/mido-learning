'use client';

import { Input } from '@/components/ui/Input';
import { Role } from './RoleSelect';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: Role | 'all';
  onRoleFilterChange: (value: Role | 'all') => void;
}

const ROLE_OPTIONS: { value: Role | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

export function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex-1 sm:max-w-xs">
        <Input
          type="search"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="sm:w-48">
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as Role | 'all')}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
