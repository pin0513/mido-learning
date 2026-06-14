'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LearningComponent, getCategoryConfig } from '@/types/component';
import { Material } from '@/types/material';
import { getMaterials } from '@/lib/api/materials';
import { getComponentById, getComponentChildren } from '@/lib/api/components';
import { TagDisplay } from './TagDisplay';
import { QuestionList } from './QuestionList';
import { Button } from '@/components/ui/Button';
import { MaterialList, MaterialUpload } from '@/components/materials';

interface ComponentDetailProps {
  component: LearningComponent;
  showEditButton?: boolean;
  editHref?: string;
  showMaterialManagement?: boolean;
}

export function ComponentDetail({
  component,
  showEditButton = false,
  editHref,
  showMaterialManagement = false,
}: ComponentDetailProps) {
  const config = getCategoryConfig(component.category);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // === Series state ===
  const [seriesChildren, setSeriesChildren] = useState<LearningComponent[]>([]);
  const [parentInfo, setParentInfo] = useState<{ id: string; title: string } | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsMaterialsLoading(true);
    try {
      const data = await getMaterials(component.id);
      setMaterials(data);
    } catch {
      // Silently handle error - materials section will show empty state
    } finally {
      setIsMaterialsLoading(false);
    }
  }, [component.id]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Fetch children for hub view; silently ignore errors (component may not be a hub).
  useEffect(() => {
    let cancelled = false;
    getComponentChildren(component.id)
      .then((res) => {
        if (!cancelled) setSeriesChildren(res.children);
      })
      .catch(() => {
        if (!cancelled) setSeriesChildren([]);
      });
    return () => {
      cancelled = true;
    };
  }, [component.id]);

  // Fetch parent title for breadcrumb when this component is a child in a series.
  useEffect(() => {
    let cancelled = false;
    if (component.parentComponentId) {
      getComponentById(component.parentComponentId)
        .then((p) => {
          if (!cancelled) setParentInfo({ id: p.id, title: p.title });
        })
        .catch(() => {
          if (!cancelled) setParentInfo(null);
        });
    } else {
      setParentInfo(null);
    }
    return () => {
      cancelled = true;
    };
  }, [component.parentComponentId]);

  const handleUploadSuccess = () => {
    setIsUploadOpen(false);
    fetchMaterials();
  };

  const handleDeleteSuccess = () => {
    fetchMaterials();
  };

  return (
    <div className="space-y-8">
      {/* Series breadcrumb — shown when this component is a child of a hub */}
      {parentInfo && (
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <Link
            href={`/materials/${parentInfo.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            回到「{parentInfo.title}」
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900 truncate max-w-[60ch]">{component.title}</span>
        </nav>
      )}

      {/* Header */}
      <div className={`rounded-lg p-6 ${config.bgClass} ${config.borderClass} border`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className={`mb-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${config.badgeClass}`}
            >
              {config.label}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{component.title}</h1>
            <p className={`mt-1 text-lg ${config.textClass}`}>{component.subject}</p>
          </div>
          {showEditButton && editHref && (
            <Link href={editHref}>
              <Button variant="outline" size="sm">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                編輯
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Series children — shown when this component is a hub */}
      {seriesChildren.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            系列章節
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm font-normal text-gray-600">
              {seriesChildren.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seriesChildren.map((child, idx) => {
              const childCfg = getCategoryConfig(child.category);
              return (
                <Link
                  key={child.id}
                  href={`/materials/${child.id}`}
                  className="group block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      第 {child.orderInSeries ?? idx + 1} 章
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${childCfg.badgeClass}`}
                    >
                      {childCfg.label}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-gray-900 group-hover:text-blue-700 transition">
                    {child.title}
                  </h3>
                  {child.subject && (
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-1">{child.subject}</p>
                  )}
                  {child.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{child.description}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Thumbnail */}
      {component.thumbnailUrl && (
        <div className="overflow-hidden rounded-lg">
          <img
            src={component.thumbnailUrl}
            alt={component.title}
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Materials Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            教材管理
          </h2>
          {showMaterialManagement && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsUploadOpen(!isUploadOpen)}
            >
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              上傳
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {/* Upload section (only for teacher/admin) */}
          {showMaterialManagement && isUploadOpen && (
            <div className="mb-4">
              <MaterialUpload
                componentId={component.id}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          )}

          {/* Materials list */}
          {isMaterialsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <MaterialList
              materials={materials}
              componentId={component.id}
              canDelete={showMaterialManagement}
              onDelete={handleDeleteSuccess}
            />
          )}
        </div>
      </section>

      {/* Description */}
      {component.description && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">說明</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {component.description}
            </p>
          </div>
        </section>
      )}

      {/* Tags */}
      {component.tags.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">標籤</h2>
          <TagDisplay tags={component.tags} category={component.category} />
        </section>
      )}

      {/* Q&A */}
      <section>
        <QuestionList questions={component.questions} category={component.category} />
      </section>
    </div>
  );
}
