import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Mido Learning. 版權所有。
          </div>
          <nav className="flex space-x-6">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">
              隱私權政策
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
              服務條款
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
