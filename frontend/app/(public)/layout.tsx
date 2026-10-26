import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingWishBot } from '@/components/wish';

export const metadata: Metadata = {
  title: 'Mido Learning - AI 驅動的學習實驗室',
  description: 'AI 教案與投影片示範網站。用 AI 工具製作互動式教學內容，讓孩子看得懂、用得上、學得會。',
  openGraph: {
    title: 'Mido Learning - AI 驅動的學習實驗室',
    description: 'AI 教案與投影片示範網站。一位好奇爸爸用 AI 工具探索教育的小小實驗。',
    images: [{ url: '/images/logo.png' }],
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingWishBot />
    </div>
  );
}
