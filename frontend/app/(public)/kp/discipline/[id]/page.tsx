import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AxisBrowser } from "@/components/kp/AxisBrowser";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import {
  disciplineRoots,
  disciplineTitle,
  filterOptions,
  loadCatalog,
  toCards,
  visibleCatalog,
} from "@/lib/content";
import { KP_SITE_ORIGIN, disciplinePath, learningPathPath } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return disciplineRoots(loadCatalog()).map((root) => ({ id: root.contentFolder ?? root.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const all = loadCatalog();
  const name = disciplineTitle(all, id);
  return {
    title: { absolute: `${name}｜知識地圖` },
    description: `${name}的知識點，可再依階段、層級與核心素養篩選。`,
    openGraph: { title: `${name}｜知識地圖`, description: `${name}的知識點列表。`, url: `${KP_SITE_ORIGIN}${disciplinePath(id)}` },
  };
}

export default async function DisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = loadCatalog();
  const root = disciplineRoots(all).find((item) => item.contentFolder === id);
  if (!root) notFound();
  const visible = visibleCatalog(all);
  const points = visible.indexes.byDiscipline.get(id) ?? [];
  const options = filterOptions(all);
  const paths = all.paths.filter((path) => path.disciplineFolder === id);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <Link href="/kp" className="font-semibold underline-offset-4 hover:underline">
          知識地圖
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-bold">{disciplineTitle(all, id)}</h1>
      {root.summary ? <p className="mt-3 max-w-3xl leading-7">{root.summary}</p> : null}
      <p className="mt-3 text-sm text-[#3d3830]">這一輪 {points.length} 筆看得到的知識點。層級與階段都還在，可以一起篩。</p>
      <div className="mt-6">
        <AxisBrowser
          items={toCards(all, points)}
          stages={options.stages}
          layers={options.layers}
          competencies={options.competencies}
          emptyHint="這個學門在目前的篩選下沒有知識點。"
        />
      </div>
      <section className="mt-10" aria-labelledby="discipline-paths">
        <h2 id="discipline-paths" className="text-xl font-bold">
          主線
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {paths.map((path) => (
            <li key={path.id}>
              <Link href={learningPathPath(path.id)} className="block min-h-11 border border-[#c0bab2] bg-white p-3 hover:border-[#1a1614]">
                <span className="font-semibold">{path.title}</span>
                {path.colearn ? <span className="mt-1 block text-sm text-[#3d3830]">有家庭時間</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <LicenseNotice />
    </div>
  );
}
