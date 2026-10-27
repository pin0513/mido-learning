import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AxisBrowser } from "@/components/kp/AxisBrowser";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { filterOptions, launchedCatalog, loadCatalog, stageName, toCards, visibleCatalog } from "@/lib/content";
import { isSoftSkillsEnabled } from "@/lib/kp/flags";
import { KP_SITE_ORIGIN, stagePath } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCatalog().taxonomy.stageList.map((stage) => ({ id: stage.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = stageName(loadCatalog(), id);
  return {
    title: { absolute: `${name}｜知識地圖` },
    description: `${name}階段的知識點，可再依學門、層級與核心素養篩選。`,
    openGraph: { title: `${name}｜知識地圖`, description: `${name}的知識點。`, url: `${KP_SITE_ORIGIN}${stagePath(id)}` },
  };
}

export default async function StagePage({ params }: { params: Promise<{ id: string }> }) {
  await headers();
  const { id } = await params;
  const all = loadCatalog();
  const stage = all.taxonomy.stages.get(id);
  if (!stage) notFound();
  const visible = launchedCatalog(visibleCatalog(all));
  const points = visible.indexes.byStage.get(id) ?? [];
  const options = filterOptions(all);
  if (!isSoftSkillsEnabled()) options.folders = options.folders.filter((folder) => folder.id !== "soft-skills");
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <Link href="/kp" className="font-semibold underline-offset-4 hover:underline">
          知識地圖
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-bold">{stage.name}</h1>
      <p className="mt-3 text-sm leading-6 text-[#3d3830]">
        {stage.curriculum108 ? "這個階段屬於 108 課綱，頁面上只顯示領域與 A1–C3。" : "大學不填 108 課綱，改以學門與層級對應。"}
      </p>
      <div className="mt-6">
        <AxisBrowser
          items={toCards(all, points)}
          folders={options.folders}
          layers={options.layers}
          competencies={options.competencies}
          emptyHint={`${stage.name}目前沒有看得到的知識點。`}
        />
      </div>
      <LicenseNotice />
    </div>
  );
}
