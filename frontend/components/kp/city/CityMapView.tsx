"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { annulus, focusViewBox, sectorStart, type CityMapData } from "@/lib/content/city";
import { CityList, LayerOverview, MobileDistricts, parseCityView, readRememberedView, ViewSwitch, writeRememberedView, type CityView } from "./views";
import {
  clearStoredProgress,
  demoProgress,
  emptyStoredProgress,
  readStoredProgress,
  together,
  toSnapshot,
  writeStoredProgress,
  type ProgressSnapshot,
  type StoredProgress,
} from "./progress";

interface Level {
  district: string | null;
  stage: string | null;
  kp: string | null;
  layer: string | null;
  competency: string | null;
}

const EMPTY: Level = { district: null, stage: null, kp: null, layer: null, competency: null };

function readLevel(params: URLSearchParams): Level {
  return {
    district: params.get("d"),
    stage: params.get("s"),
    kp: params.get("kp"),
    layer: params.get("ly"),
    competency: params.get("c"),
  };
}

/** 跟 Next 的網址同步。包在 Suspense 裡，地圖本體仍可靜態輸出。 */
function UrlSync({ onQuery }: { onQuery: (params: URLSearchParams) => void }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  useEffect(() => {
    onQuery(new URLSearchParams(query));
  }, [onQuery, query]);
  return null;
}

function writeLevel(level: Level, mode: "push" | "replace") {
  const params = new URLSearchParams(window.location.search);
  for (const key of ["d", "s", "kp", "ly", "c"]) params.delete(key);
  if (level.district) params.set("d", level.district);
  if (level.stage) params.set("s", level.stage);
  if (level.kp) params.set("kp", level.kp);
  if (level.layer) params.set("ly", level.layer);
  if (level.competency) params.set("c", level.competency);
  const search = params.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ""}`;
  const state = { city: level };
  if (mode === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
}

function parentLevel(level: Level): Level {
  if (level.kp) return { ...level, kp: null };
  if (level.stage) return { ...level, stage: null, kp: null };
  if (level.district) return { ...level, district: null, kp: null };
  return level;
}

function inFocus(building: { layer: string; competencies: string[] }, level: Level): boolean {
  if (level.layer && building.layer !== level.layer) return false;
  if (level.competency && !building.competencies.includes(level.competency)) return false;
  return true;
}

function parseViewBox(value: string): [number, number, number, number] {
  const [x, y, w, h] = value.split(" ").map(Number);
  return [x, y, w, h];
}

function nodeRadius(node: { title: string; dependents: number }): number {
  if (!node.title) return 6;
  return 8 + Math.min(node.dependents, 4);
}

/** Right-angle pipe: horizontal, then vertical, then horizontal. Joints are the elbows. */
function schematicPath(points: { x: number; y: number }[]): { d: string; joints: [number, number][] } {
  if (points.length === 0) return { d: "", joints: [] };
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const joints: [number, number][] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (Math.abs(from.x - to.x) < 1 || Math.abs(from.y - to.y) < 1) {
      d += ` L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      continue;
    }
    const mid = (from.x + to.x) / 2;
    d += ` H ${mid.toFixed(1)} V ${to.y.toFixed(1)} H ${to.x.toFixed(1)}`;
    joints.push([mid, from.y], [mid, to.y]);
  }
  return { d, joints };
}

/** /kp/map 的配線圖。節點在伺服端資料裡，互動留在這個 client 元件。 */
export function CityMapView({
  data,
  rememberView = false,
  defaultView = "map",
  tabOrder,
  mapParam = "map",
}: {
  data: CityMapData;
  rememberView?: boolean;
  defaultView?: CityView;
  tabOrder?: CityView[];
  /** Written as ?view= when the map tab is not the default. The homepage writes "map"; "city" still parses. */
  mapParam?: string;
}) {
  const [level, setLevel] = useState<Level>(EMPTY);
  const [view, setView] = useState<CityView>(defaultView);
  const [lotId, setLotId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pathId, setPathId] = useState("");
  const [mode, setMode] = useState<"demo" | "local">("demo");
  const [stored, setStored] = useState<StoredProgress>(emptyStoredProgress);
  const [viewBox, setViewBox] = useState(`0 0 ${data.size} ${data.size}`);
  const depth = useRef(0);
  const levelRef = useRef(level);
  levelRef.current = level;
  const mapRoot = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; box: [number, number, number, number] } | null>(null);

  const byId = useMemo(() => new Map(data.buildings.map((building) => [building.id, building])), [data.buildings]);
  const districtIndex = data.districts.findIndex((district) => district.key === level.district);
  const stageIndex = data.stages.findIndex((stage) => stage.id === level.stage);
  const rawSelected = level.kp ? byId.get(level.kp) : undefined;
  const selected = rawSelected?.title ? rawSelected : undefined;
  const hovered = hover ? byId.get(hover) : undefined;
  const snapshot: ProgressSnapshot = mode === "demo" ? demoProgress.read() : toSnapshot(stored);
  const path = data.landmarks.find((item) => item.id === pathId) ?? null;
  const pathStops = path?.stops.filter((id) => byId.has(id)) ?? [];

  const choosePath = (id: string) => {
    setPathId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("path", id);
    else params.delete("path");
    const search = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  };

  const updateStored = (next: StoredProgress) => {
    setStored(next);
    writeStoredProgress(next);
  };

  const targetBox = focusViewBox(
    data,
    districtIndex >= 0 ? districtIndex : null,
    stageIndex >= 0 ? stageIndex : null,
  );

  const go = useCallback((patch: Partial<Level>, historyMode: "push" | "replace") => {
    const next = { ...levelRef.current, ...patch };
    setLevel(next);
    setLotId(null);
    if (historyMode === "push") depth.current += 1;
    writeLevel(next, historyMode);
  }, []);

  const applyQuery = useCallback((params: URLSearchParams) => {
    const next = readLevel(params);
    setLevel(next);
    setPathId(params.get("path") ?? "");
    const fromUrl = parseCityView(params.get("view"));
    if (fromUrl) {
      setView(fromUrl);
      return;
    }
    setView((rememberView ? readRememberedView() : null) ?? defaultView);
  }, [defaultView, rememberView]);

  useEffect(() => {
    setStored(readStoredProgress());
    const onPop = () => {
      depth.current = Math.max(0, depth.current - 1);
      const params = new URLSearchParams(window.location.search);
      setLevel(readLevel(params));
      setPathId(params.get("path") ?? "");
      const fromUrl = parseCityView(params.get("view"));
      setView(fromUrl ?? ((rememberView ? readRememberedView() : null) ?? defaultView));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultView, rememberView]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setViewBox(targetBox);
      return;
    }
    const from = parseViewBox(viewBox);
    const to = parseViewBox(targetBox);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 280);
      const ease = 1 - (1 - t) * (1 - t);
      const next = from.map((value, index) => value + (to[index] - value) * ease);
      setViewBox(next.map((value) => value.toFixed(1)).join(" "));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // viewBox is the animation source; including it would restart every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBox]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (!(target instanceof Node) || !mapRoot.current?.contains(target)) return;
      const parent = parentLevel(level);
      if (parent.district === level.district && parent.stage === level.stage && parent.kp === level.kp) return;
      event.preventDefault();
      if (depth.current > 0) window.history.back();
      else go(parent, "replace");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, level]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      const zooming = event.ctrlKey || event.metaKey || svg.matches(":focus-within");
      if (!zooming) return;
      event.preventDefault();
      const [x, y, w, h] = parseViewBox(viewBox);
      const scale = event.deltaY > 0 ? 1.08 : 0.92;
      const nextW = Math.min(data.size * 1.4, Math.max(140, w * scale));
      const nextH = nextW;
      const rect = svg.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const anchorX = x + w * px;
      const anchorY = y + h * py;
      setViewBox(`${(anchorX - nextW * px).toFixed(1)} ${(anchorY - nextH * py).toFixed(1)} ${nextW.toFixed(1)} ${nextH.toFixed(1)}`);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [data.size, viewBox]);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("a, button, [role='button']")) return;
    const [x, y, w, h] = parseViewBox(viewBox);
    drag.current = { x: event.clientX, y: event.clientY, box: [x, y, w, h] };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const [x, y, w, h] = drag.current.box;
    const dx = ((event.clientX - drag.current.x) / rect.width) * w;
    const dy = ((event.clientY - drag.current.y) / rect.height) * h;
    setViewBox(`${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const openBuilding = (id: string) => {
    const building = byId.get(id);
    if (!building?.title) return;
    go({ district: building.folder, stage: building.stage, kp: id }, "push");
  };

  const openLot = (id: string) => {
    setLotId(id);
    const next = { ...level, kp: null };
    setLevel(next);
    writeLevel(next, "replace");
  };

  const setCityView = (next: CityView) => {
    setView(next);
    if (rememberView) writeRememberedView(next);
    const params = new URLSearchParams(window.location.search);
    const token = next === defaultView ? null : next === "map" ? mapParam : next;
    if (token) params.set("view", token);
    else params.delete("view");
    const search = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  };

  const lot = data.lots.find((item) => item.id === lotId);

  const zoomed = Boolean(level.district || level.stage);
  const zoomRing = (districtKey: string, stageId: string | null) => {
    go({ district: districtKey, stage: stageId, kp: null }, "push");
  };
  const filterBits = [
    level.district ? data.districts.find((district) => district.key === level.district)?.name : null,
    level.stage ? data.stages.find((stage) => stage.id === level.stage)?.name : null,
    level.layer ? data.layers.find((layer) => layer.id === level.layer)?.name : null,
    level.competency ? data.competencies.find((item) => item.code === level.competency)?.code : null,
  ].filter(Boolean);
  const linkedIds = selected ? [...selected.prerequisites, ...selected.requiredBy].map((item) => item.id) : [];
  const routeWire = schematicPath(pathStops.flatMap((id) => {
    const place = byId.get(id);
    return place ? [place] : [];
  }));
  const accept = (building: { layer: string; competencies: string[] }) => inFocus(building, level);

  return (
    <div ref={mapRoot} data-testid="city-experience" className="city-stack">
      <Suspense fallback={null}>
        <UrlSync onQuery={applyQuery} />
      </Suspense>
      <a
        href="#kp-city-list"
        className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:bg-white focus:px-3 focus:py-2 focus:underline"
        onClick={(event) => {
          event.preventDefault();
          setCityView("list");
          window.requestAnimationFrame(() => document.getElementById("kp-city-list")?.focus());
        }}
      >
        跳到清單檢視
      </a>
      <ViewSwitch view={view} onChange={setCityView} order={tabOrder} />
      <div className="controls-block kp-controls mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-[#1a1614]">
          學習主線
          <select
            data-testid="city-path"
            className="mt-1 block min-h-11 min-w-48 border border-[#1a1614] bg-white px-2"
            value={pathId}
            onChange={(event) => choosePath(event.target.value)}
          >
            <option value="">不標路線</option>
            {data.landmarks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.colearn ? "（有家庭時間）" : ""}
              </option>
            ))}
          </select>
        </label>
        {path ? (
          <Link href={`/kp/path/${path.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline">
            打開這條主線{path.colearn ? "・有家庭時間" : ""}
          </Link>
        ) : null}
        <fieldset className="text-sm">
          <legend className="font-semibold">進度</legend>
          <label className="mr-3 inline-flex min-h-11 items-center gap-2">
            <input type="radio" name="progress-mode" checked={mode === "demo"} onChange={() => setMode("demo")} />
            範例資料
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input type="radio" name="progress-mode" checked={mode === "local"} onChange={() => setMode("local")} />
            自己標記
          </label>
        </fieldset>
      </div>
      <p className="controls-block progress-note mb-4 px-4 text-sm leading-6" data-testid="city-progress-notice">
        {snapshot.notice}
      </p>
      {mode === "local" ? (
        <div className="controls-block kp-controls mb-4 flex flex-wrap gap-3 text-sm" data-testid="city-local-progress">
          <label>
            大人怎麼稱呼
            <input className="ml-2 min-h-11 border border-[#1a1614] px-2" value={stored.adultName} onChange={(event) => updateStored({ ...stored, adultName: event.target.value })} />
          </label>
          <label>
            孩子怎麼稱呼
            <input className="ml-2 min-h-11 border border-[#1a1614] px-2" value={stored.childName} onChange={(event) => updateStored({ ...stored, childName: event.target.value })} />
            <span className="mt-1 block text-xs text-[#3d3830]">建議用暱稱，不要填真實姓名</span>
          </label>
          {selected ? (
            <>
              <button type="button" className="min-h-11 border border-[#1a1614] px-3" onClick={() => updateStored({ ...stored, adultAt: selected.id })}>
                {stored.adultName}在這裡
              </button>
              <button type="button" className="min-h-11 border border-[#1a1614] px-3" onClick={() => updateStored({ ...stored, childAt: selected.id })}>
                {stored.childName}在這裡
              </button>
              <button
                type="button"
                className="min-h-11 border border-[#1a1614] px-3"
                onClick={() => updateStored({ ...stored, adultVisited: stored.adultVisited.includes(selected.id) ? stored.adultVisited : [...stored.adultVisited, selected.id] })}
              >
                {stored.adultName}讀過
              </button>
              <button
                type="button"
                className="min-h-11 border border-[#1a1614] px-3"
                onClick={() => updateStored({ ...stored, childVisited: stored.childVisited.includes(selected.id) ? stored.childVisited : [...stored.childVisited, selected.id] })}
              >
                {stored.childName}讀過
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="min-h-11 px-3 underline"
            onClick={() => {
              clearStoredProgress();
              setStored(emptyStoredProgress());
            }}
          >
            清除這台裝置的記號
          </button>
        </div>
      ) : null}
      {selected && together(snapshot, selected.id) ? <p className="mb-4 text-sm font-semibold">這個節點你們一起學過。</p> : null}
      <p className="controls-block progress-note mb-4 px-4 text-sm" data-testid="city-filter">
        目前看的是{filterBits.length > 0 ? filterBits.join("・") : "全部"}
      </p>
      <div className="map-block grid gap-4">
      <div>
        <nav aria-label="地圖層級" className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="min-h-11 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]" onClick={() => go(EMPTY, "push")}>
            全部
          </button>
          {level.district ? (
            <>
              <span aria-hidden="true">/</span>
              <button type="button" className="min-h-11 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]" onClick={() => go({ district: level.district, stage: null, kp: null }, "push")}>
                {data.districts.find((district) => district.key === level.district)?.name}
              </button>
            </>
          ) : null}
          {level.stage ? (
            <>
              <span aria-hidden="true">/</span>
              <button type="button" className="min-h-11 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]" onClick={() => go({ district: level.district, stage: level.stage, kp: null }, "push")}>
                {data.stages.find((stage) => stage.id === level.stage)?.name}
              </button>
            </>
          ) : null}
          {selected ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{selected.title}</span>
            </>
          ) : null}
        </nav>
        <div className={view === "map" ? "chips mb-3 hidden md:flex" : "chips mb-3"} role="group" aria-label="領域與階段">
          {data.districts.map((district) => (
            <button
              key={district.key}
              type="button"
              aria-pressed={level.district === district.key && !level.stage}
              className="chip"
              onClick={() => go({ district: district.key, stage: null, kp: null }, "push")}
            >
              {district.name}
            </button>
          ))}
          {data.stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={level.stage === stage.id}
              className="chip"
              onClick={() => go({ district: level.district, stage: stage.id, kp: null }, "push")}
            >
              {stage.name}
            </button>
          ))}
        </div>
        <div className="chips mb-3" role="group" aria-label="層級">
          {data.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={level.layer === layer.id}
              className="chip"
              onClick={() => go({ layer: level.layer === layer.id ? null : layer.id, kp: null }, "push")}
            >
              {layer.name}
            </button>
          ))}
        </div>
        <div className="chips mb-3" role="group" aria-label="核心素養">
          {data.competencies.map((item) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={level.competency === item.code}
              className="chip"
              onClick={() => go({ competency: level.competency === item.code ? null : item.code, kp: null }, "push")}
            >
              {item.code} {item.name}
            </button>
          ))}
        </div>
        {view === "map" ? (
          <div className="mb-4 md:hidden">
            <MobileDistricts
              data={data}
              district={level.district}
              snapshot={snapshot}
              selectedId={selected?.id ?? null}
              linkedIds={linkedIds}
              accept={accept}
              onDistrict={(id) => go(id ? { district: id, stage: null, kp: null } : { district: null, stage: null, kp: null }, "push")}
              onStage={(stageId) => go({ district: level.district, stage: stageId, kp: null }, "push")}
              onOpen={openBuilding}
              onLot={openLot}
            />
          </div>
        ) : null}
        <div className={view === "map" ? (level.district ? "block" : "hidden md:block") : "hidden"}>
        <div className="mapbox relative">
          <p className="px-3 pt-3 text-sm font-semibold md:sr-only">小地圖</p>
          <svg
            ref={svgRef}
            data-testid="city-map"
            data-building-count={data.buildings.length}
            viewBox={viewBox}
            role="group"
            aria-label="知識地圖。四個領域是空間，階段從國小到大學。節點是知識點。"
            className={`city h-auto w-full max-w-full ${zoomed ? "touch-none" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <desc>家庭空間在中央。由內而外是國小、國中、高中、大學。亮的節點已開放，暗的尚未接上。</desc>
            <g aria-hidden="true">
              {data.rings.map((ring, index) => (
                <path
                  key={ring[1]}
                  d={`M ${data.cx - ring[1]},${data.cy} a ${ring[1]},${ring[1]} 0 1 0 ${ring[1] * 2},0 a ${ring[1]},${ring[1]} 0 1 0 ${-ring[1] * 2},0 Z M ${data.cx - ring[0]},${data.cy} a ${ring[0]},${ring[0]} 0 1 1 ${ring[0] * 2},0 a ${ring[0]},${ring[0]} 0 1 1 ${-ring[0] * 2},0 Z`}
                  fill={["#22302a", "#26352f", "#2a3a33", "#2e3f38"][index]}
                  fillRule="evenodd"
                />
              ))}
            </g>
            {data.districts.map((district) =>
              data.rings.map((ring, sIndex) => (
                <path
                  key={`${district.key}-${sIndex}`}
                  d={annulus(data.cx, data.cy, ring[0], ring[1], sectorStart(district.sector, data.sector) + 1, sectorStart(district.sector, data.sector) + data.sector - 1)}
                  fill={district.color}
                  fillOpacity={level.district === district.key && level.stage === data.stages[sIndex]?.id ? 0.28 : 0.12 + sIndex * 0.02}
                  stroke="#f4f7f2"
                  strokeOpacity={0.28}
                  strokeWidth={1.25}
                  role="button"
                  tabIndex={0}
                  aria-label={`${district.name}，${data.stages[sIndex]?.name}`}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]"
                  onClick={() => zoomRing(district.key, level.district === district.key ? data.stages[sIndex].id : null)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    zoomRing(district.key, level.district === district.key ? data.stages[sIndex].id : null);
                  }}
                >
                  <title>{`${district.name}，${data.stages[sIndex]?.name}`}</title>
                </path>
              )),
            )}
            {data.stages.map((stage, index) => {
              const ring = data.rings[index];
              if (!ring) return null;
              return (
                <path
                  key={stage.id}
                  className="ring-hi"
                  d={`M ${data.cx - ring[1] + 2},${data.cy} a ${ring[1] - 2},${ring[1] - 2} 0 1 0 ${(ring[1] - 2) * 2},0 a ${ring[1] - 2},${ring[1] - 2} 0 1 0 ${-(ring[1] - 2) * 2},0 Z M ${data.cx - ring[0] - 2},${data.cy} a ${ring[0] + 2},${ring[0] + 2} 0 1 1 ${(ring[0] + 2) * 2},0 a ${ring[0] + 2},${ring[0] + 2} 0 1 1 ${-(ring[0] + 2) * 2},0 Z`}
                  fill="#ff5b22"
                  fillOpacity={0.16}
                  fillRule="evenodd"
                  opacity={level.stage === stage.id ? 1 : 0}
                  aria-hidden="true"
                />
              );
            })}
            <g aria-hidden="true">
              <circle cx={data.cx} cy={data.cy} r={data.plaza - 6} fill="#eef0ea" />
              <text x={data.cx} y={data.cy - 2} textAnchor="middle" fontSize={18} fontWeight={900} fill="#1a1614">家庭</text>
              <text x={data.cx} y={data.cy + 20} textAnchor="middle" fontSize={18} fontWeight={900} fill="#1a1614">空間</text>
              {data.districts.map((district) => {
                const spots: Record<string, [number, number, "start" | "end"]> = {
                  philosophy: [data.size - 16, 56, "end"],
                  math: [data.size - 16, data.size - 70, "end"],
                  "pm-leadership": [16, data.size - 70, "start"],
                  "it-ai": [16, 56, "start"],
                };
                const spot = spots[district.key];
                if (!spot) return null;
                return (
                  <g key={district.key} className="lbl">
                    <text x={spot[0]} y={spot[1]} textAnchor={spot[2]} fontSize={22} fontWeight={900} fill={district.color}>{district.name}</text>
                    <text x={spot[0]} y={spot[1] + 26} textAnchor={spot[2]} fontSize={14} fill="#c3cbc5">{district.layerName}</text>
                  </g>
                );
              })}
            </g>
            {selected ? (
              <g data-testid="city-links" aria-hidden="true">
                {([
                  [selected.prerequisites, false],
                  [selected.requiredBy, true],
                ] as const).map(([ends, dashed]) => ends.map((item) => {
                  const other = byId.get(item.id);
                  if (!other) return null;
                  const wire = schematicPath([selected, other]);
                  return (
                    <g key={`${dashed ? "out" : "in"}-${item.id}`}>
                      <path d={wire.d} fill="none" stroke="#f4f7f2" strokeWidth={2.4} strokeDasharray={dashed ? "8 6" : undefined} strokeLinejoin="miter" />
                      {wire.joints.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={3.2} fill="#f4f7f2" />)}
                    </g>
                  );
                }))}
              </g>
            ) : null}
            {pathStops.length > 1 ? (
              <g aria-hidden="true">
                <path
                  data-testid="city-route"
                  d={routeWire.d}
                  fill="none"
                  stroke="#ff5b22"
                  strokeWidth={5}
                  strokeLinejoin="miter"
                  strokeLinecap="square"
                />
                {routeWire.joints.map(([x, y], index) => (
                  <circle key={index} cx={x} cy={y} r={4} fill="#ff5b22" />
                ))}
              </g>
            ) : null}
            {data.lots
              .filter((item) => item.featured)
              .map((item) => (
                <g key={item.id}>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`預留空間：${item.name}（下一輪）`}
                    className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]"
                    onClick={() => setLotId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLotId(item.id);
                    }}
                  >
                    <rect x={item.x - 46} y={item.y - 26} width={92} height={52} fill="#24312b" stroke="#6f8279" strokeWidth={2} strokeDasharray="6 6" />
                    <title>{`預留空間：${item.name}（下一輪）`}</title>
                  </g>
                  <text className="lbl" x={item.x} y={item.y + 48} textAnchor="middle" fontSize={14} fill="#c3cbc5" aria-hidden="true" pointerEvents="none">
                    {item.name}
                  </text>
                </g>
              ))}
            {data.buildings.map((building) => {
              const district = data.districts.find((item) => item.key === building.folder);
              const color = district?.color ?? "#eef0ea";
              const draft = !building.title;
              const r = nodeRadius(building);
              const body = draft ? "#46594f" : "#eef0ea";
              const active = selected?.id === building.id;
              const linked = linkedIds.includes(building.id);
              const focused = inFocus(building, level);
              const mark = active || linked ? "#ff5b22" : "#1c2621";
              const shape = building.pointedRoof && !draft ? (
                <>
                  <circle cx={building.x} cy={building.y} r={r + 4} fill="none" stroke={color} strokeWidth={2} />
                  <circle cx={building.x} cy={building.y} r={r} fill={body} stroke={mark} strokeWidth={active || linked ? 3 : 1.5} />
                </>
              ) : (
                <rect x={building.x - r} y={building.y - r} width={r * 2} height={r * 2} fill={body} stroke={draft ? "#6f8279" : mark} strokeWidth={active || linked ? 3 : 1.5} />
              );
              return (
                <g key={building.id} opacity={!focused ? 0.16 : level.district && level.district !== building.folder ? 0.4 : 1}>
                  {draft || !focused ? (
                    <g className="bld-d" aria-hidden="true">{shape}</g>
                  ) : (
                    <g
                      className="bld"
                      role="button"
                      tabIndex={0}
                      data-testid="city-building"
                      data-building-id={building.id}
                      aria-label={`${building.title}，${building.stageName}，${building.districtName}${building.aesthetics ? "，美學" : ""}`}
                      onClick={() => openBuilding(building.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openBuilding(building.id);
                        }
                      }}
                      onMouseEnter={() => setHover(building.id)}
                      onMouseLeave={() => setHover((current) => (current === building.id ? null : current))}
                      onFocus={() => setHover(building.id)}
                    >
                      {shape}
                    </g>
                  )}
                </g>
              );
            })}
            {pathStops.map((id, index) => {
              const place = byId.get(id);
              if (!place) return null;
              return (
                <g key={id} aria-hidden="true" data-testid="city-stop" data-stop={index + 1}>
                  <circle cx={place.x} cy={place.y - nodeRadius(place) - 14} r={8} fill="#1c2621" />
                  <text x={place.x} y={place.y - nodeRadius(place) - 11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#eef0ea">
                    {index + 1}
                  </text>
                </g>
              );
            })}
            {([["child", snapshot.child, "#ff5b22"], ["adult", snapshot.adult, "#eef0ea"]] as const).map(([role, person, fill]) => {
              if (!person.at) return null;
              const place = byId.get(person.at);
              if (!place?.title) return null;
              const dot = role === "child";
              const r = nodeRadius(place);
              return (
                <g key={role} role="img" aria-label={`${person.name}目前在${place.title}（範例資料）`}>
                  <circle cx={place.x + r + 12} cy={place.y - r} r={dot ? 8 : 7} fill={dot ? fill : "#1c2621"} stroke={dot ? "#1c2621" : fill} strokeWidth={dot ? 3 : 4} />
                  <text className="lbl" x={place.x + r + 24} y={place.y - r + 4} fontSize={14} fontWeight={900} fill={dot ? "#ff8a5c" : "#eef0ea"}>
                    {person.name}
                  </text>
                </g>
              );
            })}
          </svg>
          {hovered && hovered.id !== selected?.id ? (
            <p className="pointer-events-none absolute bottom-3 left-3 max-w-xs border border-[#1a1614] bg-[#fffdf8] px-3 py-2 text-sm text-[#1a1614]" role="status">
              {hovered.title}・{hovered.stageName}
              {hovered.status !== "published" ? "・草稿" : ""}
            </p>
          ) : null}
        </div>
        <div className="legend" aria-label="圖例">
          <span className="it"><span className="sw" style={{ background: "var(--chalk)", borderRadius: 2 }} />已開放</span>
          <span className="it"><span className="sw" style={{ background: "#46594f", borderRadius: 2 }} />尚未接上</span>
          <span className="it"><svg width="28" height="10" aria-hidden="true" viewBox="0 0 28 10"><path d="M1 5 H27" stroke="currentColor" strokeWidth="2" /><circle cx="14" cy="5" r="2.2" fill="currentColor" /></svg>先備</span>
          <span className="it"><svg width="28" height="10" aria-hidden="true" viewBox="0 0 28 10"><path d="M1 5 H27" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg>延伸</span>
          <span className="it"><span className="sw" style={{ background: "var(--accent)", borderRadius: 2, height: 6, width: 22 }} />主線</span>
          <span className="it mk mk-child">孩子</span>
          <span className="it mk mk-adult">大人</span>
          <span className="sample">範例資料</span>
        </div>
        </div>
        {view === "list" ? (
          <CityList data={data} snapshot={snapshot} selectedId={selected?.id ?? null} linkedIds={linkedIds} accept={accept} onOpen={openBuilding} />
        ) : null}
        {view === "system" ? (
          <LayerOverview
            data={data}
            snapshot={snapshot}
            selectedId={selected?.id ?? null}
            linkedIds={linkedIds}
            pathStops={pathStops}
            accept={accept}
            activeStage={level.stage}
            activeLayer={level.layer}
            onOpen={openBuilding}
            onLot={openLot}
            onPickStage={(stageId) => go({ stage: level.stage === stageId ? null : stageId, kp: null }, "push")}
            onPickLayer={(layerId) => go({ layer: level.layer === layerId ? null : layerId, kp: null }, "push")}
          />
        ) : null}
      </div>
      <aside className="city-card" data-testid="city-card">
        {selected ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#3d3830]">
              {selected.districtName}・{selected.stageName}・{selected.layerName}
              {selected.status !== "published" ? "・草稿" : ""}
            </p>
            <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
            <p className="mt-2 text-sm leading-6">{selected.idea}</p>
            <p className="mt-3 text-sm">被 {selected.dependents} 個節點當先備</p>
            <h3 className="mt-4 text-sm font-bold">先備</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.prerequisites.length === 0 ? <li>沒有先備</li> : selected.prerequisites.map((item) => (
                <li key={item.id}>
                  <button type="button" className="min-h-11 underline" onClick={() => openBuilding(item.id)}>{item.title}</button>
                </li>
              ))}
            </ul>
            <h3 className="mt-3 text-sm font-bold">被依賴</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.requiredBy.length === 0 ? <li>還沒有知識點依賴它</li> : selected.requiredBy.map((item) => (
                <li key={item.id}>
                  <button type="button" className="min-h-11 underline" onClick={() => openBuilding(item.id)}>{item.title}</button>
                </li>
              ))}
            </ul>
            <h3 className="mt-3 text-sm font-bold">核心素養</h3>
            <ul className="mt-1 flex flex-wrap gap-2 text-sm">
              {selected.competencies.length === 0 ? <li>沒有標</li> : selected.competencies.map((code) => {
                const name = data.competencies.find((item) => item.code === code)?.name ?? code;
                return (
                  <li key={code}>
                    <button type="button" className="chip" aria-pressed={level.competency === code} onClick={() => go({ competency: code }, "push")}>
                      {code} {name}
                    </button>
                  </li>
                );
              })}
            </ul>
            <h3 className="mt-3 text-sm font-bold">所在主線</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.paths.length === 0 ? <li>沒有主線</li> : selected.paths.map((path) => <li key={path.id}>{path.title}・第 {path.index + 1} 站{path.colearn ? "・有家庭時間" : ""}</li>)}
            </ul>
            <h3 className="mt-3 text-sm font-bold">跨領域線路</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.bridges.length === 0 ? <li>沒有跨到別的領域</li> : selected.bridges.map((item) => <li key={item.id}>{item.title}</li>)}
            </ul>
            <Link href={selected.href} className="btn btn-ink btn-sm go">
              讀這一站
            </Link>
            <button type="button" className="mt-2 inline-flex min-h-11 items-center px-4 text-sm underline" onClick={() => go(parentLevel(level), "push")}>
              關閉
            </button>
          </div>
        ) : lot ? (
          <div>
            <h2 className="text-xl font-bold">預留空間・{lot.name}</h2>
            <p className="mt-2 text-sm leading-6">
              {lot.layerName}。taxonomy 已經留了位子，這一輪還沒有知識點。
              {lot.summary ? ` ${lot.summary}` : ""}
            </p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center border border-[#1a1614] px-4 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7]"
              onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}
            >
              想學這個？許個願
            </button>
          </div>
        ) : view === "system" ? (
          <div>
            <h2 className="text-xl font-bold">分層分段總圖</h2>
            <p className="mt-2 text-sm leading-6">列是層級，欄是階段。點一個知識點，看標題、階段、層級、先備和被依賴。</p>
            <p className="mt-3 text-sm leading-6">選一條主線，這一站會標上橘色站號。</p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center border border-[#1a1614] px-4 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7]"
              onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}
            >
              想學別的？許個願
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold">知識地圖</h2>
            <p className="mt-2 text-sm leading-6">四個領域是空間，由內而外是國小到大學。點一個領域放大，再點階段，然後點節點。實線是先備，虛線是延伸。</p>
            <p className="mt-3 text-sm leading-6">下一輪預留 {data.lots.filter((item) => item.featured).length} 個空間，這一輪還沒有節點。</p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center border border-[#1a1614] px-4 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7]"
              onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}
            >
              想學別的？許個願
            </button>
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
