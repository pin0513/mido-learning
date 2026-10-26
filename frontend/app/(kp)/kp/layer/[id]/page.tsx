import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AxisBrowser } from "@/components/kp/AxisBrowser";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { filterOptions, layerName, loadCatalog, toCards, visibleCatalog } from "@/lib/content";
import { KP_SITE_ORIGIN } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCatalog().taxonomy.layerList.map((layer) => ({ id: layer.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = layerName(loadCatalog(), id);
  return {
    title: { absolute: `${name}｜知識地圖` },
    description: `${name}這一層的知識點，橫向仍可依國小到大學篩選。層級不會被其他總覽取代。`,
    openGraph: { title: `${name}｜知識地圖`, description: `${name}的知識點。`, url: `${KP_SITE_ORIGIN}/kp/layer/${id}` },
  };
}

export default async function LayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = loadCatalog();
  const layer = all.taxonomy.layerList.find((item) => item.id === id);
  if (!layer) notFound();
  const points = visibleCatalog(all).indexes.byLayer.get(id) ?? [];
  const options = filterOptions(all);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <Link href="/kp" className="font-semibold underline-offset-4 hover:underline">
          知識地圖
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-bold">{layer.name}</h1>
      <p className="mt-3 max-w-3xl leading-7">{layer.role}</p>
      <p className="mt-2 text-sm text-[#3d3830]">順序是本質、基礎、進階、應用。這一層目前 {points.length} 筆。</p>
      <div className="mt-6">
        <AxisBrowser
          items={toCards(all, points)}
          stages={options.stages}
          folders={options.folders}
          competencies={options.competencies}
          emptyHint={
            points.length === 0
              ? `${layer.name}已經在學科樹裡，這一輪還沒有知識點掛上來。層級頁仍留著。`
              : "這個篩選沒有知識點。"
          }
        />
      </div>
      <LicenseNotice />
    </div>
  );
}
