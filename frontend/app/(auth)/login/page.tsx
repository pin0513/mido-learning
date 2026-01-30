import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-center text-2xl font-bold text-gray-900">Sign In</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back! Please sign in to continue.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <GoogleLoginButton />

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
