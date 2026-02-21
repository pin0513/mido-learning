import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://learn.paulfun.net'),
  title: {
    template: '%s | Mido Learning',
    default: 'Mido Learning - AI 驅動的學習實驗室',
  },
  description: 'AI 教案與投影片示範網站。用 AI 工具製作互動式教學內容，讓孩子看得懂、用得上、學得會。',
  openGraph: {
    siteName: 'Mido Learning',
    locale: 'zh_TW',
    type: 'website',
    url: 'https://learn.paulfun.net',
    images: [{ url: '/images/logo.png', width: 512, height: 512, alt: 'Mido Learning' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mido_learning',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
