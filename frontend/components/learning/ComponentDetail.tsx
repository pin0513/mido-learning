'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LearningComponent, getCategoryConfig } from '@/types/component';
import { Material } from '@/types/material';
import { getMaterials } from '@/lib/api/materials';
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

  const handleUploadSuccess = () => {
    setIsUploadOpen(false);
    fetchMaterials();
  };

  const handleDeleteSuccess = () => {
    fetchMaterials();
  };

  return (
    <div className="space-y-8">
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
