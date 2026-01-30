'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { MaterialManifest, Material } from '@/types/material';
import { LearningComponent } from '@/types/component';
import { getMaterialManifest, getMaterials } from '@/lib/api/materials';
import { getComponentById } from '@/lib/api/components';
import { MaterialViewer } from '@/components/materials';

interface PageProps {
  params: Promise<{
    componentId: string;
    materialId: string;
  }>;
}

export default function MaterialViewerPage({ params }: PageProps) {
  const { componentId, materialId } = use(params);
  const router = useRouter();

  const [manifest, setManifest] = useState<MaterialManifest | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [component, setComponent] = useState<LearningComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [manifestData, materialsData, componentData] = await Promise.all([
          getMaterialManifest(materialId),
          getMaterials(componentId),
          getComponentById(componentId),
        ]);

        setManifest(manifestData);
        setMaterials(materialsData);
        setComponent(componentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [componentId, materialId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500">載入教材中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6">
        <svg
          className="h-16 w-16 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">載入失敗</h1>
        <p className="mt-2 text-gray-500">{error}</p>
        <button
          onClick={() => router.push(`/components/${componentId}`)}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          返回元件頁面
        </button>
      </div>
    );
  }

  if (!manifest || !component) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6">
        <svg
          className="h-16 w-16 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">找不到教材</h1>
        <p className="mt-2 text-gray-500">此教材不存在或已被移除</p>
        <button
          onClick={() => router.push(`/components/${componentId}`)}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          返回元件頁面
        </button>
      </div>
    );
  }

  return (
    <MaterialViewer
      manifest={manifest}
      materials={materials}
      componentId={componentId}
      componentTitle={component.title}
    />
  );
}
