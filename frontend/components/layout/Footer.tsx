'use client';

import { SiteMark } from '@/components/layout/SiteMark';

// 和頂列、知識地圖頁尾同一套：board 底、粉筆色字、站標。
export function Footer() {
  return (
    <footer className="bg-board font-kp text-chalk-2">
      <div className="flex flex-col items-center justify-between gap-4 px-[clamp(16px,2.6vw,40px)] py-6 sm:flex-row">
        <p className="flex items-center gap-2.5 text-sm">
          <SiteMark className="h-6 w-6 shrink-0 text-chalk" />
          &copy; {new Date().getFullYear()} Mido Learning. All rights reserved.
        </p>
        <p className="text-sm">
          您的專屬學習平台
        </p>
      </div>
    </footer>
  );
}
