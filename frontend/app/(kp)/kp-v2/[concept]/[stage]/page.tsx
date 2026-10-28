import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KpDetailV2 } from "@/components/kp/v2/KpDetailV2";
import { loadCatalog, stageName, visibleCatalog } from "@/lib/content";
import { kpDescription, kpTitle } from "@/lib/kp/meta";
import { knowledgePointUrl } from "@/lib/kp/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  const visible = visibleCatalog(loadCatalog());
  return visible.points.map((point) => ({ concept: point.concept, stage: point.stage }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string; stage: string }>;
}): Promise<Metadata> {
  const { concept, stage } = await params;
  const all = loadCatalog();
  const point = visibleCatalog(all).points.find((item) => item.concept === concept && item.stage === stage);
  if (!point) return { title: "知識點" };
  const stageLabel = stageName(all, point.stage);
  const title = kpTitle(point.title, stageLabel);
  const description = kpDescription(point.title, stageLabel, point.idea);
  const canonical = knowledgePointUrl(point.concept, point.stage);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: point.status === "published" ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [{ url: "/images/logo.png", alt: "Mido Learning" }],
    },
  };
}

export default async function KnowledgePointV2Page({
  params,
}: {
  params: Promise<{ concept: string; stage: string }>;
}) {
  const { concept, stage } = await params;
  const all = loadCatalog();
  const visible = visibleCatalog(all);
  const point = visible.points.find((item) => item.concept === concept && item.stage === stage);
  if (!point) notFound();
  return <KpDetailV2 point={point} all={all} visible={visible} />;
}
