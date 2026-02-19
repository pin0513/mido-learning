'use client';

import dynamic from 'next/dynamic';

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
  return <StepsTrainer />;
}
