'use client';

import { useState, useRef, useEffect } from 'react';
import { Material } from '@/types/material';

interface VersionSelectorProps {
  materials: Material[];
  currentMaterialId: string;
  componentTitle: string;
  onVersionChange: (materialId: string) => void;
}

export function VersionSelector({
  materials,
  currentMaterialId,
  componentTitle,
  onVersionChange,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMaterial = materials.find((m) => m.id === currentMaterialId);
  const sortedMaterials = [...materials].sort((a, b) => b.version - a.version);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (materialId: string) => {
    if (materialId !== currentMaterialId) {
      onVersionChange(materialId);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="max-w-[200px] truncate">{componentTitle}</span>
        {currentMaterial && (
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
            v{currentMaterial.version}
          </span>
        )}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 min-w-[200px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            版本選擇
          </div>
          <div className="max-h-60 overflow-y-auto">
            {sortedMaterials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => handleSelect(material.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                  material.id === currentMaterialId
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">v{material.version}</span>
                  <span className="text-xs text-gray-500">{material.filename}</span>
                </span>
                {material.id === currentMaterialId && (
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
