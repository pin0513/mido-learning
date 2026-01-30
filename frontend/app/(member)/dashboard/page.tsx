'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Courses Enrolled</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-500">Start learning today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Lessons Completed</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-500">Keep up the good work</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Achievements</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-500">Unlock your first badge</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No recent activity. Start a course to begin learning!</p>
        </CardContent>
      </Card>
    </div>
  );
}
