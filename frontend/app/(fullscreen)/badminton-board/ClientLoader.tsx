'use client';

import dynamic from 'next/dynamic';

const BoardClient = dynamic(
  () => import('@/features/badminton/tactical-board/BoardClient'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111' }}>
        <span style={{ color: '#aaa', fontSize: 16 }}>載入戰術板…</span>
      </div>
    ),
  }
);

export default function ClientLoader() {
  return <BoardClient />;
}
