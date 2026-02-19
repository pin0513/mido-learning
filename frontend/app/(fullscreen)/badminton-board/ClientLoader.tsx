'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { recordMaterialView } from '@/lib/api/analytics';

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
  useEffect(() => {
    recordMaterialView('badminton-board');
  }, []);

  return <BoardClient />;
}
