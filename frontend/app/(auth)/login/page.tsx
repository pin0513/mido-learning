import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首頁
          </Link>
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">登入</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          歡迎回來！請登入以繼續使用。
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">或使用以下方式登入</span>
          </div>
        </div>

        <GoogleLoginButton />

        <p className="text-center text-sm text-gray-600">
          還沒有帳號？{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            立即註冊
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
