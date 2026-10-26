"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
}

const EMPTY: Level = { district: null, stage: null, kp: null };

function readLevel(): Level {
  const params = new URLSearchParams(window.location.search);
  return {
    district: params.get("d"),
    stage: params.get("s"),
    kp: params.get("kp"),
  };
}

function writeLevel(level: Level, mode: "push" | "replace") {
  const params = new URLSearchParams(window.location.search);
  for (const key of ["d", "s", "kp"]) params.delete(key);
  if (level.district) params.set("d", level.district);
  if (level.stage) params.set("s", level.stage);
  if (level.kp) params.set("kp", level.kp);
  const search = params.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ""}`;
  const state = { city: level };
  if (mode === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
}

function parentLevel(level: Level): Level {
  if (level.kp) return { ...level, kp: null };
  if (level.stage) return { district: level.district, stage: null, kp: null };
  if (level.district) return EMPTY;
  return EMPTY;
}

function curve(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, pull: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const cpx = mx + (cx - mx) * pull;
  const cpy = my + (cy - my) * pull;
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}

function parseViewBox(value: string): [number, number, number, number] {
  const [x, y, w, h] = value.split(" ").map(Number);
  return [x, y, w, h];
}

/** /kp/map 的城市圖。建築在伺服端資料裡，互動留在這個 client 元件。 */
export function CityMapView({
  data,
  rememberView = false,
  showStart = false,
}: {
  data: CityMapData;
  rememberView?: boolean;
  showStart?: boolean;
}) {
  const [level, setLevel] = useState<Level>(EMPTY);
  const [view, setView] = useState<CityView>("map");
  const [lotId, setLotId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pathId, setPathId] = useState("");
  const [mode, setMode] = useState<"demo" | "local">("demo");
  const [stored, setStored] = useState<StoredProgress>(emptyStoredProgress);
  const [viewBox, setViewBox] = useState(`0 0 ${data.size} ${data.size}`);
  const depth = useRef(0);
  const mapRoot = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; box: [number, number, number, number] } | null>(null);

  const byId = useMemo(() => new Map(data.buildings.map((building) => [building.id, building])), [data.buildings]);
  const districtIndex = data.districts.findIndex((district) => district.key === level.district);
  const stageIndex = data.stages.findIndex((stage) => stage.id === level.stage);
  const selected = level.kp ? byId.get(level.kp) : undefined;
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

  const go = useCallback((next: Level, mode: "push" | "replace") => {
    setLevel(next);
    setLotId(null);
    if (mode === "push") depth.current += 1;
    writeLevel(next, mode);
  }, []);

  useEffect(() => {
    const initial = readLevel();
    if (initial.district || initial.stage || initial.kp) {
      setLevel(initial);
      window.history.replaceState({ city: initial }, "", window.location.href);
    }
    const params = new URLSearchParams(window.location.search);
    setPathId(params.get("path") ?? "");
    setStored(readStoredProgress());
    const fromUrl = parseCityView(params.get("view"));
    setView(fromUrl ?? (rememberView ? readRememberedView() : null) ?? "map");
    const onPop = () => {
      depth.current = Math.max(0, depth.current - 1);
      setLevel(readLevel());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
    if (!building) return;
    go({ district: building.folder, stage: building.stage, kp: id }, "push");
  };

  const openLot = (id: string) => {
    setLotId(id);
    const next = { district: level.district, stage: level.stage, kp: null };
    setLevel(next);
    writeLevel(next, "replace");
  };

  const setCityView = (next: CityView) => {
    setView(next);
    if (rememberView) writeRememberedView(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "map") params.delete("view");
    else params.set("view", next);
    const search = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  };

  const visibleBridges = selected
    ? data.bridges.filter((bridge) => bridge.from === selected.id || bridge.to === selected.id)
    : [];

  const lot = data.lots.find((item) => item.id === lotId);

  const zoomed = Boolean(level.district || level.stage);
  const outerRing = data.rings[data.rings.length - 1];
  const zoomRing = (districtKey: string, stageId: string | null) => {
    go({ district: districtKey, stage: stageId, kp: null }, "push");
  };
  const filterBits = [
    level.district ? data.districts.find((district) => district.key === level.district)?.name : null,
    level.stage ? data.stages.find((stage) => stage.id === level.stage)?.name : null,
  ].filter(Boolean);

  return (
    <div ref={mapRoot} data-testid="city-experience">
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
      <ViewSwitch view={view} onChange={setCityView} />
      {showStart ? (
        <div className="mb-4" data-testid="city-start">
          <p className="text-sm font-semibold text-[#1a1614]">從這裡開始</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 border border-[#1a1614] bg-[#1a1614] px-4 text-sm font-semibold text-[#faf9f7] hover:bg-[#3d3830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
              onClick={() => go({ district: null, stage: "es", kp: null }, "push")}
            >
              孩子從國小環開始
            </button>
            {data.stages
              .filter((stage) => stage.id !== "es")
              .map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  className="min-h-11 border border-[#1a1614] bg-white px-4 text-sm font-semibold hover:bg-[#f3f0ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
                  onClick={() => go({ district: null, stage: stage.id, kp: null }, "push")}
                >
                  大人看{stage.name}環
                </button>
              ))}
          </div>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end gap-3">
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
      <p className="mb-4 text-sm leading-6 text-[#3d3830]" data-testid="city-progress-notice">
        {snapshot.notice}
      </p>
      {mode === "local" ? (
        <div className="mb-4 flex flex-wrap gap-3 text-sm" data-testid="city-local-progress">
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
                {stored.adultName}走過
              </button>
              <button
                type="button"
                className="min-h-11 border border-[#1a1614] px-3"
                onClick={() => updateStored({ ...stored, childVisited: stored.childVisited.includes(selected.id) ? stored.childVisited : [...stored.childVisited, selected.id] })}
              >
                {stored.childName}走過
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
      {selected && together(snapshot, selected.id) ? <p className="mb-4 text-sm font-semibold">這棟你們一起學過。</p> : null}
      <p className="mb-4 text-sm text-[#3d3830]" data-testid="city-filter">
        目前看的是{filterBits.length > 0 ? filterBits.join("・") : "全城"}
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <nav aria-label="地圖層級" className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="min-h-11 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]" onClick={() => go(EMPTY, "push")}>
            全城
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
                {data.stages.find((stage) => stage.id === level.stage)?.name}環
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
        <div className="mb-3 hidden flex-wrap gap-2 md:flex" role="group" aria-label="學區與環路">
          {data.districts.map((district) => (
            <button
              key={district.key}
              type="button"
              aria-pressed={level.district === district.key && !level.stage}
              className="inline-flex min-h-11 items-center border border-[#1a1614] px-3 text-sm font-semibold hover:bg-[#1a1614] hover:text-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
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
              className="inline-flex min-h-11 items-center border border-[#c0bab2] bg-white px-3 text-sm font-semibold hover:border-[#1a1614] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
              onClick={() => go({ district: level.district, stage: stage.id, kp: null }, "push")}
            >
              {stage.name}環
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
              onDistrict={(id) => go(id ? { district: id, stage: null, kp: null } : EMPTY, "push")}
              onStage={(stageId) => go({ district: level.district, stage: stageId, kp: null }, "push")}
              onOpen={openBuilding}
              onLot={openLot}
            />
          </div>
        ) : null}
        <div className={view === "map" ? (level.district ? "block" : "hidden md:block") : "hidden"}>
        <div className="relative overflow-hidden border border-[#c0bab2] bg-[#faf9f7]" style={{ backgroundImage: "radial-gradient(#c0bab2 0.6px, transparent 0.6px)", backgroundSize: "18px 18px" }}>
          <p className="px-3 pt-3 text-sm font-semibold md:sr-only">小地圖</p>
          <svg
            ref={svgRef}
            data-testid="city-map"
            data-building-count={data.buildings.length}
            viewBox={viewBox}
            role="group"
            aria-label="學習城市地圖。四個學區，環路從國小到大學。建築是知識點。"
            className={`h-auto w-full max-w-full ${zoomed ? "touch-none" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <desc>四個學區沿環路排列。環路由內到外是國小、國中、高中、大學。每一棟建築是一個知識點，平頂是本質或基礎，尖頂是進階或應用，虛線是草稿。</desc>
            {data.rings.map((ring, index) => (
              <circle key={ring[1]} cx={data.cx} cy={data.cy} r={ring[1]} fill={index % 2 === 0 ? "#f3f0ea" : "#faf9f7"} stroke="#c0bab2" strokeWidth={1} />
            ))}
            <circle cx={data.cx} cy={data.cy} r={data.plaza} fill="#fffdf8" stroke="#1a1614" strokeWidth={1.4} />
            <text x={data.cx} y={data.cy - 4} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1a1614">
              家庭廣場
            </text>
            {data.districts.map((district) =>
              data.rings.map((ring, sIndex) => (
                <path
                  key={`${district.key}-${sIndex}`}
                  d={annulus(data.cx, data.cy, ring[0], ring[1], sectorStart(district.sector, data.sector) + 1, sectorStart(district.sector, data.sector) + data.sector - 1)}
                  fill={district.color}
                  fillOpacity={level.district === district.key && level.stage === data.stages[sIndex]?.id ? 0.22 : level.district === district.key ? 0.12 : 0.07}
                  stroke={district.color}
                  strokeWidth={0.8}
                  role="button"
                  tabIndex={0}
                  aria-label={`${district.name}，${data.stages[sIndex]?.name}環`}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]"
                  onClick={() => zoomRing(district.key, level.district === district.key ? data.stages[sIndex].id : null)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    zoomRing(district.key, level.district === district.key ? data.stages[sIndex].id : null);
                  }}
                >
                  <title>{`${district.name}，${data.stages[sIndex]?.name}環`}</title>
                </path>
              )),
            )}
            <path
              d={annulus(data.cx, data.cy, data.plaza, outerRing[1], sectorStart(data.districts.length, data.sector) + 1, sectorStart(data.districts.length, data.sector) + data.sector - 1)}
              fill="#5c564e"
              fillOpacity={0.06}
              stroke="#5c564e"
              strokeDasharray="6 5"
            />
            {data.roads.map((road) => {
              const from = byId.get(road.from);
              const to = byId.get(road.to);
              if (!from || !to) return null;
              const hot = selected && (road.from === selected.id || road.to === selected.id);
              return (
                <path
                  key={`${road.from}-${road.to}`}
                  d={curve(from.x, from.y, to.x, to.y, data.cx, data.cy, 0.05)}
                  fill="none"
                  stroke={from.districtName ? data.districts.find((district) => district.key === from.folder)?.color ?? "#5c564e" : "#5c564e"}
                  strokeOpacity={hot ? 0.95 : 0.35}
                  strokeWidth={hot ? 2.2 : 1.1}
                  aria-hidden="true"
                />
              );
            })}
            {visibleBridges.map((bridge) => {
              const from = byId.get(bridge.from);
              const to = byId.get(bridge.to);
              if (!from || !to) return null;
              return (
                <path
                  key={`${bridge.from}-${bridge.to}`}
                  d={curve(from.x, from.y, to.x, to.y, data.cx, data.cy, 0.45)}
                  fill="none"
                  stroke="#1a1614"
                  strokeDasharray="4 3"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              );
            })}
            {pathStops.length > 1 ? (
              <path
                data-testid="city-route"
                d={pathStops.map((id, index) => `${index === 0 ? "M" : "L"} ${byId.get(id)!.x.toFixed(1)} ${byId.get(id)!.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke="#1a1614"
                strokeWidth={3}
                strokeLinejoin="round"
                aria-hidden="true"
              />
            ) : null}
            {data.lots
              .filter((item) => item.featured)
              .map((item) => (
                <g key={item.id}>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`預定地：${item.name}`}
                    className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a1614]"
                    onClick={() => setLotId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLotId(item.id);
                    }}
                  >
                    <rect x={item.x - 28} y={item.y - 10} width={56} height={20} rx={2} fill="#fffdf8" stroke="#5c564e" strokeDasharray="3 2" />
                    <title>{`預定地：${item.name}`}</title>
                  </g>
                  <text x={item.x} y={item.y + 4} textAnchor="middle" fontSize={9} fill="#3d3830" aria-hidden="true" pointerEvents="none">
                    {item.name.slice(0, 4)}
                  </text>
                </g>
              ))}
            {data.buildings.map((building) => {
              const district = data.districts.find((item) => item.key === building.folder);
              const color = district?.color ?? "#1a1614";
              const w = 12;
              const active = selected?.id === building.id;
              const draft = building.status !== "published";
              const seen = snapshot.adult.at === building.id || snapshot.adult.visited.includes(building.id) || snapshot.child.at === building.id || snapshot.child.visited.includes(building.id);
              const stopIndex = path?.stops.indexOf(building.id) ?? -1;
              return (
                <g key={building.id} opacity={level.district && level.district !== building.folder ? 0.35 : 1}>
                  <ellipse cx={building.x} cy={building.y} rx={8} ry={3} fill="#1a1614" fillOpacity={0.12} aria-hidden="true" />
                  {building.pointedRoof ? (
                    <path d={`M ${building.x - w / 2 - 1} ${building.y - building.height} L ${building.x} ${building.y - building.height - 7} L ${building.x + w / 2 + 1} ${building.y - building.height} Z`} fill={color} aria-hidden="true" />
                  ) : (
                    <rect x={building.x - w / 2 - 1.5} y={building.y - building.height - 3} width={w + 3} height={3} fill={color} aria-hidden="true" />
                  )}
                  <rect
                    x={building.x - w / 2}
                    y={building.y - building.height}
                    width={w}
                    height={building.height}
                    fill={color}
                    fillOpacity={draft ? 0.35 : seen ? 0.95 : pathStops.includes(building.id) ? 0.85 : 0.55}
                    stroke={active ? "#1a1614" : color}
                    strokeWidth={active ? 2 : 1}
                    strokeDasharray={draft ? "2.2 1.4" : undefined}
                    aria-hidden="true"
                  />
                  {stopIndex >= 0 ? (
                    <g aria-hidden="true" data-testid="city-stop" data-stop={stopIndex + 1}>
                      <circle cx={building.x} cy={building.y - building.height - 12} r={7} fill="#1a1614" />
                      <text x={building.x} y={building.y - building.height - 8.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#faf9f7">
                        {stopIndex + 1}
                      </text>
                    </g>
                  ) : null}
                  {building.aesthetics ? (
                    <circle cx={building.x + 9} cy={building.y - building.height + 2} r={3.5} fill="#fffdf8" stroke="#1a1614" aria-hidden="true" />
                  ) : null}
                  <g
                    role="button"
                    tabIndex={0}
                    data-testid="city-building"
                    data-building-id={building.id}
                    aria-label={`${building.title}，${building.stageName}，${building.districtName}${draft ? "，草稿" : ""}${building.aesthetics ? "，美學" : ""}`}
                    className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]"
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
                    <rect x={building.x - 16} y={building.y - building.height - 10} width={32} height={building.height + 16} fill="transparent" />
                  </g>
                </g>
              );
            })}
            {([["child", snapshot.child], ["adult", snapshot.adult]] as const).map(([role, person]) => {
              if (!person.at) return null;
              const place = byId.get(person.at);
              if (!place) return null;
              return (
                <g key={role} role="img" aria-label={`${person.name}目前在${place.title}`}>
                  <rect x={place.x - 18} y={place.y - place.height - 28} width={36} height={16} rx={8} fill="#1a1614" />
                  <text x={place.x} y={place.y - place.height - 17} textAnchor="middle" fontSize={9} fill="#faf9f7">
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
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#3d3830]">
          {data.districts.map((district) => (
            <li key={district.key} className="inline-flex min-h-11 items-center gap-2">
              <span className="inline-block h-3 w-3" style={{ background: district.color }} aria-hidden="true" />
              {district.name}（{district.layerName}）
            </li>
          ))}
          <li className="inline-flex min-h-11 items-center gap-2">平頂是本質或基礎，尖頂是進階或應用。虛線是草稿。</li>
          <li className="inline-flex min-h-11 items-center gap-2">小圓點是美學。</li>
        </ul>
        </div>
        {view === "list" ? <CityList data={data} snapshot={snapshot} selectedId={selected?.id ?? null} onOpen={openBuilding} /> : null}
        {view === "system" ? (
          <LayerOverview
            data={data}
            snapshot={snapshot}
            selectedId={selected?.id ?? null}
            activeStage={level.stage}
            onOpen={openBuilding}
            onLot={openLot}
          />
        ) : null}
      </div>
      <aside className="border border-[#c0bab2] bg-white p-4" data-testid="city-card">
        {selected ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#3d3830]">
              {selected.districtName}・{selected.stageName}・{selected.layerName}
              {selected.status !== "published" ? "・草稿" : ""}
            </p>
            <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
            <p className="mt-2 text-sm leading-6">{selected.idea}</p>
            <p className="mt-3 text-sm">高度 {selected.height}（被 {selected.dependents} 個知識點當先備）</p>
            <h3 className="mt-4 text-sm font-bold">先備</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.prerequisites.length === 0 ? <li>沒有先備</li> : selected.prerequisites.map((item) => <li key={item.id}>{item.title}</li>)}
            </ul>
            <h3 className="mt-3 text-sm font-bold">被依賴</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.requiredBy.length === 0 ? <li>還沒有知識點依賴它</li> : selected.requiredBy.map((item) => <li key={item.id}>{item.title}</li>)}
            </ul>
            <h3 className="mt-3 text-sm font-bold">所在主線</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.paths.length === 0 ? <li>沒有主線</li> : selected.paths.map((path) => <li key={path.id}>{path.title}・第 {path.index + 1} 站{path.colearn ? "・有家庭時間" : ""}</li>)}
            </ul>
            <h3 className="mt-3 text-sm font-bold">跨學門橋</h3>
            <ul className="mt-1 text-sm leading-6">
              {selected.bridges.length === 0 ? <li>這棟沒有跨到別的學門</li> : selected.bridges.map((item) => <li key={item.id}>{item.title}</li>)}
            </ul>
            <Link href={selected.href} className="mt-4 inline-flex min-h-11 items-center bg-[#1a1614] px-4 text-sm font-semibold text-[#faf9f7] hover:bg-[#3d3830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]">
              打開知識點
            </Link>
            <button type="button" className="mt-2 inline-flex min-h-11 items-center px-4 text-sm underline" onClick={() => go(parentLevel(level), "push")}>
              關閉
            </button>
          </div>
        ) : lot ? (
          <div>
            <h2 className="text-xl font-bold">預定地・{lot.name}</h2>
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
        ) : (
          <div>
            <h2 className="text-xl font-bold">學習城市</h2>
            <p className="mt-2 text-sm leading-6">從家庭廣場往外是國小、國中、高中、大學四條環路。點一個學區放大，再點環路，然後點建築。</p>
            <p className="mt-3 text-sm leading-6">開發預定區只畫下一輪的 {data.lots.filter((item) => item.featured).length} 塊空地。</p>
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
