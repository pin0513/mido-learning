import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { KP_SITE_ORIGIN } from '@/lib/kp/routes';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/** Switzer is Fontshare's free font: self-hosting on a site is allowed. It is not OFL. Latin only. */
const switzer = localFont({
  src: [
    { path: './fonts/switzer-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/switzer-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/switzer-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/switzer-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-switzer',
  display: 'swap',
});

/** Noto Sans TC (OFL) traditional-Chinese subset, not preloaded. */
const notoTc = localFont({
  src: [
    { path: './fonts/noto-tc-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-tc-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/noto-tc-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/noto-tc-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-noto-tc',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(KP_SITE_ORIGIN),
  title: {
    template: '%s | Mido Learning',
    default: 'Mido Learning - AI 驅動的學習實驗室',
  },
  description: 'AI 教案與投影片示範網站。用 AI 工具製作互動式教學內容，讓孩子看得懂、用得上、學得會。',
  openGraph: {
    siteName: 'Mido Learning',
    locale: 'zh_TW',
    type: 'website',
    url: KP_SITE_ORIGIN,
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
    <html lang="zh-Hant-TW">
      <body className={`${geistSans.variable} ${geistMono.variable} ${switzer.variable} ${notoTc.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
