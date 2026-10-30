import { test, expect, type APIRequestContext } from "@playwright/test";
import { join } from "node:path";
import { loadContent } from "../lib/content/load";
import type { KnowledgePoint } from "../lib/content/types";

/**
 * 不帶草稿的 build，build 與執行時都打開溝通與解決問題旗標（E2E_PUBLISHED_SOFTSKILLS=1）。
 * 旗標關閉的正式 build 在 kp-published-only.spec.ts：那裡的軟實力草稿同時因「草稿」與「旗標關閉」兩個原因不露出。
 * 這裡旗標打開，軟實力的已發布點與 /kp/sk.* 都看得到，所以草稿不露出只可能是草稿過濾的結果。
 *
 * 樣本不寫死：每次從 content/ 算出「連到草稿的已發布點」與「含草稿的主線」。
 * B25–B28 把軟實力草稿發布完後樣本會變少；沒有樣本的檢查改成 skip（報表上看得到），不會空跑成通過。
 * 不靠真實草稿的長期守門在 components/kp/hidden-notice.test.ts（合成內容）。
 *
 * 同一份 build 跑兩次：舊版詳細頁，以及 E2E_DETAIL_V2=1（行程多開 KP_DETAIL_V2_ENABLED，/kp/概念/學段 改寫到 V2）。
 * 語文旗標關閉，language 的點在別的學門頁上也算「尚未發布」，跟正式頁同一套規則。
 */
const enabled = process.env.E2E_PUBLISHED_SOFTSKILLS === "1";
const v2 = process.env.E2E_DETAIL_V2 === "1";

// Playwright 從 frontend/ 執行（playwright.config.ts 所在）。
const contentDir = join(process.cwd(), "content");
const { errors, model } = loadContent(contentDir);
if (errors.length > 0 || !model) throw new Error(errors.join("\n") || "content 載入失敗");
// catalog.ts 用 import.meta，Playwright 的 CJS 轉譯載不進來；這裡只需要 byId 與 requiredBy，自己建（同 buildIndexes）。
const all = {
  points: model.points,
  paths: model.paths,
  indexes: {
    byId: new Map(model.points.map((point) => [point.id, point])),
    requiredBy: new Map<string, string[]>(),
  },
};
for (const point of model.points) {
  for (const prereq of point.prerequisites) all.indexes.requiredBy.set(prereq, [...(all.indexes.requiredBy.get(prereq) ?? []), point.id]);
}
const byId = all.indexes.byId;

function href(point: KnowledgePoint): string {
  return `/kp/${point.concept}/${point.stage}`;
}

/** 這個行程裡，從 folder 的頁面看 q 會不會連出去：已發布，而且學門已上線（語文關）或同學門。 */
function shownFrom(q: KnowledgePoint, folder: string): boolean {
  return q.status === "published" && (q.folder !== "language" || q.folder === folder);
}

const published = all.points.filter((point) => point.status === "published");
const servedPublished = published.filter((point) => point.folder !== "language");
const skDrafts = all.points.filter((point) => point.folder === "soft-skills" && point.status === "draft");
const skPublished = published.filter((point) => point.folder === "soft-skills");

interface Sample {
  point: KnowledgePoint;
  /** 這頁應該出現的提示（每個有隱藏筆數的清單一則）。 */
  notices: string[];
  /** 這頁連到、但不能露出的草稿。 */
  drafts: KnowledgePoint[];
}

function hiddenIn(ids: string[], folder: string): KnowledgePoint[] {
  return ids.map((id) => byId.get(id)).filter((q): q is KnowledgePoint => Boolean(q) && !shownFrom(q!, folder));
}

/** 和 KnowledgePointView（舊版）與 SeqPanel（V2）同一套算法：舊版算先備與四種 links；V2 算先學與後學（後學讀完整內容的 requiredBy）。 */
function samples(): Sample[] {
  const out: Sample[] = [];
  for (const point of servedPublished) {
    const lists = v2
      ? [point.prerequisites, all.indexes.requiredBy.get(point.id) ?? []]
      : [point.prerequisites, point.links.why, point.links.how, point.links.related, point.links.deeper];
    const notices: string[] = [];
    const drafts = new Map<string, KnowledgePoint>();
    for (const ids of lists) {
      const hidden = hiddenIn(ids, point.folder);
      if (hidden.length > 0) notices.push(v2 ? `另有 ${hidden.length} 個尚未發布` : `另有 ${hidden.length} 個知識點尚未發布`);
      for (const q of hidden) if (q.status === "draft") drafts.set(q.id, q);
    }
    // 舊版的「把這裡當先備」只列看得到的點，草稿後學不計數；但它們的標題與網址也不能出現。
    for (const id of all.indexes.requiredBy.get(point.id) ?? []) {
      const q = byId.get(id);
      if (q && q.status === "draft") drafts.set(q.id, q);
    }
    const skDraftsHere = [...drafts.values()].filter((q) => q.folder === "soft-skills");
    if (skDraftsHere.length > 0) out.push({ point, notices, drafts: skDraftsHere });
  }
  return out;
}

const SAMPLES = samples();
const PATHS = all.paths
  .filter((path) => path.disciplineFolder !== "language")
  .map((path) => ({ path, drafts: path.knowledgePointIds.map((id) => byId.get(id)).filter((q): q is KnowledgePoint => Boolean(q) && q!.status !== "published") }))
  .filter((row) => row.drafts.length > 0);

async function page(request: APIRequestContext, path: string): Promise<{ status: number; html: string }> {
  const res = await request.get(path);
  // React 在相鄰文字節點之間插 <!-- -->（「另有 <!-- -->1<!-- --> 個…」），比對前拿掉。
  return { status: res.status(), html: (await res.text()).replaceAll("<!-- -->", "") };
}

test.describe("正式 build＋溝通與解決問題旗標打開", () => {
  test.skip(!enabled, "只在 E2E_PUBLISHED_SOFTSKILLS=1 的行程跑");

  test("旗標在 build 與執行時都是開的（之後的負向檢查才不是靠旗標）", async ({ request }) => {
    const launch = await (await request.get("/api/kp-launch")).json();
    expect(launch).toMatchObject({ enabled: true, home: true });

    // index.json 每次請求重算：執行時旗標開，軟實力已發布點都在，語文不在。
    const index = (await (await request.get("/kp/index.json")).json()) as { id: string }[];
    expect(index.map((row) => row.id).sort()).toEqual(servedPublished.map((point) => point.id).sort());
    expect(skPublished.length).toBeGreaterThan(0);

    // 執行時旗標：middleware 放行 /kp/sk.*。
    for (const point of skPublished) {
      const res = await page(request, href(point));
      expect(res.status, point.id).toBe(200);
      expect(res.html, point.id).toContain(point.title);
    }

    // build 時旗標：別學門的已發布頁把已發布的軟實力點當連結畫出來（旗標關的 build 不會有）。
    const cross = servedPublished.flatMap((point) =>
      (all.indexes.requiredBy.get(point.id) ?? [])
        .map((id) => byId.get(id))
        .filter((q): q is KnowledgePoint => Boolean(q) && q!.folder === "soft-skills" && q!.status === "published" && point.folder !== "soft-skills")
        .map((q) => [point, q] as const),
    );
    expect(cross.length).toBeGreaterThan(0);
    for (const [point, q] of cross) {
      const res = await page(request, href(point));
      expect(res.status, point.id).toBe(200);
      expect(res.html, `${point.id} → ${q.id}`).toContain(`href="${href(q)}"`);
      expect(res.html, `${point.id} → ${q.id}`).toContain(q.title);
      if (v2) expect(res.html, point.id).toContain("v2-seq");
      else expect(res.html, point.id).toContain("kp-prereq-heading");
    }
  });

  test("軟實力草稿頁 404：旗標開著，只剩草稿過濾", async ({ request }) => {
    test.skip(skDrafts.length === 0, "軟實力已沒有草稿；草稿過濾由 hidden-notice.test.ts 的合成內容守住");
    for (const draft of skDrafts) {
      const res = await page(request, href(draft));
      expect(res.status, draft.id).toBe(404);
      expect(res.html, draft.id).not.toContain(draft.title);
    }
  });

  test("連到軟實力草稿的已發布頁：寫出筆數，不露出草稿標題與網址", async ({ request }) => {
    test.skip(SAMPLES.length === 0, "沒有已發布點連到軟實力草稿；提示由 hidden-notice.test.ts 守住");
    test.info().annotations.push({ type: "samples", description: SAMPLES.map((s) => `${s.point.id}（${s.notices.join("、") || "不計數"}；${s.drafts.map((d) => d.id).join("、")}）`).join("；") });
    // 該有提示的樣本，下面逐筆斷言提示要在。剩下的樣本都「不計數」時（例如只剩舊版「把這裡當先備」的草稿後學），
    // 不算失敗：寫出原因，負向檢查照跑（每個樣本至少有 1 個軟實力草稿，不會空跑）；計數提示另由 hidden-notice.test.ts 的合成內容守住。
    if (!SAMPLES.some((sample) => sample.notices.length > 0)) {
      test.info().annotations.push({ type: "no-notice", description: "剩下的樣本都不計數：這一則只做草稿不露出的負向檢查，計數提示由 hidden-notice.test.ts 守住" });
    }
    expect(SAMPLES.every((sample) => sample.drafts.length > 0)).toBe(true);
    for (const { point, notices, drafts } of SAMPLES) {
      const res = await page(request, href(point));
      expect(res.status, point.id).toBe(200);
      expect(res.html, point.id).toContain(point.title);
      for (const notice of notices) expect(res.html, `${point.id} ${notice}`).toContain(notice);
      for (const draft of drafts) {
        expect(res.html, `${point.id} ${draft.id}`).not.toContain(`href="${href(draft)}"`);
        expect(res.html, `${point.id} ${draft.id}`).not.toContain(draft.title);
      }
    }
  });

  test("含草稿的主線：寫出筆數，草稿不列、不連", async ({ request }) => {
    test.skip(PATHS.length === 0, "沒有含草稿的主線；主線頁的提示由 hidden-notice.test.ts 守住");
    test.info().annotations.push({ type: "paths", description: PATHS.map((row) => `${row.path.id} ${row.drafts.length}/${row.path.knowledgePointIds.length}`).join("、") });
    for (const { path, drafts } of PATHS) {
      const res = await page(request, `/kp/path/${path.id}`);
      expect(res.status, path.id).toBe(200);
      expect(res.html, path.id).toContain(`還有 ${drafts.length} 筆尚未發布，正式站先不列出。`);
      if (drafts.length === path.knowledgePointIds.length) expect(res.html, path.id).toContain("這條主線的知識點都還沒發布。");
      for (const draft of drafts) {
        expect(res.html, `${path.id} ${draft.id}`).not.toContain(`href="${href(draft)}"`);
        expect(res.html, `${path.id} ${draft.id}`).not.toContain(draft.title);
      }
    }
  });
});
