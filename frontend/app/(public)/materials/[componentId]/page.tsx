'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { LearningComponent, getCategoryConfig } from '@/types/component';
import { Material, MaterialManifest } from '@/types/material';
import { getComponentById } from '@/lib/api/components';
import { getMaterials, getDownloadUrl, getMaterialManifest } from '@/lib/api/materials';
import { StarRating, RatingDisplay } from '@/components/ui/StarRating';
import { useAuth } from '@/components/auth/AuthProvider';
import { getComponentRatings, getMyRating, rateComponent } from '@/lib/api/ratings';
import { RatingListResponse, UserRatingResponse } from '@/types/rating';
import { recordMaterialView } from '@/lib/api/analytics';

// 縮放控制按鈕組件
interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
}

function ZoomControls({ onZoomIn, onZoomOut, onReset, scale }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
      <button
        onClick={onZoomOut}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        title="縮小"
        disabled={scale <= 0.5}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <span className="min-w-[3rem] text-center text-xs text-gray-600">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        title="放大"
        disabled={scale >= 4}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div className="mx-1 h-4 w-px bg-gray-300" />
      <button
        onClick={onReset}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="重置"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

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

  // 顯示模式根據分類自動決定：
  // - 'game' 分類使用遊戲模式（讓 iframe 填滿容器，遊戲自己處理 RWD）
  // - 其他分類使用投影片模式（支援縮放、平移、雙擊縮放）
  // 注意：這裡不使用 state，而是直接從 component.category 計算
  const [currentScale, setCurrentScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // 處理縮放變化
  const handleTransformChange = useCallback((ref: ReactZoomPanPinchRef) => {
    setCurrentScale(ref.state.scale);
  }, []);

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

  const handleFullscreen = () => {
    let url: string;

    if (latestManifest) {
      // 優先使用 manifest 中的完整 URL
      url = `${latestManifest.baseUrl}${latestManifest.entryPoint}${
        latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''
      }`;
    } else if (materials.length > 0) {
      // 備用方案：manifest 載入失敗時，使用下載 URL
      const sortedMaterials = [...materials].sort((a, b) => b.version - a.version);
      const latestMaterial = sortedMaterials[0];
      url = getDownloadUrl(latestMaterial.id);
    } else {
      // 沒有任何資料可用
      return;
    }

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
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
                    v{latestManifest.version} (最新版本)
                  </span>

                  {/* 主要操作按鈕（始終可見） */}
                  <div className="flex items-center gap-2">
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

                    {/* New window button */}
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

              </div>

              <div
                ref={containerRef}
                className="w-full overflow-hidden rounded-lg border border-gray-200"
                style={{
                  // 兩種模式都使用固定高度
                  height: '70vh',
                  minHeight: '400px',
                }}
              >
                {/* 根據分類決定顯示模式：game 分類使用遊戲模式，其他使用投影片模式 */}
                {component.category !== 'game' ? (
                  /* 投影片模式：使用 react-zoom-pan-pinch 支援縮放、平移、雙擊縮放 */
                  <TransformWrapper
                    ref={transformRef}
                    initialScale={1}
                    minScale={0.3}
                    maxScale={4}
                    centerOnInit
                    wheel={{ step: 0.1 }}
                    pinch={{ step: 5 }}
                    doubleClick={{ mode: 'toggle', step: 0.7 }}
                    onTransformed={handleTransformChange}
                    limitToBounds={false}
                    panning={{ velocityDisabled: true }}
                  >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                      <>
                        {/* 縮放控制工具列 */}
                        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
                          <ZoomControls
                            onZoomIn={() => zoomIn()}
                            onZoomOut={() => zoomOut()}
                            onReset={() => resetTransform()}
                            scale={currentScale}
                          />
                        </div>

                        {/* 可縮放的內容區域 */}
                        <TransformComponent
                          wrapperStyle={{
                            width: '100%',
                            height: '100%',
                          }}
                          contentStyle={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <iframe
                            ref={iframeRef}
                            src={`${latestManifest.baseUrl}${latestManifest.entryPoint}${latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''}`}
                            style={{
                              width: '1920px',
                              height: '1080px',
                              border: 'none',
                              pointerEvents: 'auto',
                            }}
                            title={component.title}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                          />
                        </TransformComponent>

                        {/* 手勢提示（手機版） */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 md:hidden">
                          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                            雙指縮放 · 單指平移 · 雙擊重置
                          </span>
                        </div>
                      </>
                    )}
                  </TransformWrapper>
                ) : (
                  /* 遊戲模式：填滿容器，讓遊戲自己處理 RWD 和觸控 */
                  <div
                    className="h-full w-full"
                    style={{
                      touchAction: 'manipulation',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={`${latestManifest.baseUrl}${latestManifest.entryPoint}${latestManifest.accessToken ? `?token=${latestManifest.accessToken}` : ''}`}
                      className="h-full w-full"
                      style={{
                        border: 'none',
                      }}
                      title={component.title}
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                      allow="fullscreen; autoplay"
                    />
                  </div>
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
