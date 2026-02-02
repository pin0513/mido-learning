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
  const [scale, setScale] = useState(1);

  // 縮放步進
  const SCALE_STEP = 0.1;
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 2;

  const zoomIn = () => {
    setScale((prev) => Math.min(MAX_SCALE, prev + SCALE_STEP));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(MIN_SCALE, prev - SCALE_STEP));
  };

  const resetZoom = () => {
    setScale(1);
  };

  // 自動適應螢幕寬度
  const fitToScreen = useCallback(() => {
    const screenWidth = window.innerWidth;
    if (screenWidth < REFERENCE_WIDTH) {
      const newScale = (screenWidth - 16) / REFERENCE_WIDTH;
      setScale(Math.min(1, newScale));
    } else {
      setScale(1);
    }
  }, []);

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
      {/* Footer 控制列 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.5rem',
          background: 'rgba(0, 0, 0, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* 返回按鈕 */}
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ←
        </button>

        {/* 分隔線 */}
        <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)', margin: '0 0.25rem' }} />

        {/* 縮小按鈕 */}
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: scale <= MIN_SCALE ? 'rgba(255,255,255,0.3)' : 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            cursor: scale <= MIN_SCALE ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          −
        </button>

        {/* 縮放比例顯示 */}
        <span
          style={{
            color: 'white',
            fontSize: '0.875rem',
            minWidth: '3.5rem',
            textAlign: 'center',
          }}
        >
          {Math.round(scale * 100)}%
        </span>

        {/* 放大按鈕 */}
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: scale >= MAX_SCALE ? 'rgba(255,255,255,0.3)' : 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            cursor: scale >= MAX_SCALE ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          +
        </button>

        {/* 分隔線 */}
        <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)', margin: '0 0.25rem' }} />

        {/* 適應螢幕按鈕 */}
        <button
          onClick={fitToScreen}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          適應
        </button>

        {/* 重置按鈕 */}
        <button
          onClick={resetZoom}
          style={{
            background: scale === 1 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          100%
        </button>
      </div>

      {/* 縮放容器 - 留出 footer 空間 */}
      <div
        style={{
          width: `${REFERENCE_WIDTH}px`,
          height: 'calc(100vh - 3rem)',
          marginBottom: '3rem',
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

    </div>
  );
}
