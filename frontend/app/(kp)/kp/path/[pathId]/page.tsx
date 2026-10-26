import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColearnCard } from "@/components/kp/ColearnCard";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { layerName, loadCatalog, stageName, visibleCatalog } from "@/lib/content";
import { KP_SITE_ORIGIN, disciplinePath, knowledgePointPath, learningPathPath } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCatalog().paths.map((path) => ({ pathId: path.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ pathId: string }> }): Promise<Metadata> {
  const { pathId } = await params;
  const path = loadCatalog().indexes.pathsById.get(pathId);
  if (!path) return { title: "主線" };
  return {
    title: { absolute: `${path.title}｜知識地圖` },
    description: path.colearn ? `${path.title}。${path.colearn}`.slice(0, 160) : `${path.title}，依階段由淺到深。`,
    openGraph: {
      title: `${path.title}｜知識地圖`,
      description: path.title,
      url: `${KP_SITE_ORIGIN}${learningPathPath(pathId)}`,
    },
  };
}

export default async function LearningPathPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const all = loadCatalog();
  const full = all.indexes.pathsById.get(pathId);
  if (!full) notFound();
  const visible = visibleCatalog(all);
  const shown = visible.indexes.pathsById.get(pathId);
  const ids = shown?.knowledgePointIds ?? [];
  const hidden = full.knowledgePointIds.length - ids.length;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <Link href="/kp" className="font-semibold underline-offset-4 hover:underline">
          知識地圖
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={disciplinePath(full.disciplineFolder)} className="font-semibold underline-offset-4 hover:underline">
          {full.disciplineTitle}
        </Link>
      </nav>
      <h1 className="display" style={{ marginTop: 16 }}>{full.title}</h1>
      <p className="mt-3">
        <span className="sample">範例資料</span>
      </p>
      <p className="mt-3">順序跟 paths 檔案一樣，由淺到深。每一站都標層級與階段。</p>
      {hidden > 0 ? <p className="mt-3 text-sm">還有 {hidden} 筆尚未發布，正式站先不列出。</p> : null}
      {ids.length === 0 ? (
        <p className="mt-6 border border-dashed border-[#8a847a] p-4 text-sm">這條主線的知識點都還沒發布。</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {ids.map((id, index) => {
            const point = visible.indexes.byId.get(id);
            if (!point) return null;
            const nextId = ids[index + 1];
            const next = nextId ? visible.indexes.byId.get(nextId) : undefined;
            const deeper = Boolean(next && point.links.deeper.includes(next.id));
            return (
              <li key={id} className="border border-[#c0bab2] bg-white p-4">
                <p className="text-xs font-semibold text-[#3d3830]">
                  {index + 1}. {layerName(all, point.layer)} · {stageName(all, point.stage)}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  <Link href={knowledgePointPath(point.concept, point.stage)} className="underline-offset-4 hover:underline">
                    {point.title}
                  </Link>
                </h2>
                <p className="mt-2 leading-7">{point.idea}</p>
                {next ? (
                  <p className="mt-3 text-sm text-[#3d3830]">{deeper ? "下一個深度" : "接著"}：{next.title}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {full.colearn ? (
        <ColearnCard
          pathTitle={full.title}
          pathHref={`/kp/path/${full.id}`}
          colearn={full.colearn}
          questions={visible.indexes.byId.get(ids[0] ?? "")?.guidingQuestions ?? []}
          scenario={visible.indexes.byId.get(ids[0] ?? "")?.scenario ?? ""}
        />
      ) : null}
      <LicenseNotice />
    </div>
  );
}
