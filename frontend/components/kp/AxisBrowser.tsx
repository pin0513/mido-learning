"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FilterOption, KpCard } from "@/lib/kp/cards";

interface AxisBrowserProps {
  items: KpCard[];
  stages?: FilterOption[];
  folders?: FilterOption[];
  layers?: FilterOption[];
  competencies?: FilterOption[];
  emptyHint?: string;
}

const fieldClass =
  "min-h-11 w-full border border-[#1a1614] bg-white px-3 text-sm text-[#1a1614] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]";

export function AxisBrowser({
  items,
  stages,
  folders,
  layers,
  competencies,
  emptyHint = "這個篩選沒有知識點。",
}: AxisBrowserProps) {
  const [stage, setStage] = useState("all");
  const [folder, setFolder] = useState("all");
  const [layer, setLayer] = useState("all");
  const [competency, setCompetency] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextStage = params.get("stage");
    const nextFolder = params.get("discipline");
    const nextLayer = params.get("layer");
    const nextCompetency = params.get("competency");
    if (nextStage) setStage(nextStage);
    if (nextFolder) setFolder(nextFolder);
    if (nextLayer) setLayer(nextLayer);
    if (nextCompetency) setCompetency(nextCompetency);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (stage !== "all" && item.stage !== stage) return false;
        if (folder !== "all" && item.folder !== folder) return false;
        if (layer !== "all" && item.layer !== layer) return false;
        if (competency !== "all" && !item.competencies.includes(competency)) return false;
        return true;
      }),
    [items, stage, folder, layer, competency],
  );

  if (items.length === 0) {
    return <p className="border border-dashed border-[#8a847a] p-4 text-sm leading-6 text-[#3d3830]">{emptyHint}</p>;
  }

  return (
    <div>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="篩選知識點">
        {stages && stages.length > 0 ? (
          <label className="block text-sm font-semibold">
            階段
            <select className={`${fieldClass} mt-1`} value={stage} onChange={(event) => setStage(event.target.value)}>
              <option value="all">全部階段</option>
              {stages.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {folders && folders.length > 0 ? (
          <label className="block text-sm font-semibold">
            學門
            <select className={`${fieldClass} mt-1`} value={folder} onChange={(event) => setFolder(event.target.value)}>
              <option value="all">全部學門</option>
              {folders.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {layers && layers.length > 0 ? (
          <label className="block text-sm font-semibold">
            層級
            <select className={`${fieldClass} mt-1`} value={layer} onChange={(event) => setLayer(event.target.value)}>
              <option value="all">全部層級</option>
              {layers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {competencies && competencies.length > 0 ? (
          <label className="block text-sm font-semibold">
            核心素養
            <select
              className={`${fieldClass} mt-1`}
              value={competency}
              onChange={(event) => setCompetency(event.target.value)}
            >
              <option value="all">全部核心素養</option>
              {competencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </form>
      <p className="mt-4 text-sm text-[#3d3830]" aria-live="polite">
        {filtered.length} 筆
      </p>
      {filtered.length === 0 ? (
        <p className="mt-3 border border-dashed border-[#8a847a] p-4 text-sm leading-6">{emptyHint}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block min-h-11 border border-[#c0bab2] bg-white p-4 transition-colors hover:border-[#1a1614] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
              >
                <span className="block font-bold">{item.title}</span>
                <span className="mt-2 flex flex-wrap gap-2 text-xs text-[#3d3830]">
                  <span className="border border-[#c0bab2] px-2 py-1">{item.layerName}</span>
                  <span className="border border-[#c0bab2] px-2 py-1">{item.stageName}</span>
                  <span className="border border-[#c0bab2] px-2 py-1">{item.folderName}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
