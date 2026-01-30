'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">Manage your platform</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Total Users</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-500">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Active Courses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-500">Published courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Enrollments</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-500">Total enrollments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Completion Rate</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">0%</p>
            <p className="text-sm text-gray-500">Average completion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No recent activity to display.</p>
        </CardContent>
      </Card>
    </div>
  );
}
