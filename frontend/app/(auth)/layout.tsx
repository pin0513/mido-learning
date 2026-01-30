import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-bold text-blue-600">
        Mido Learning
      </Link>
      {children}
    </div>
  );
}
