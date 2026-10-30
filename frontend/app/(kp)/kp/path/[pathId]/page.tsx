import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearningPathView } from "@/components/kp/LearningPathView";
import { loadCatalog, visibleCatalog } from "@/lib/content";
import { KP_SITE_ORIGIN, learningPathPath } from "@/lib/kp/routes";

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
  return <LearningPathView path={full} all={all} visible={visibleCatalog(all)} />;
}
