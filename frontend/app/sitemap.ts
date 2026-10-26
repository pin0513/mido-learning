import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { kpSitemapEntries } from "@/lib/content/published-paths";
import { isKpEnabled } from "@/lib/kp/flags";
import { KP_SITE_ORIGIN } from "@/lib/kp/routes";

export const dynamic = "force-dynamic";

/** 只列知識地圖。KP_ENABLED 關掉時是空的，草稿永遠不列。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await headers();
  if (!isKpEnabled()) return [];
  return kpSitemapEntries.map((entry) => ({
    url: `${KP_SITE_ORIGIN}${entry.path}`,
    lastModified: entry.lastModified,
  }));
}
