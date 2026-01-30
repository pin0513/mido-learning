'use client';

import { RoleSelect, Role } from './RoleSelect';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserTableProps {
  users: User[];
  onRoleChange: (uid: string, role: Role) => void;
  updatingUserId: string | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function UserTable({ users, onRoleChange, updatingUserId }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Email
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Role
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Created At
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Last Login
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.uid} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  {user.displayName && (
                    <div className="text-sm text-gray-500">{user.displayName}</div>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <RoleSelect
                  value={user.role}
                  onChange={(role) => onRoleChange(user.uid, role)}
                  disabled={updatingUserId === user.uid}
                />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(user.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(user.lastLoginAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
