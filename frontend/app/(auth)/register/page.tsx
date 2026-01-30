import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-center text-2xl font-bold text-gray-900">Create Account</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join Mido Learning and start your journey today.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <RegisterForm />

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
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
