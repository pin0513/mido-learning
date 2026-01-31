'use client';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Mido Learning. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            您的專屬學習平台
          </p>
        </div>
      </div>
    </footer>
  );
}
