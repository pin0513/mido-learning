'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { recordMaterialView } from '@/lib/api/analytics';

const StepsTrainer = dynamic(
  () => import('@/features/badminton/steps-trainer/StepsTrainer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111' }}>
        <span style={{ color: '#aaa', fontSize: 16 }}>載入訓練器…</span>
      </div>
    ),
  }
);

export default function ClientLoader() {
  useEffect(() => {
    recordMaterialView('badminton-trainer');
  }, []);

  return <StepsTrainer />;
}
