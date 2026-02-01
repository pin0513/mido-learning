'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { LearningComponent, getCategoryConfig } from '@/types/component';
import { Material, MaterialManifest } from '@/types/material';
import { getComponentById } from '@/lib/api/components';
import { getMaterials, getDownloadUrl, getMaterialManifest } from '@/lib/api/materials';
import { StarRating, RatingDisplay } from '@/components/ui/StarRating';
import { useAuth } from '@/components/auth/AuthProvider';
import { getComponentRatings, getMyRating, rateComponent } from '@/lib/api/ratings';
import { RatingListResponse, UserRatingResponse } from '@/types/rating';
import { recordMaterialView } from '@/lib/api/analytics';

export default function GuestMaterialPage({
  params,
}: {
  params: Promise<{ componentId: string }>;
}) {
  const { componentId } = use(params);
  const { user } = useAuth();

  const [component, setComponent] = useState<LearningComponent | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [latestManifest, setLatestManifest] = useState<MaterialManifest | null>(null);
  const [ratings, setRatings] = useState<RatingListResponse | null>(null);
  const [myRating, setMyRating] = useState<UserRatingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRating, setIsRating] = useState(false);

  // RWD states
  const [zoomEnabled, setZoomEnabled] = useState(false); // 縮放功能開關，預設關閉
  const [zoomMode, setZoomMode] = useState<'manual' | 'auto'>('manual'); // 縮放模式：手動或自動
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Record material view on mount
  useEffect(() => {
    recordMaterialView(componentId);
  }, [componentId]);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const data = await getComponentById(componentId);
        setComponent(data);

        // Load materials
        try {
          const materialsData = await getMaterials(componentId);
          setMaterials(materialsData);

          // If we have materials, get the manifest for the latest version
          if (materialsData.length > 0) {
            const sortedMaterials = [...materialsData].sort((a, b) => b.version - a.version);
            const latestMaterial = sortedMaterials[0];
            try {
              const manifest = await getMaterialManifest(latestMaterial.id);
              setLatestManifest(manifest);
            } catch {
              // Manifest fetch failed
            }
          }
        } catch {
          // Materials fetch failed, but component loaded
        }

        // Load ratings if user is logged in
        if (user) {
          try {
            const [ratingsData, myRatingData] = await Promise.all([
              getComponentRatings(componentId),
              getMyRating(componentId),
            ]);
            setRatings(ratingsData);
            setMyRating(myRatingData);
          } catch {
            // Ratings fetch failed, but component loaded
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load material');
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [componentId, user]);

  const handleRate = async (score: number) => {
    if (!user || isRating) return;

    setIsRating(true);
    try {
      await rateComponent(componentId, score);
      // Reload ratings
      const [ratingsData, myRatingData] = await Promise.all([
        getComponentRatings(componentId),
        getMyRating(componentId),
      ]);
      setRatings(ratingsData);
      setMyRating(myRatingData);
    } catch (err) {
      console.error('Failed to rate:', err);
    } finally {
      setIsRating(false);
    }
  };

  // RWD handlers
  const handleToggleZoom = () => {
    if (zoomEnabled) {
      // 關閉縮放時重置為 100%
      setZoomLevel(1.0);
      setZoomMode('manual');
    }
    setZoomEnabled(!zoomEnabled);
  };

  const handleToggleZoomMode = () => {
    const newMode = zoomMode === 'manual' ? 'auto' : 'manual';
    setZoomMode(newMode);

    if (newMode === 'manual') {
      // 切換到手動模式時重置為 100%
      setZoomLevel(1.0);
    }
  };

  const handleZoomIn = () => {
    if (!zoomEnabled || zoomMode === 'auto') return;
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  };

  const handleZoomOut = () => {
    if (!zoomEnabled || zoomMode === 'auto') return;
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    if (!zoomEnabled || zoomMode === 'auto') return;
    setZoomLevel(1.0);
  };

  const handleFullscreen = () => {
    if (!latestManifest) return;

    const url = `${latestManifest.baseUrl}${latestManifest.entryPoint}${
      latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''
    }`;

    // 偵測是否為手機裝置
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // 手機版：直接在同分頁開啟（避免跳出 popup 阻擋）
      window.location.href = url;
    } else {
      // 桌面版：在新視窗開啟
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Auto-scale (only when zoom is enabled and mode is auto)
  useEffect(() => {
    if (!zoomEnabled || zoomMode !== 'auto') return;

    const calculateAutoScale = () => {
      if (!containerRef.current) return;

      // 計算最佳縮放比例
      const containerWidth = containerRef.current.offsetWidth;
      const assumedSlideWidth = 1920; // 假設投影片寬度
      const scaleRatio = containerWidth / assumedSlideWidth;

      // 自動模式下，根據螢幕大小自動調整
      if (scaleRatio < 1) {
        setZoomLevel(Math.max(scaleRatio, 0.5)); // 最小 50%
      } else {
        setZoomLevel(1.0); // 螢幕夠大時保持 100%
      }
    };

    calculateAutoScale();
    window.addEventListener('resize', calculateAutoScale);
    return () => window.removeEventListener('resize', calculateAutoScale);
  }, [zoomEnabled, zoomMode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !component) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-lg">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mt-4 text-xl font-bold text-gray-900">無法載入教材</h1>
          <p className="mt-2 text-gray-600">{error || '找不到教材'}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  const config = getCategoryConfig(component.category);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Minimal Header - No login/auth elements */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-blue-600"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回首頁
          </Link>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Component Info Card */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{component.title}</h1>
              <p className="mt-1 text-gray-600">{component.subject || component.theme}</p>
              {component.description && (
                <p className="mt-3 text-gray-700">{component.description}</p>
              )}

              {/* Tags */}
              {component.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {component.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`rounded-full px-2 py-1 text-xs ${config.badgeClass}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Section */}
            <div className="w-full md:w-64 md:flex-shrink-0">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-700">評分</h3>
                <RatingDisplay
                  average={ratings?.average || component.ratingAverage || 0}
                  total={ratings?.total || component.ratingCount || 0}
                  distribution={ratings?.distribution}
                />

                {user ? (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm text-gray-600">
                      {myRating?.hasRated ? '您的評分：' : '為此教材評分：'}
                    </p>
                    <StarRating
                      rating={myRating?.score || 0}
                      interactive
                      size="lg"
                      onRate={handleRate}
                      disabled={isRating}
                      showCount={false}
                    />
                  </div>
                ) : (
                  <p className="mt-4 border-t pt-4 text-sm text-gray-500">
                    <Link href="/login" className="text-blue-600 hover:underline">
                      登入
                    </Link>
                    {' '}後可以評分
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        {component.questions && component.questions.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">問與答</h2>
            <div className="space-y-4">
              {component.questions.map((qa, idx) => (
                <details
                  key={idx}
                  className={`rounded-lg border p-4 ${config.borderClass}`}
                >
                  <summary className="cursor-pointer font-medium text-gray-900">
                    {qa.question}
                  </summary>
                  <p className="mt-3 text-gray-700">{qa.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Material Viewer */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">學習教材</h2>
          {materials.length > 0 && latestManifest ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
                  v{latestManifest.version} (最新版本)
                </span>

                {/* Control buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Zoom toggle switch */}
                  <button
                    onClick={handleToggleZoom}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      zoomEnabled
                        ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title={zoomEnabled ? '停用縮放（適用於遊戲）' : '啟用縮放'}
                    aria-label={zoomEnabled ? '停用縮放' : '啟用縮放'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                    <span className="hidden sm:inline">{zoomEnabled ? '縮放：開' : '縮放：關'}</span>
                  </button>

                  {/* Zoom mode toggle (only when zoom is enabled) */}
                  {zoomEnabled && (
                    <button
                      onClick={handleToggleZoomMode}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        zoomMode === 'auto'
                          ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title={zoomMode === 'auto' ? '切換為手動縮放' : '切換為自動縮放'}
                      aria-label={zoomMode === 'auto' ? '手動模式' : '自動模式'}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {zoomMode === 'auto' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        )}
                      </svg>
                      <span className="hidden sm:inline">
                        {zoomMode === 'auto' ? '自動' : '手動'}
                      </span>
                    </button>
                  )}

                  {/* Zoom controls (only for manual mode) */}
                  {zoomEnabled && zoomMode === 'manual' && (
                    <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1">
                      <button
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="縮小"
                        aria-label="縮小"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="min-w-[3rem] text-center text-sm text-gray-600">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 2.0}
                        className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title="放大"
                        aria-label="放大"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={handleZoomReset}
                        className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
                        title="重置"
                        aria-label="重置縮放"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Auto mode percentage display */}
                  {zoomEnabled && zoomMode === 'auto' && (
                    <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5">
                      <span className="text-sm font-medium text-green-700">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                    </div>
                  )}

                  {/* Download button */}
                  <button
                    onClick={() => window.open(getDownloadUrl(latestManifest.materialId), '_blank')}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
                    title="下載教材"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="hidden sm:inline">下載</span>
                  </button>

                  {/* New window button (replaces fullscreen) */}
                  <button
                    onClick={handleFullscreen}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    title="在新視窗開啟"
                    aria-label="在新視窗開啟"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="hidden sm:inline">新視窗</span>
                  </button>
                </div>
              </div>

              <div
                ref={containerRef}
                className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200"
              >
                {zoomEnabled ? (
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={`${latestManifest.baseUrl}${latestManifest.entryPoint}${latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''}`}
                      className="h-full w-full"
                      style={{
                        width: `${100 / zoomLevel}%`,
                        height: `${100 / zoomLevel}%`,
                      }}
                      title={component.title}
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                    />
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={`${latestManifest.baseUrl}${latestManifest.entryPoint}${latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''}`}
                    className="h-full w-full"
                    title={component.title}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                  />
                )}
              </div>

              {/* Other versions */}
              {materials.length > 1 && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">歷史版本</h3>
                  <div className="space-y-2">
                    {[...materials]
                      .sort((a, b) => b.version - a.version)
                      .slice(1)
                      .map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                              v{material.version}
                            </span>
                            <span className="text-sm text-gray-600">{material.filename}</span>
                          </div>
                          <button
                            onClick={() => window.open(getDownloadUrl(material.id), '_blank')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            下載
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`aspect-video w-full rounded-lg ${config.bgClass} flex items-center justify-center`}>
              <div className="text-center">
                <svg
                  className={`mx-auto h-16 w-16 ${config.textClass} opacity-50`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className={`mt-4 ${config.textClass}`}>
                  尚無教材
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  此課程尚未上傳教材
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="mt-8 border-t bg-white py-6 text-center text-sm text-gray-500">
        <p>Mido Learning - 您的專屬學習平台</p>
      </footer>
    </div>
  );
}
