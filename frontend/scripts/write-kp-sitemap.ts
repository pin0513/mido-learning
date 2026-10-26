/**
 * 產生 sitemap 用的路徑清單。草稿知識點不放進來。
 * 執行：tsx scripts/write-kp-sitemap.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../lib/content/load";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "content", "published-paths.ts");

const { errors, model } = loadContent(contentDir);
if (!model || errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const latest = model.points.reduce((max, point) => (point.updated > max ? point.updated : max), "2026-01-01");
const entries: { path: string; lastModified: string }[] = [{ path: "/kp", lastModified: latest }];

for (const root of model.taxonomy.roots) {
  if (!root.contentFolder) continue;
  entries.push({ path: `/kp/discipline/${root.contentFolder}`, lastModified: latest });
}
for (const stage of model.taxonomy.stageList) {
  entries.push({ path: `/kp/stage/${stage.id}`, lastModified: latest });
}
for (const layer of model.taxonomy.layerList) {
  entries.push({ path: `/kp/layer/${layer.id}`, lastModified: latest });
}
for (const item of model.taxonomy.coreCompetencies) {
  entries.push({ path: `/kp/competency/${item.code}`, lastModified: latest });
}

const published = model.points.filter((point) => point.status === "published");
const publishedIds = new Set(published.map((point) => point.id));
for (const path of model.paths) {
  if (!path.knowledgePointIds.some((id) => publishedIds.has(id))) continue;
  entries.push({ path: `/kp/path/${path.id}`, lastModified: latest });
}
const stagesByConcept = new Map<string, Set<string>>();
for (const point of published) {
  const stages = stagesByConcept.get(point.concept) ?? new Set<string>();
  stages.add(point.stage);
  stagesByConcept.set(point.concept, stages);
  entries.push({
    path: `/kp/${point.concept}/${point.stage}`,
    lastModified: point.updated,
  });
}
for (const [concept, stages] of [...stagesByConcept.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (stages.size < 2) continue;
  entries.push({ path: `/kp/${concept}`, lastModified: latest });
}

const body = `/** 由 scripts/write-kp-sitemap.ts 產生。草稿不列入。 */\nexport const kpSitemapEntries: { path: string; lastModified: string }[] = ${JSON.stringify(entries, null, 2)};\n`;
writeFileSync(target, body);
console.log(`sitemap entries ${entries.length}`);
