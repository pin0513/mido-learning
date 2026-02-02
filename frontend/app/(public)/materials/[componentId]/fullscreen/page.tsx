'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { MaterialManifest } from '@/types/material';
import { getMaterials, getMaterialManifest } from '@/lib/api/materials';

// 參考寬度：小於此寬度時可以縮放
const REFERENCE_WIDTH = 765;

export default function FullscreenMaterialPage({
  params,
}: {
  params: Promise<{ componentId: string }>;
}) {
  const { componentId } = use(params);
  const [manifest, setManifest] = useState<MaterialManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScale, setAutoScale] = useState(false); // 預設關閉自動縮放
  const [scale, setScale] = useState(1);

  // 計算縮放比例
  const calculateScale = useCallback(() => {
    if (!autoScale) {
      setScale(1);
      return;
    }
    const screenWidth = window.innerWidth;
    if (screenWidth < REFERENCE_WIDTH) {
      const newScale = (screenWidth - 16) / REFERENCE_WIDTH;
      setScale(Math.min(1, newScale));
    } else {
      setScale(1);
    }
  }, [autoScale]);

  // 監聽視窗大小變化
  useEffect(() => {
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [calculateScale]);

  useEffect(() => {
    const loadMaterial = async () => {
      try {
        const materials = await getMaterials(componentId);
        if (materials.length > 0) {
          const sortedMaterials = [...materials].sort((a, b) => b.version - a.version);
          const latestMaterial = sortedMaterials[0];
          const manifestData = await getMaterialManifest(latestMaterial.id);
          setManifest(manifestData);
        } else {
          setError('找不到教材');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    loadMaterial();
  }, [componentId]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white">
        <p className="text-xl">{error || '找不到教材'}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 rounded-lg bg-white px-4 py-2 text-black"
        >
          返回
        </button>
      </div>
    );
  }

  const contentUrl = `${manifest.baseUrl}${manifest.entryPoint}${
    manifest.accessToken ? `?token=${manifest.accessToken}` : ''
  }`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* 控制按鈕列 */}
      <div
        style={{
          position: 'fixed',
          top: '0.5rem',
          left: '0.5rem',
          zIndex: 1000,
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        {/* 返回按鈕 */}
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ← 返回
        </button>

        {/* 縮放切換按鈕 */}
        <button
          onClick={() => setAutoScale(!autoScale)}
          style={{
            background: autoScale ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {autoScale ? '縮放: 開' : '縮放: 關'}
        </button>
      </div>

      {/* 縮放容器 */}
      <div
        style={{
          width: `${REFERENCE_WIDTH}px`,
          height: '100vh',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <iframe
          src={contentUrl}
          title="教材內容"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
          allow="fullscreen; autoplay"
        />
      </div>

      {/* 縮放指示 */}
      {scale < 1 && (
        <div
          style={{
            position: 'fixed',
            bottom: '0.5rem',
            right: '0.5rem',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            borderRadius: '0.25rem',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
          }}
        >
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
