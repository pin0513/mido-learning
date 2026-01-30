'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-gray-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Account Information</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <p className="mt-1 font-mono text-sm text-gray-500">{user?.uid}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Created</label>
            <p className="mt-1 text-gray-900">
              {user?.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Sign In</label>
            <p className="mt-1 text-gray-900">
              {user?.metadata.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>

          <div className="pt-4">
            <Button variant="outline">Edit Profile</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Security</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">Last changed: Never</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
