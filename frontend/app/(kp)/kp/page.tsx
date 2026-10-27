import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LayerStageMatrix } from "@/components/kp/LayerStageMatrix";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import {
  disciplineTitle,
  launchedCatalog,
  loadCatalog,
  stageName,
  visibleCatalog,
} from "@/lib/content";
import { isSoftSkillsEnabled } from "@/lib/kp/flags";
import { KP_SITE_ORIGIN, competencyPath, disciplinePath, learningPathPath, stagePath } from "@/lib/kp/routes";

const shell = "mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6";
const card =
  "block min-h-11 border border-[#c0bab2] bg-white p-4 transition-colors hover:border-[#1a1614] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]";

export const metadata: Metadata = {
  title: { absolute: "知識地圖｜學門、層級與階段" },
  description:
    "Mido Learning 知識地圖。縱向是本質、基礎、進階、應用，橫向是國小到大學，也可以從學門或核心素養進入。收錄於知識地圖。",
  openGraph: {
    title: "知識地圖｜學門、層級與階段",
    description: "從層級、階段、學門與核心素養進入 Mido Learning 的知識點。",
    url: `${KP_SITE_ORIGIN}/kp`,
  },
};

export default async function KnowledgeMapPage() {
  await headers();
  const all = loadCatalog();
  const visible = launchedCatalog(visibleCatalog(all));
  const roots = all.taxonomy.roots
    .filter((root) => root.contentFolder && root.idPrefix)
    .filter((root) => isSoftSkillsEnabled() || root.contentFolder !== "soft-skills");
  if (roots.length === 0) notFound();

  const countCell = (layerId: string, stageId: string) =>
    visible.points.filter((point) => point.layer === layerId && point.stage === stageId).length;

  return (
    <div className={shell}>
      <h1 className="text-3xl font-bold sm:text-4xl">知識地圖</h1>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/kp/map" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
          打開知識地圖
        </Link>
        <Link href="/kp/map?view=system" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
          層級總圖
        </Link>
        <Link href="/kp/map?view=list" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
          清單
        </Link>
      </p>
      <p className="mt-4 max-w-3xl leading-7">
        知識點掛在兩個方向上：縱向是層級（本質、基礎、進階、應用），橫向是階段（國小、國中、高中、大學）。學門與核心素養是另外兩條進入的路，不會取代這張層級表。
      </p>

      <section className="mt-8" aria-labelledby="kp-matrix-heading">
        <h2 id="kp-matrix-heading" className="text-xl font-bold">
          層級 × 階段
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#3d3830]">數字是目前看得到的知識點。0 也留著，代表這個位子還在。</p>
        <div className="mt-4">
          <LayerStageMatrix
            layers={all.taxonomy.layerList}
            stages={all.taxonomy.stageList.map((stage) => ({ id: stage.id, name: stage.name }))}
            count={countCell}
          />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="kp-discipline-heading">
        <h2 id="kp-discipline-heading" className="text-xl font-bold">
          學門
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {roots.map((root) => {
            const folder = root.contentFolder ?? root.id;
            const points = visible.indexes.byDiscipline.get(folder) ?? [];
            return (
              <li key={folder}>
                <Link href={disciplinePath(folder)} className={card}>
                  <span className="block text-lg font-bold">{disciplineTitle(all, folder)}</span>
                  {root.summary ? <span className="mt-1 block text-sm leading-6 text-[#3d3830]">{root.summary}</span> : null}
                  <span className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {all.taxonomy.stageList.map((stage) => (
                      <span key={stage.id} className="border border-[#e5e3de] px-2 py-2">
                        {stage.name} {points.filter((point) => point.stage === stage.id).length}
                      </span>
                    ))}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2 text-xs text-[#3d3830]">
                    {all.taxonomy.layerList.map((layer) => (
                      <span key={layer.id} className="border border-[#e5e3de] px-2 py-1">
                        {layer.name} {points.filter((point) => point.layer === layer.id).length}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="kp-stage-heading">
        <h2 id="kp-stage-heading" className="text-xl font-bold">
          階段
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {all.taxonomy.stageList.map((stage) => (
            <li key={stage.id}>
              <Link href={stagePath(stage.id)} className={card}>
                <span className="block font-bold">{stage.name}</span>
                <span className="mt-1 block text-sm">{(visible.indexes.byStage.get(stage.id) ?? []).length} 筆</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="kp-competency-heading">
        <h2 id="kp-competency-heading" className="text-xl font-bold">
          核心素養
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#3d3830]">只收到有課綱對應的知識點。大學不掛 A1–C3，所以不會出現在這裡。</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {all.taxonomy.coreCompetencies.map((item) => {
            const total = (visible.indexes.byCompetency.get(item.code) ?? []).length;
            return (
              <li key={item.code}>
                <Link href={competencyPath(item.code)} className={card}>
                  <span className="block font-bold">
                    {item.code} {item.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#3d3830]">{item.facet}</span>
                  <span className="mt-2 block text-sm">{total} 筆</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="kp-paths-heading">
        <h2 id="kp-paths-heading" className="text-xl font-bold">
          學習主線
        </h2>
        <div className="mt-4 grid gap-6">
          {roots.map((root) => {
            const folder = root.contentFolder ?? root.id;
            const paths = all.paths.filter((path) => path.disciplineFolder === folder);
            return (
              <div key={folder}>
                <h3 className="font-semibold">{disciplineTitle(all, folder)}</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {paths.map((path) => (
                    <li key={path.id}>
                      <Link href={learningPathPath(path.id)} className={card}>
                        <span className="font-semibold">{path.title}</span>
                        {path.colearn ? <span className="mt-1 block text-sm text-[#3d3830]">有家庭時間</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <LicenseNotice />
      <p className="sr-only">階段名稱對照：{all.taxonomy.stageList.map((stage) => stageName(all, stage.id)).join("、")}</p>
    </div>
  );
}
