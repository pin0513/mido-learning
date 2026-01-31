'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Material, MaterialManifest } from '@/types/material';
import { getDownloadUrl } from '@/lib/api/materials';
import { MaterialHeader } from './MaterialHeader';
import { MaterialIframe } from './MaterialIframe';
import { ScriptSidebar } from './ScriptSidebar';

interface MaterialViewerProps {
  manifest: MaterialManifest;
  materials: Material[];
  componentId: string;
  componentTitle: string;
}

export function MaterialViewer({
  manifest,
  materials,
  componentId,
  componentTitle,
}: MaterialViewerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build iframe URL with access token for authentication
  const tokenParam = manifest.accessToken ? `?token=${manifest.accessToken}` : '';
  const iframeSrc = `${manifest.baseUrl}${manifest.entryPoint}${tokenParam}`;
  const scriptUrl = manifest.scriptPath ? `${manifest.baseUrl}${manifest.scriptPath}${tokenParam}` : null;
  const hasScript = Boolean(scriptUrl);

  const handleBack = useCallback(() => {
    router.push(`/components/${componentId}`);
  }, [router, componentId]);

  const handleVersionChange = useCallback(
    (materialId: string) => {
      router.push(`/components/${componentId}/materials/${materialId}`);
    },
    [router, componentId]
  );

  const handleToggleScript = useCallback(() => {
    setIsScriptOpen((prev) => !prev);
  }, []);

  const handleDownload = useCallback(() => {
    const downloadUrl = getDownloadUrl(manifest.materialId);
    window.open(downloadUrl, '_blank');
  }, [manifest.materialId]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleClose = useCallback(() => {
    router.push(`/components/${componentId}`);
  }, [router, componentId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ESC key to exit fullscreen or close script sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isScriptOpen) {
          setIsScriptOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isScriptOpen]);

  return (
    <div
      ref={containerRef}
      className="flex h-screen flex-col bg-white"
    >
      <MaterialHeader
        materials={materials}
        currentMaterialId={manifest.materialId}
        componentTitle={componentTitle}
        isScriptOpen={isScriptOpen}
        hasScript={hasScript}
        onBack={handleBack}
        onVersionChange={handleVersionChange}
        onToggleScript={handleToggleScript}
        onDownload={handleDownload}
        onToggleFullscreen={handleToggleFullscreen}
        onClose={handleClose}
        isFullscreen={isFullscreen}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 ${isScriptOpen && hasScript ? 'hidden md:block' : ''}`}>
          <MaterialIframe src={iframeSrc} title={componentTitle} />
        </div>

        {hasScript && scriptUrl && (
          <ScriptSidebar
            scriptUrl={scriptUrl}
            isOpen={isScriptOpen}
            onClose={handleToggleScript}
          />
        )}
      </div>
    </div>
  );
}
