"use client";

import { useState } from "react";
import type { CityBuilding, CityMapData } from "@/lib/content/city";
import type { ProgressSnapshot } from "./progress";

export type CityView = "map" | "list" | "system";

export function parseCityView(value: string | null): CityView | null {
  if (value === "city" || value === "map") return "map";
  if (value === "list" || value === "system") return value;
  return null;
}

const VIEW_STORAGE_KEY = "mido-city-view";

export function readRememberedView(): CityView | null {
  if (typeof window === "undefined") return null;
  return parseCityView(window.localStorage.getItem(VIEW_STORAGE_KEY));
}

export function writeRememberedView(view: CityView): void {
  window.localStorage.setItem(VIEW_STORAGE_KEY, view);
}

export function markLabel(snapshot: ProgressSnapshot, id: string): string {
  const bits: string[] = [];
  for (const person of [snapshot.adult, snapshot.child]) {
    if (person.at === id) bits.push(`${person.name}在這裡`);
    else if (person.visited.includes(id)) bits.push(`${person.name}讀過`);
  }
  return bits.join("，");
}

const control =
  "min-h-11 border border-[#1a1614] px-4 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]";

const VIEW_LABEL: Record<CityView, string> = {
  map: "知識地圖",
  system: "分層分段總圖",
  list: "清單",
};

export function ViewSwitch({
  view,
  onChange,
  order = ["map", "system", "list"],
}: {
  view: CityView;
  onChange: (view: CityView) => void;
  order?: CityView[];
}) {
  const options = order.map((id) => ({ id, label: VIEW_LABEL[id] }));
  return (
    <div className="views" role="group" aria-label="切換檢視">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-testid={`city-view-${option.id}`}
          aria-pressed={view === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BuildingButton({
  building,
  snapshot,
  selected,
  linked,
  pathStop,
  onOpen,
}: {
  building: CityBuilding;
  snapshot: ProgressSnapshot;
  selected: boolean;
  linked?: boolean;
  pathStop?: number | null;
  onOpen: (id: string) => void;
}) {
  if (!building.title) return null;
  const mark = markLabel(snapshot, building.id);
  return (
    <button
      type="button"
      className={`lrow${linked ? " is-link" : ""}${pathStop ? " is-path" : ""}`}
      aria-current={selected ? "true" : undefined}
      data-on-path={pathStop ? String(pathStop) : undefined}
      onClick={() => onOpen(building.id)}
    >
      <span>
        {pathStop ? <span className="stop-n">{pathStop}</span> : null}
        {building.title}
        {building.aesthetics ? "（美學）" : ""}
      </span>
      <span className="small">
        {building.stageName}
        {mark ? `・${mark}` : ""}
      </span>
    </button>
  );
}

function DraftNote({ count }: { count: number }) {
  if (count <= 0) return null;
  return <p className="dimrow">尚未接上 {count}</p>;
}

export function CityList({
  data,
  snapshot,
  selectedId,
  linkedIds = [],
  accept = () => true,
  onOpen,
}: {
  data: CityMapData;
  snapshot: ProgressSnapshot;
  selectedId: string | null;
  linkedIds?: string[];
  accept?: (building: CityBuilding) => boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div id="kp-city-list" data-testid="city-list" tabIndex={-1} className="space-y-8 outline-none">
      {data.districts.map((district) => (
        <section key={district.key} aria-labelledby={`list-${district.key}`}>
          <h2 id={`list-${district.key}`} className="text-xl font-bold">
            {district.name}
          </h2>
          {data.stages.map((stage) => {
            const items = data.buildings.filter((building) => building.folder === district.key && building.stage === stage.id);
            if (items.length === 0) return null;
            return (
              <div key={stage.id} className="mt-4">
                <h3 className="text-base font-bold">{stage.name}</h3>
                <ul className="mt-2 space-y-2">
                  {items.filter((building) => building.title && accept(building)).map((building) => (
                    <li key={building.id}>
                      <BuildingButton building={building} snapshot={snapshot} selected={selectedId === building.id} linked={linkedIds.includes(building.id)} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
                <DraftNote count={items.filter((building) => !building.title && accept(building)).length} />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function CellBuildings({
  items,
  data,
  snapshot,
  selectedId,
  linkedIds,
  pathStops,
  accept,
  onOpen,
}: {
  items: CityBuilding[];
  data: CityMapData;
  snapshot: ProgressSnapshot;
  selectedId: string | null;
  linkedIds: string[];
  pathStops: string[];
  accept: (building: CityBuilding) => boolean;
  onOpen: (id: string) => void;
}) {
  const visible = items.filter(accept);
  if (items.length === 0) return <p className="small">還沒有知識點</p>;
  if (visible.length === 0) return <p className="small">這個篩選沒有知識點</p>;
  const drafts = visible.filter((building) => !building.title).length;
  return (
    <div className="space-y-3">
      {data.districts.map((district) => {
        const group = visible.filter((building) => building.folder === district.key && building.title);
        if (group.length === 0) return null;
        return (
          <div key={district.key}>
            <p className="small">
              <span className="sw" style={{ background: district.color, display: "inline-block" }} aria-hidden="true" />
              {district.name}
            </p>
            <ul className="mt-1 space-y-1">
              {group.map((building) => (
                <li key={building.id}>
                  <BuildingButton
                    building={building}
                    snapshot={snapshot}
                    selected={selectedId === building.id}
                    linked={linkedIds.includes(building.id)}
                    pathStop={pathStops.indexOf(building.id) >= 0 ? pathStops.indexOf(building.id) + 1 : null}
                    onOpen={onOpen}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <DraftNote count={drafts} />
    </div>
  );
}

export function LayerOverview({
  data,
  snapshot,
  selectedId,
  linkedIds = [],
  pathStops = [],
  accept = () => true,
  activeStage,
  activeLayer = null,
  onOpen,
  onLot,
  onPickStage,
  onPickLayer,
}: {
  data: CityMapData;
  snapshot: ProgressSnapshot;
  selectedId: string | null;
  linkedIds?: string[];
  pathStops?: string[];
  accept?: (building: CityBuilding) => boolean;
  activeStage: string | null;
  activeLayer?: string | null;
  onOpen: (id: string) => void;
  onLot: (id: string) => void;
  onPickStage?: (stageId: string) => void;
  onPickLayer?: (layerId: string) => void;
}) {
  const cell = (layerId: string, stageId: string) =>
    data.buildings.filter((building) => building.layer === layerId && building.stage === stageId);

  return (
    <div data-testid="city-layers" className="paper">
      <div className="matrix-cards space-y-4">
        {data.layers.map((layer) => (
          <section key={layer.id} className="border border-[#c0bab2] bg-white p-3" aria-labelledby={`layer-m-${layer.id}`}>
            <h2 id={`layer-m-${layer.id}`} className="text-lg font-bold">
              {layer.name}
            </h2>
            {data.stages.map((stage) => {
              const items = cell(layer.id, stage.id);
              return (
                <div key={stage.id} className="mt-3">
                  <h3 className="text-sm font-bold">
                    {stage.name}（{items.length}）
                  </h3>
                  <div className="mt-2">
                    <CellBuildings items={items} data={data} snapshot={snapshot} selectedId={selectedId} linkedIds={linkedIds} pathStops={pathStops} accept={accept} onOpen={onOpen} />
                  </div>
                </div>
              );
            })}
            <h3 className="mt-3 text-sm font-bold">預留空間</h3>
            <LotList data={data} layerId={layer.id} onLot={onLot} />
          </section>
        ))}
      </div>
      <div className="matrix-table max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="分層分段總圖">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">層級與階段。列是本質到應用，欄是國小到大學，最後一欄是該層的預留空間。</caption>
          <thead>
            <tr>
              <th scope="col" className="border border-[#c0bab2] bg-white px-3 py-3 text-left">
                層級
              </th>
              {data.stages.map((stage) => (
                <th key={stage.id} scope="col" className="border border-[#c0bab2] bg-white px-3 py-3 text-left">
                  {onPickStage ? (
                    <button type="button" className="min-h-11 font-bold underline-offset-2 hover:underline" aria-pressed={activeStage === stage.id} onClick={() => onPickStage(stage.id)}>
                      {stage.name}
                    </button>
                  ) : stage.name}
                </th>
              ))}
              <th scope="col" className="border border-[#c0bab2] bg-white px-3 py-3 text-left">
                預留空間
              </th>
            </tr>
          </thead>
          <tbody>
            {data.layers.map((layer) => (
              <tr key={layer.id}>
                <th scope="row" className="border border-[#c0bab2] bg-white px-3 py-3 text-left align-top">
                  {onPickLayer ? (
                    <button type="button" className="min-h-11 font-bold underline-offset-2 hover:underline" aria-pressed={activeLayer === layer.id} onClick={() => onPickLayer(layer.id)}>
                      {layer.name}
                    </button>
                  ) : layer.name}
                </th>
                {data.stages.map((stage) => {
                  const items = cell(layer.id, stage.id);
                  const active = activeStage === stage.id;
                  return (
                    <td
                      key={stage.id}
                      data-layer={layer.id}
                      data-stage={stage.id}
                      data-count={items.length}
                      className={`border border-[#c0bab2] px-2 py-2 align-top ${active ? "bg-[#f3f0ea]" : "bg-[#faf9f7]"}`}
                    >
                      <CellBuildings items={items} data={data} snapshot={snapshot} selectedId={selectedId} linkedIds={linkedIds} pathStops={pathStops} accept={accept} onOpen={onOpen} />
                    </td>
                  );
                })}
                <td className="border border-[#c0bab2] bg-[#faf9f7] px-2 py-2 align-top" data-testid={`city-lots-${layer.id}`}>
                  <LotList data={data} layerId={layer.id} onLot={onLot} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LotList({ data, layerId, onLot }: { data: CityMapData; layerId: string; onLot: (id: string) => void }) {
  const lots = data.lots.filter((lot) => lot.layer === layerId);
  if (lots.length === 0) return <p className="small">還沒有知識點</p>;
  return (
    <ul className="space-y-1">
      {lots.map((lot) => (
        <li key={lot.id}>
          <button type="button" className={`${control} w-full bg-white hover:bg-[#f3f0ea]`} onClick={() => onLot(lot.id)}>
            {lot.name}
            {lot.featured ? "（下一輪）" : ""}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MobileDistricts({
  data,
  district,
  stage = null,
  onDistrict,
  onStage,
  onOpen,
  onLot,
  snapshot,
  selectedId,
  linkedIds = [],
  accept = () => true,
}: {
  data: CityMapData;
  district: string | null;
  /** 目前放大的階段；手機版一次只展開這一段（沒選時展開第一個有點的階段）。 */
  stage?: string | null;
  onDistrict: (id: string) => void;
  onStage: (stageId: string) => void;
  onOpen: (id: string) => void;
  onLot: (id: string) => void;
  snapshot: ProgressSnapshot;
  selectedId: string | null;
  linkedIds?: string[];
  accept?: (building: CityBuilding) => boolean;
}) {
  if (!district) {
    return (
      <div data-testid="city-mobile">
        <h2 className="text-lg font-bold">領域</h2>
        <ul className="mt-3 space-y-2">
          {data.districts.map((item) => (
            <li key={item.key}>
              <button type="button" className={`${control} w-full bg-white hover:bg-[#f3f0ea]`} onClick={() => onDistrict(item.key)}>
                <span className="mr-2 inline-block h-3 w-3 align-middle" style={{ background: item.color }} aria-hidden="true" />
                {item.name}（{item.layerName}，{item.count}）
              </button>
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-lg font-bold">預留空間</h2>
        <ul className="mt-3 space-y-2">
          {data.lots
            .filter((lot) => lot.featured)
            .map((lot) => (
              <li key={lot.id}>
                <button type="button" className={`${control} w-full bg-white hover:bg-[#f3f0ea]`} onClick={() => onLot(lot.id)}>
                  {lot.name}（{lot.layerName}）
                </button>
              </li>
            ))}
        </ul>
      </div>
    );
  }

  const name = data.districts.find((item) => item.key === district)?.name ?? district;
  return (
    <MobileStages
      key={district}
      data={data}
      district={district}
      name={name}
      stage={stage}
      onDistrict={onDistrict}
      onStage={onStage}
      onOpen={onOpen}
      snapshot={snapshot}
      selectedId={selectedId}
      linkedIds={linkedIds}
      accept={accept}
    />
  );
}

/**
 * 手機版一個學區的清單：依階段分段，一次只展開一段（語文一個學區 108 點，全部攤開太長）。
 * 點階段的標題會展開那一段（網址帶上階段，上面的小地圖淡化其他階段）；再點一次收起來。
 */
function MobileStages({
  data,
  district,
  name,
  stage,
  onDistrict,
  onStage,
  onOpen,
  snapshot,
  selectedId,
  linkedIds,
  accept,
}: {
  data: CityMapData;
  district: string;
  name: string;
  stage: string | null;
  onDistrict: (id: string) => void;
  onStage: (stageId: string) => void;
  onOpen: (id: string) => void;
  snapshot: ProgressSnapshot;
  selectedId: string | null;
  linkedIds: string[];
  accept: (building: CityBuilding) => boolean;
}) {
  const itemsOf = (stageId: string) => data.buildings.filter((building) => building.folder === district && building.stage === stageId);
  const firstStage = data.stages.find((item) => itemsOf(item.id).length > 0)?.id ?? null;
  const [open, setOpen] = useState<string | null>(stage ?? firstStage);
  // 從地圖或網址換了階段，就展開那一段（在 render 裡跟著 prop 調整，不用 effect）。
  const [seenStage, setSeenStage] = useState(stage);
  if (stage !== seenStage) {
    setSeenStage(stage);
    if (stage) setOpen(stage);
  }
  return (
    <div data-testid="city-mobile">
      <button type="button" className={`${control} bg-white hover:bg-[#f3f0ea]`} onClick={() => onDistrict("")}>
        回領域
      </button>
      <h2 className="mt-4 text-lg font-bold">{name}</h2>
      {data.stages.map((item) => {
        const items = itemsOf(item.id);
        const expanded = open === item.id;
        const panel = `mobile-stage-${item.id}`;
        return (
          <section key={item.id} className="mt-3" aria-labelledby={`ring-${item.id}`} data-testid="city-mobile-stage" data-stage={item.id}>
            <h3 id={`ring-${item.id}`}>
              <button
                type="button"
                className={`${control} flex w-full items-center justify-between bg-white hover:bg-[#f3f0ea]`}
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => {
                  if (expanded) {
                    setOpen(null);
                    return;
                  }
                  setOpen(item.id);
                  onStage(item.id);
                }}
              >
                <span>
                  {item.name}（{items.length}）
                </span>
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
            </h3>
            {/* 收起來的段落也留在 DOM（hidden），讓按鈕的 aria-controls 一直指得到面板。 */}
            <div id={panel} hidden={!expanded} data-testid="city-mobile-panel">
              <ul className="mt-2 space-y-2">
                {items.filter((building) => building.title && accept(building)).map((building) => (
                  <li key={building.id}>
                    <BuildingButton building={building} snapshot={snapshot} selected={selectedId === building.id} linked={linkedIds.includes(building.id)} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
              <DraftNote count={items.filter((building) => !building.title && accept(building)).length} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
