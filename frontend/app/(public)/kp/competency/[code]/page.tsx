import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AxisBrowser } from "@/components/kp/AxisBrowser";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { filterOptions, loadCatalog, toCards, visibleCatalog } from "@/lib/content";
import { KP_SITE_ORIGIN, competencyPath } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCatalog().taxonomy.coreCompetencies.map((item) => ({ code: item.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const item = loadCatalog().taxonomy.coreCompetencies.find((entry) => entry.code === code);
  const name = item ? `${item.code} ${item.name}` : code;
  return {
    title: { absolute: `${name}｜知識地圖` },
    description: `核心素養 ${name} 對到的知識點。只含有課綱對應的內容。`,
    openGraph: { title: `${name}｜知識地圖`, description: `核心素養 ${name}。`, url: `${KP_SITE_ORIGIN}${competencyPath(code)}` },
  };
}

export default async function CompetencyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const all = loadCatalog();
  const item = all.taxonomy.coreCompetencies.find((entry) => entry.code === code);
  if (!item) notFound();
  const points = visibleCatalog(all).indexes.byCompetency.get(code) ?? [];
  const options = filterOptions(all);
  const empty =
    points.length === 0
      ? `目前沒有知識點把 ${item.code} ${item.name} 標成核心素養。代碼只收到 A1–C3，之後補上就會出現在這裡。`
      : "這個篩選沒有知識點。";
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <Link href="/kp" className="font-semibold underline-offset-4 hover:underline">
          知識地圖
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-bold">
        {item.code} {item.name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#3d3830]">
        {item.facet}。大學知識點沒有課綱區塊，不會列在核心素養頁。
      </p>
      <div className="mt-6">
        <AxisBrowser
          items={toCards(all, points)}
          stages={options.stages}
          folders={options.folders}
          layers={options.layers}
          emptyHint={empty}
        />
      </div>
      <LicenseNotice />
    </div>
  );
}
