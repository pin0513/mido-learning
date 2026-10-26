import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadCatalog, stageName, visibleCatalog } from "@/lib/content";
import { conceptPath, knowledgePointPath } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  const concepts = new Set(visibleCatalog(loadCatalog()).points.map((point) => point.concept));
  return [...concepts].map((concept) => ({ concept }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}): Promise<Metadata> {
  const { concept } = await params;
  return {
    title: { absolute: `${concept}｜知識地圖` },
    description: `同一個概念在不同階段的知識點：${concept}。`,
    alternates: { canonical: `https://learn.paulfun.net${conceptPath(concept)}` },
  };
}

export default async function ConceptPage({ params }: { params: Promise<{ concept: string }> }) {
  const { concept } = await params;
  const all = loadCatalog();
  const points = visibleCatalog(all).points.filter((point) => point.concept === concept);
  if (points.length === 0) notFound();
  if (points.length === 1) {
    const only = points[0];
    if (only) redirect(knowledgePointPath(only.concept, only.stage));
  }
  const ordered = [...points].sort(
    (a, b) => (all.taxonomy.stages.get(a.stage)?.rank ?? 0) - (all.taxonomy.stages.get(b.stage)?.rank ?? 0),
  );
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{concept}</h1>
      <p className="mt-3 text-sm leading-6">這個概念目前有多個階段。</p>
      <ul className="mt-6 grid gap-3">
        {ordered.map((point) => (
          <li key={point.id}>
            <Link
              href={knowledgePointPath(point.concept, point.stage)}
              className="block min-h-11 border border-[#c0bab2] bg-white p-4 font-semibold hover:border-[#1a1614]"
            >
              {stageName(all, point.stage)} · {point.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
