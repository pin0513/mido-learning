import type { Metadata } from "next";
import { KnowledgeHome } from "@/components/kp/home/KnowledgeHome";
import { loadCatalog } from "@/lib/content/catalog";
import { buildHomeDiagram } from "@/lib/kp/home-diagram";
import { readHomeState } from "@/lib/kp/home-state";
import { KP_SITE_ORIGIN } from "@/lib/kp/routes";

const description = "先選學門，再從上往下看。圓點是知識點，線是先學、後學。目前任務是拆解與估算。";

export const metadata: Metadata = {
  title: { absolute: "Mido Learning｜先選學門，再從上往下看" },
  description,
  alternates: { canonical: `${KP_SITE_ORIGIN}/` },
  openGraph: {
    title: "Mido Learning｜先選學門，再從上往下看",
    description,
    url: `${KP_SITE_ORIGIN}/`,
  },
};

/**
 * 學門跟節點寫在網址上（?d=、?kp=、?view=task），所以這一頁跟著請求畫。
 * 不讀 request header，版面那一層維持靜態。旗標仍由 middleware 決定要不要拿來當首頁。
 */
export default async function CityHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const model = buildHomeDiagram(loadCatalog());
  const state = readHomeState(model, {
    get(name) {
      const value = query[name];
      if (Array.isArray(value)) return value[0] ?? null;
      return value ?? null;
    },
  });
  return <KnowledgeHome model={model} state={state} />;
}
