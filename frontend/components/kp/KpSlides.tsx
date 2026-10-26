"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMaterials, getMaterialsBatch, MaterialsRequestError } from "@/lib/api/materials";
import { MaterialIframe } from "@/components/materials/MaterialIframe";
import type { MaterialManifest } from "@/types/material";

interface KpSlidesProps {
  componentIds: string[];
  title: string;
}

type SlideState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "unavailable" }
  | { kind: "ready"; manifest: MaterialManifest };

function messageFor(kind: SlideState["kind"]): string | null {
  if (kind === "missing") return "找不到投影片";
  if (kind === "forbidden") return "目前沒有權限觀看這份投影片";
  if (kind === "unavailable") return "投影片暫時無法載入";
  return null;
}

function SlideFrame({ componentId, title }: { componentId: string; title: string }) {
  const [state, setState] = useState<SlideState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const materials = await getMaterials(componentId);
        if (materials.length === 0) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        const latest = [...materials].sort((a, b) => b.version - a.version)[0];
        if (!latest) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        const batch = await getMaterialsBatch([latest.id]);
        const manifest = batch[0];
        if (!manifest) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        if (!cancelled) setState({ kind: "ready", manifest });
      } catch (error) {
        const status = error instanceof MaterialsRequestError ? error.status : 0;
        if (status === 401 || status === 403) {
          if (!cancelled) setState({ kind: "forbidden" });
        } else if (status === 404) {
          if (!cancelled) setState({ kind: "missing" });
        } else if (!cancelled) {
          setState({ kind: "unavailable" });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [componentId]);

  const layoutMode = state.kind === "ready" ? (state.manifest.layoutMode ?? "fixed") : "fixed";
  const frameClass =
    layoutMode === "responsive"
      ? "relative h-[70vh] min-h-80 w-full bg-[#f0ede8]"
      : "relative aspect-[4/3] w-full bg-[#f0ede8] lg:aspect-video";
  const note = messageFor(state.kind);

  let src: string | null = null;
  if (state.kind === "ready") {
    const token = state.manifest.accessToken ? `?token=${encodeURIComponent(state.manifest.accessToken)}` : "";
    src = `${state.manifest.baseUrl}${state.manifest.entryPoint}${token}`;
  }

  return (
    <article className="border border-[#c0bab2] bg-white" data-testid="kp-slide" data-component-id={componentId} data-layout={layoutMode}>
      <div className={frameClass}>
        {state.kind === "loading" ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[#3d3830]">載入投影片中…</p>
        ) : null}
        {note ? <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-semibold">{note}</p> : null}
        {src ? <MaterialIframe src={src} title={title} /> : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[#e5e3de] p-3">
        <Link
          href={`/materials/${componentId}/fullscreen`}
          className="inline-flex min-h-11 items-center border border-[#1a1614] px-4 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
        >
          全螢幕
        </Link>
        <Link
          href={`/materials/${componentId}`}
          className="inline-flex min-h-11 items-center border border-[#1a1614] px-4 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
        >
          投影片頁
        </Link>
      </div>
    </article>
  );
}

/** 嵌入既有教材。不呼叫 recordMaterialView，觀看數留在 /materials。 */
export function KpSlides({ componentIds, title }: KpSlidesProps) {
  if (componentIds.length === 0) return null;
  return (
    <section aria-labelledby="kp-slides-heading" data-testid="kp-slides" className="mt-10">
      <h2 id="kp-slides-heading" className="text-xl font-bold">
        投影片
      </h2>
      <div className="mt-4 grid gap-4">
        {componentIds.map((id) => (
          <SlideFrame key={id} componentId={id} title={title} />
        ))}
      </div>
    </section>
  );
}
