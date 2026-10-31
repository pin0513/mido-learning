import { test, expect, type APIRequestContext } from "@playwright/test";
import { join } from "node:path";
import { loadContent } from "../lib/content/load";
import type { KnowledgePoint } from "../lib/content/types";
import { FOLDER_FLAG, flagEnv, folderLaunched } from "./folder-flags";

/**
 * 正式站的執行時旗標（docs/kp-db-restructure.md 第 17.5 節）＋V2：不帶草稿的 build，
 * 執行時打開 KP_ENABLED、KP_HOME_ENABLED、KP_SOFTSKILLS_ENABLED、KP_YUWEN_ENABLED，再加 KP_DETAIL_V2_ENABLED。
 * 只在 E2E_V2_BUILD_FLAGS_OFF=1（build 時 KP_* 全關）或有給 E2E_BUILD_FLAGS（build 時用的旗標，格式同 deploy-frontend.yml 的 KP_BUILD_FLAGS）的行程跑。
 *
 * 靜態詳細頁在 build 時看學門旗標：build 時關掉的學門，它的已發布點在別學門的頁面上不連。
 * V2「學習順序」的「另有 N 個尚未發布」只能算真的草稿（status 不是 published）；
 * 已發布、只因 build 時旗標關而不連的點不算（第 17.1 節問題 2）。修正前 ph.argument@jh 會寫「另有 1 個尚未發布」（其實是已發布的 sk.speech@jh）。
 * build 時學門全開（正式 image，#68 起）就沒有被擋的點：改查跨學門的已發布點都有連結、也沒有「尚未發布」誤報。
 *
 * 樣本每次從 content/ 算，不寫死。
 */
const buildFlagsGiven = process.env.E2E_BUILD_FLAGS !== undefined;
const enabled = process.env.E2E_V2_BUILD_FLAGS_OFF === "1" || buildFlagsGiven;
/** build 時的旗標；E2E_V2_BUILD_FLAGS_OFF=1 而沒給 E2E_BUILD_FLAGS 時是 {}（全關）。 */
const BUILD_ENV = flagEnv(process.env.E2E_BUILD_FLAGS);

const contentDir = join(process.cwd(), "content");
const { errors, model } = loadContent(contentDir);
if (errors.length > 0 || !model) throw new Error(errors.join("\n") || "content 載入失敗");
const points = model.points;
const byId = new Map(points.map((point) => [point.id, point]));
const requiredBy = new Map<string, string[]>();
for (const point of points) {
  for (const prereq of point.prerequisites) requiredBy.set(prereq, [...(requiredBy.get(prereq) ?? []), point.id]);
}

/** build 時這個學門有沒有打開（catalog.ts 的 isFolderLaunched，用 build 時的旗標算）。 */
function launchedAtBuild(folder: string): boolean {
  return folderLaunched(folder, BUILD_ENV);
}

function href(point: KnowledgePoint): string {
  return `/kp/${point.concept}/${point.stage}`;
}

function linkedFrom(q: KnowledgePoint, folder: string): boolean {
  return q.status === "published" && (launchedAtBuild(q.folder) || q.folder === folder);
}

interface List {
  shown: KnowledgePoint[];
  /** shown 裡跨學門、而且屬於有學門旗標（溝通與解決問題、語文）的點：build 時旗標開才會連。 */
  crossShown: KnowledgePoint[];
  drafts: KnowledgePoint[];
  flagHidden: KnowledgePoint[];
}

function list(ids: string[], folder: string): List {
  const known = ids.map((id) => byId.get(id)).filter((q): q is KnowledgePoint => Boolean(q));
  return {
    shown: known.filter((q) => linkedFrom(q, folder)),
    crossShown: known.filter((q) => linkedFrom(q, folder) && q.folder !== folder && !folderLaunched(q.folder, {})),
    drafts: known.filter((q) => q.status !== "published"),
    flagHidden: known.filter((q) => q.status === "published" && !linkedFrom(q, folder)),
  };
}

/**
 * V2 SeqPanel 的兩個清單：先學（prerequisites）與後學（完整內容的 requiredBy）。
 * 樣本是清單裡有「build 時被旗標擋掉的已發布點」，或有「跨學門、要學門旗標才會連的已發布點」的已發布點；
 * build 全關時前者有樣本，build 全開時後者有樣本（正好是 #68 補上連結的那些點）。
 */
const SAMPLES = points
  .filter((point) => point.status === "published")
  .map((point) => ({ point, lists: [list(point.prerequisites, point.folder), list(requiredBy.get(point.id) ?? [], point.folder)] }))
  .filter((sample) => sample.lists.some((row) => row.flagHidden.length > 0 || row.crossShown.length > 0));
const BLOCKED = SAMPLES.flatMap(({ point, lists }) => lists.flatMap((row) => row.flagHidden).map((q) => ({ point, q })));
const CROSS = SAMPLES.flatMap(({ point, lists }) => lists.flatMap((row) => row.crossShown).map((q) => ({ point, q })));

async function page(request: APIRequestContext, path: string): Promise<{ status: number; html: string }> {
  const res = await request.get(path);
  return { status: res.status(), html: (await res.text()).replaceAll("<!-- -->", "") };
}

/** 只看「學習順序」那一段，避免和三圈裡的連結區塊混在一起。 */
function seqSection(html: string): string {
  const start = html.indexOf("<h2>學習順序</h2>");
  expect(start, "找不到「學習順序」").toBeGreaterThanOrEqual(0);
  const end = html.indexOf("</section>", start);
  return html.slice(start, end);
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

test.describe("V2＋正式站執行時旗標（build 時旗標看 E2E_BUILD_FLAGS，沒給是全關）", () => {
  test.skip(!enabled, "只在 E2E_V2_BUILD_FLAGS_OFF=1 或有給 E2E_BUILD_FLAGS 的行程跑");

  test("前提：執行時旗標開、詳細頁是 V2、build 時旗標和 E2E_BUILD_FLAGS 一致", async ({ request }) => {
    const launch = await (await request.get("/api/kp-launch")).json();
    expect(launch).toMatchObject({ enabled: true, home: true });
    // 執行時旗標：middleware 放行已發布的軟實力與語文點。
    const sk = points.find((point) => point.folder === "soft-skills" && point.status === "published");
    const zh = points.find((point) => point.folder === "language" && point.status === "published");
    for (const point of [sk, zh]) {
      expect(point).toBeTruthy();
      const res = await page(request, href(point!));
      expect(res.status, point!.id).toBe(200);
      expect(res.html, point!.id).toContain("v2-seq");
    }
    // 至少有一個樣本，而且第一個被擋的點真的沒連、第一個跨學門的點真的有連；
    // 不然下面的檢查就不是在測這份 build（例如說是全開 build，其實是全關，或反過來）。
    expect(SAMPLES.length).toBeGreaterThan(0);
    const allOn = Object.keys(FOLDER_FLAG).every(launchedAtBuild);
    if (allOn) {
      expect(BLOCKED.length, "build 學門全開，不該有被擋的點").toBe(0);
      expect(CROSS.length, "build 學門全開，應該有跨學門的連結").toBeGreaterThan(0);
    } else {
      expect(BLOCKED.length, "build 有學門關著，應該有被擋的點").toBeGreaterThan(0);
    }
    for (const { point, q } of [BLOCKED[0], CROSS[0]].filter(Boolean)) {
      const seq = seqSection((await page(request, href(point))).html);
      if (launchedAtBuild(q.folder)) expect(seq, `${point.id} → ${q.id}`).toContain(`href="${href(q)}"`);
      else expect(seq, `${point.id} → ${q.id}`).not.toContain(`href="${href(q)}"`);
    }
  });

  test("學習順序的「尚未發布」只算草稿，不算被旗標擋掉的已發布點", async ({ request }) => {
    test.info().annotations.push({
      type: "samples",
      description: SAMPLES.map(({ point, lists }) =>
        `${point.id}（擋：${lists.flatMap((row) => row.flagHidden).map((q) => q.id).join("、") || "無"}；跨學門：${lists.flatMap((row) => row.crossShown).map((q) => q.id).join("、") || "無"}；草稿：${lists.flatMap((row) => row.drafts).map((q) => q.id).join("、") || "無"}）`,
      ).join("；"),
    });
    for (const { point, lists } of SAMPLES) {
      const res = await page(request, href(point));
      expect(res.status, point.id).toBe(200);
      expect(res.html, point.id).toContain("v2-seq");
      const seq = seqSection(res.html);
      const expected = lists.filter((row) => row.drafts.length > 0).map((row) => `另有 ${row.drafts.length} 個尚未發布`);
      // 提示的則數與每則的數字都要對；修正前被擋的已發布點會多算一則或把數字加大。
      expect(count(seq, "尚未發布"), `${point.id}：${expected.join("、") || "不該有提示"}`).toBe(expected.length);
      for (const notice of expected) expect(seq, `${point.id} ${notice}`).toContain(notice);
      // 標題跟著清單：清單裡只有被旗標擋掉的點（沒有可連的點、也沒有草稿）時，清單不畫，「先學」「後學」也不畫。
      ["先學", "後學"].forEach((label, i) => {
        const row = lists[i];
        const skipped = row.shown.length === 0 && row.drafts.length === 0 && row.flagHidden.length > 0;
        expect(count(seq, `<span class="v2-lbl">${label}</span>`), `${point.id} ${label}${skipped ? "（清單略過）" : ""}`).toBe(skipped ? 0 : 1);
      });
      for (const row of lists) {
        for (const q of row.shown) expect(seq, `${point.id} → ${q.id}`).toContain(`href="${href(q)}"`);
        for (const q of row.flagHidden) expect(seq, `${point.id} → ${q.id}`).not.toContain(`href="${href(q)}"`);
        for (const q of row.drafts) {
          expect(seq, `${point.id} ${q.id}`).not.toContain(`href="${href(q)}"`);
          expect(seq, `${point.id} ${q.id}`).not.toContain(q.title);
        }
      }
    }
  });
});
