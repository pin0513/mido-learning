import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { kpSitemapEntries } from "@/lib/content/published-paths";
import { isKpEnabled, isSoftSkillsEnabled, isYuwenEnabled } from "@/lib/kp/flags";
import { KP_SITE_ORIGIN } from "@/lib/kp/routes";

export const dynamic = "force-dynamic";

/** 只列知識地圖。KP_ENABLED 關掉時是空的，草稿永遠不列。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await headers();
  if (!isKpEnabled()) return [];
  const entries = kpSitemapEntries.filter((entry) => {
    if (!isSoftSkillsEnabled() && isSoftSkillsSitemapPath(entry.path)) return false;
    if (!isYuwenEnabled() && isLanguageSitemapPath(entry.path)) return false;
    return true;
  });
  return entries.map((entry) => ({
    url: `${KP_SITE_ORIGIN}${entry.path}`,
    lastModified: entry.lastModified,
  }));
}

function isSoftSkillsSitemapPath(path: string): boolean {
  return path === "/kp/discipline/soft-skills"
    || path.startsWith("/kp/path/sk.")
    || path.startsWith("/kp/sk.")
    || path.startsWith("/kp/sk/");
}

function isLanguageSitemapPath(path: string): boolean {
  return path === "/kp/discipline/language"
    || path.startsWith("/kp/path/zh.")
    || path.startsWith("/kp/path/en.")
    || path.startsWith("/kp/path/ja.")
    || path.startsWith("/kp/path/lg.")
    || path.startsWith("/kp/zh.")
    || path.startsWith("/kp/zh/")
    || path.startsWith("/kp/en.")
    || path.startsWith("/kp/en/")
    || path.startsWith("/kp/ja.")
    || path.startsWith("/kp/ja/")
    || path.startsWith("/kp/lg.")
    || path.startsWith("/kp/lg/");
}
