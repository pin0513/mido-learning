import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog } from "../content/catalog";
import { buildHomeDiagram } from "./home-diagram";
import { publicDisciplineIds } from "./home-public";
import { routeWires } from "./home-wires";

const DRAFT_TITLES = [
  "部分與整體",
  "規律與關係",
  "用字母代表數：方程式",
  "認知偏誤與思考盲點",
  "統計推論：用機率檢核說法",
  "從平均變化率到瞬間變化率",
  "什麼是「專案」",
];

const DRAFT_SLUGS = ["pm.project", "ph.parts", "ph.bias", "ma.pattern", "ma.algebra", "ma.stats", "ma.rate", "pm.schedule"];

// 已發布的點才有頁面連結：ph.reason@es，B11 發布的數學 es／jh 12 點，B12 發布的數學 sh 7 點，B13 發布的數學 uni 7 點，B14 發布的資訊與 AI es／jh 12 點，B15 發布的資訊與 AI sh 7 點，B16 發布的資訊與 AI uni 6 點，以及 B17 發布的專案管理 es 5 點（專案管理的點另外在第一個測試逐一檢查）。
const PUBLISHED = new Set([
  "ph.reason@es",
  "ma.number@es", "ma.pattern@es", "ma.data@es", "ma.measure@es", "ma.shape@es", "ma.fraction@es",
  "ma.algebra@jh", "ma.coord@jh", "ma.prob@jh", "ma.pythag@jh", "ma.quadratic@jh", "ma.similar@jh",
  "ma.function@sh", "ma.proof@sh", "ma.rate@sh", "ma.sequence@sh", "ma.stats@sh", "ma.trig@sh", "ma.vector@sh",
  "ma.beauty@uni", "ma.derivative@uni", "ma.diffeq@uni", "ma.integral@uni", "ma.limit@uni", "ma.linalg@uni", "ma.probmodel@uni",
  "it.blocks@es", "it.data@es", "it.machine@es", "it.pattern@es", "it.safe@es", "it.steps@es",
  "it.algo@jh", "it.datatable@jh", "it.media@jh", "it.mlbasic@jh", "it.network@jh", "it.prog@jh",
  "it.analysis@sh", "it.build@sh", "it.ds@sh", "it.ethics@sh", "it.llm@sh", "it.ml@sh", "it.security@sh",
  "it.aisys@uni", "it.creative@uni", "it.governance@uni", "it.hcai@uni", "it.nn@uni", "it.swe@uni",
  "pm.goal@es", "pm.planb@es", "pm.retro@es", "pm.roles@es", "pm.sequence@es",
]);

test("四個學門都有學段總圖，專案管理只畫已發布的九步", () => {
  const model = buildHomeDiagram(loadCatalog());
  assert.deepEqual(publicDisciplineIds(), ["pm-leadership", "philosophy", "math", "it-ai"]);
  assert.deepEqual(
    model.disciplines.map((item) => [item.id, item.ready]),
    [
      ["pm-leadership", true],
      ["philosophy", true],
      ["math", true],
      ["it-ai", true],
    ],
  );
  assert.equal(model.defaultDisciplineId, "pm-leadership");
  const pm = model.diagrams.find((item) => item.id === "pm-leadership");
  assert.ok(pm);
  // B17 發布專案管理 es 5 點後，國小多了目標、分工、回顧、先後、B 計畫五步。
  assert.deepEqual(
    pm.nodes.map((node) => node.title),
    [
      "目標：我們想完成什麼？", "大事拆成小事", "分工與說到做到", "回顧：哪裡好、哪裡可以更好", "先做什麼、後做什麼", "如果下雨怎麼辦？",
      "時間、金錢、品質的取捨", "WBS 與三點估算", "實獲值管理（EVM）",
    ],
  );
  for (const node of pm.nodes) assert.equal(node.pageHref, `/kp/${node.id.replace("@", "/")}`, node.id);
  const pmNode = (id: string) => {
    const found = pm.nodes.find((node) => node.id === id);
    assert.ok(found, id);
    return found;
  };
  assert.equal(pmNode("pm.triangle@jh").question, "如果預算砍一半，你會犧牲時間還是品質？為什麼？");
  assert.match(pmNode("pm.triangle@jh").idea, /範疇/);
  assert.match(pmNode("pm.estimate@sh").idea, /PERT/);
  assert.match(pmNode("pm.evm@uni").idea, /CPI=EV\/AC/);
  assert.equal(pmNode("pm.estimate@sh").pageHref, "/kp/pm.estimate/sh");
  assert.deepEqual(
    pmNode("pm.breakdown@es").prerequisites.map((item) => item.title),
    ["目標：我們想完成什麼？"],
  );
  assert.deepEqual(
    pm.edges.map((edge) => `${edge.kind}:${edge.from}->${edge.to}`).sort(),
    [
      "pre:pm.breakdown@es->pm.estimate@sh",
      "pre:pm.breakdown@es->pm.roles@es",
      "pre:pm.breakdown@es->pm.sequence@es",
      "pre:pm.estimate@sh->pm.evm@uni",
      "pre:pm.goal@es->pm.breakdown@es",
      "pre:pm.roles@es->pm.retro@es",
      "pre:pm.sequence@es->pm.planb@es",
      "pre:pm.sequence@es->pm.triangle@jh",
      "pre:pm.triangle@jh->pm.estimate@sh",
    ].sort(),
  );
  const estimate = pmNode("pm.estimate@sh");
  assert.deepEqual(
    estimate.prerequisites.map((item) => item.title),
    ["大事拆成小事", "時間、金錢、品質的取捨"],
  );
  assert.equal(estimate.next?.title, "實獲值管理（EVM）");
  assert.deepEqual(estimate.also, ["哲學", "數學"]);
  for (const id of ["philosophy", "math", "it-ai"]) {
    const diagram = model.diagrams.find((item) => item.id === id);
    assert.ok(diagram);
    assert.ok(diagram.nodes.length > 4, id);
    for (const stage of ["es", "jh", "sh", "uni"]) {
      assert.ok(diagram.nodes.some((node) => node.stageId === stage), `${id} ${stage}`);
    }
    for (const node of diagram.nodes) {
      assert.ok(node.question.length > 0, node.id);
      const href = PUBLISHED.has(node.id) ? `/kp/${node.id.replace("@", "/")}` : null;
      assert.equal(node.pageHref, href, node.id);
    }
    assert.ok(diagram.edges.some((edge) => edge.kind === "pre"), id);
    assert.ok(diagram.edges.some((edge) => edge.kind === "ext"), id);
  }
  const blob = JSON.stringify(model);
  assert.equal(blob.includes("城市"), false);
  for (const title of ["什麼是「專案」", "甘特圖與里程碑", "團隊溝通與會議"]) assert.equal(blob.includes(title), false, title);
});

test("目前任務連到已畫出來的跨學門，沒畫的不帶標題", () => {
  const model = buildHomeDiagram(loadCatalog());
  assert.ok(model.task);
  assert.equal(model.task.title, "拆解與估算");
  assert.equal(model.task.steps.length, 4);
  assert.deepEqual(
    model.task.uses.map((item) => item.mention),
    ["哲學", "數學"],
  );
  const crosses = model.task.steps.flatMap((step) => step.crosses);
  const parts = crosses.find((cross) => cross.title === "部分與整體");
  const pattern = crosses.find((cross) => cross.title === "規律與關係");
  assert.ok(parts);
  assert.equal(parts.label, "哲學");
  assert.equal(parts.href, "/?d=philosophy&kp=ph.parts%40es");
  assert.ok(pattern);
  assert.equal(pattern.label, "數學");
  assert.equal(pattern.href, "/?d=math&kp=ma.pattern%40es");
  assert.equal(crosses.some((cross) => cross.label.includes("準備中")), false);

  const hidden = buildHomeDiagram(loadCatalog(), ["pm-leadership"]);
  assert.equal(hidden.disciplines.find((item) => item.id === "math")?.ready, false);
  assert.equal(hidden.diagrams.find((item) => item.id === "math")?.nodes.length, 0);
  const hiddenCrosses = hidden.task?.steps.flatMap((step) => step.crosses) ?? [];
  assert.ok(hiddenCrosses.some((cross) => cross.label === "數學 · 準備中"));
  assert.ok(hiddenCrosses.every((cross) => cross.title === null && cross.href === null));
  const blob = JSON.stringify(hidden);
  for (const title of DRAFT_TITLES) assert.equal(blob.includes(title), false, title);
  for (const slug of DRAFT_SLUGS) assert.equal(blob.includes(slug), false, slug);
  assert.equal(blob.includes("城市"), false);
  assert.equal(blob.includes("示意"), false);
});

test("虛線只拿掉實線已經到得了的，實線保持原樣", () => {
  const model = buildHomeDiagram(loadCatalog());
  const count = (id: string, kind: "pre" | "ext") =>
    model.diagrams.find((item) => item.id === id)?.edges.filter((edge) => edge.kind === kind).length ?? -1;
  // B17：pm.sequence@es 發布後，pm.breakdown@es 經 pm.sequence@es 用實線就到得了 pm.triangle@jh，主線那條虛線因此拿掉。
  assert.equal(count("pm-leadership", "pre"), 9);
  assert.equal(count("pm-leadership", "ext"), 0);
  const pm = model.diagrams.find((item) => item.id === "pm-leadership");
  assert.ok(pm);
  assert.equal(pm.edges.some((edge) => edge.from === "pm.breakdown@es" && edge.to === "pm.triangle@jh"), false);
  assert.equal(count("philosophy", "pre"), 32);
  assert.equal(count("philosophy", "ext"), 1);
  assert.equal(count("math", "pre"), 38);
  assert.equal(count("math", "ext"), 2);
  assert.equal(count("it-ai", "pre"), 37);
  assert.equal(count("it-ai", "ext"), 2);
  const math = model.diagrams.find((item) => item.id === "math");
  assert.ok(math);
  assert.equal(math.edges.some((edge) => edge.kind === "ext" && edge.from === "ma.number@es" && edge.to === "ma.quadratic@jh"), false);
  assert.equal(math.edges.some((edge) => edge.kind === "pre" && edge.from === "ma.pattern@es"), true);
});

test("主線只把相鄰的點往下連，跳過的先學不畫成一排垂直線", () => {
  const nodes = [
    { id: "pm.breakdown@es", x: 180, y: 40 },
    { id: "pm.triangle@jh", x: 180, y: 140 },
    { id: "pm.estimate@sh", x: 180, y: 240 },
    { id: "pm.evm@uni", x: 180, y: 340 },
  ];
  const edges = [
    { from: "pm.breakdown@es", to: "pm.triangle@jh", kind: "ext" as const },
    { from: "pm.triangle@jh", to: "pm.estimate@sh", kind: "pre" as const },
    { from: "pm.estimate@sh", to: "pm.evm@uni", kind: "pre" as const },
    { from: "pm.breakdown@es", to: "pm.estimate@sh", kind: "pre" as const },
  ];
  const { paths, joints } = routeWires(nodes, edges, "pm.estimate@sh");
  assert.equal(paths.length, 3);
  assert.equal(joints.length, 0);
  assert.equal(paths.some((path) => path.d.includes(" H ")), false);
  assert.equal(paths[0].kind, "link");
  assert.equal(paths[0].head, false);
  assert.equal(paths[0].tone, "dim");
  assert.equal(paths[1].kind, "pre");
  assert.equal(paths[1].head, true);
  assert.equal(paths[1].tone, "hi");
  assert.equal(paths[2].kind, "pre");
  assert.equal(paths[2].head, true);
  assert.equal(paths[2].tone, "hi");
  const blocked = routeWires(nodes, edges, null, { avoid: [{ left: 160, top: 150, right: 200, bottom: 230 }] });
  assert.equal(blocked.paths.length, 2);
  assert.equal(blocked.paths.some((path) => path.d.includes("V 224")), false);
  const split = routeWires(
    [
      { id: "a", x: 180, y: 40 },
      { id: "b", x: 180, y: 300 },
    ],
    [],
    null,
    { avoid: [{ left: 0, top: 140, right: 400, bottom: 180 }] },
  );
  assert.equal(split.paths.length, 2);
  assert.equal(split.paths[0].head, false);
  assert.equal(split.paths[1].head, false);
  assert.equal(split.paths[1].kind, "link");
  const claimed = routeWires(
    [
      { id: "a", x: 180, y: 40 },
      { id: "b", x: 180, y: 300 },
    ],
    [{ from: "a", to: "b", kind: "pre" }],
    null,
    { avoid: [{ left: 0, top: 140, right: 400, bottom: 180 }] },
  );
  assert.equal(claimed.paths[0].head, false);
  assert.equal(claimed.paths[1].head, true);
  assert.equal(claimed.paths[1].kind, "pre");
  assert.ok(split.paths.every((path) => !path.d.includes(" H ")));
});

test("先學的點都排在依賴它的點上面", () => {
  const model = buildHomeDiagram(loadCatalog());
  const stageRank: Record<string, number> = { es: 0, jh: 1, sh: 2, uni: 3 };
  for (const diagram of model.diagrams) {
    const index = new Map(diagram.nodes.map((node, position) => [node.id, position]));
    let previousRank = -1;
    for (const node of diagram.nodes) {
      const rank = stageRank[node.stageId] ?? 0;
      assert.ok(rank >= previousRank, `${diagram.id} ${node.id} 學段往回`);
      previousRank = rank;
    }
    for (const edge of diagram.edges) {
      if (edge.kind !== "pre") continue;
      const from = index.get(edge.from);
      const to = index.get(edge.to);
      assert.ok(from !== undefined && to !== undefined, `${diagram.id} ${edge.from}->${edge.to}`);
      assert.ok(from < to, `${diagram.id} ${edge.from} 應該在 ${edge.to} 上面`);
    }
  }
  const math = model.diagrams.find((item) => item.id === "math");
  assert.ok(math);
  const at = (stage: string) => math.nodes.filter((node) => node.stageId === stage).map((node) => node.title);
  const elementary = at("es");
  const junior = at("jh");
  assert.ok(elementary.indexOf("數感：大概有多少？") < elementary.indexOf("分數：把一個東西平分"));
  assert.ok(elementary.indexOf("數感：大概有多少？") < elementary.indexOf("規律與關係"));
  assert.ok(elementary.indexOf("數感：大概有多少？") < elementary.indexOf("測量與單位"));
  assert.ok(junior.indexOf("用字母代表數：方程式") < junior.indexOf("坐標與直線"));
  assert.ok(junior.indexOf("坐標與直線") < junior.indexOf("二次函數與拋物線"));
});

test("溝通與解決問題預設不進學門切換，打開後只有口語表達", () => {
  const closed = buildHomeDiagram(loadCatalog());
  assert.equal(closed.disciplines.some((item) => item.id === "soft-skills" || item.id === "language"), false);
  assert.equal(closed.branches.length, 0);
  const blob = JSON.stringify(closed);
  assert.equal(blob.includes("說話讓人聽得清楚"), false);
  assert.equal(blob.includes("說出感覺：我覺得……因為……"), false);

  const open = buildHomeDiagram(loadCatalog(), publicDisciplineIds(), true);
  assert.deepEqual(
    open.disciplines.map((item) => item.id),
    ["pm-leadership", "philosophy", "math", "it-ai", "language", "soft-skills"],
  );
  assert.equal(open.disciplines.find((item) => item.id === "language")?.ready, false);
  assert.equal(open.disciplines.find((item) => item.id === "language")?.title, "語文");
  assert.deepEqual(open.branches.map((item) => [item.id, item.ready]), [
    ["talk", true],
    ["emp", false],
    ["solve", false],
  ]);
  const talk = open.diagrams.find((item) => item.branchId === "talk");
  assert.ok(talk);
  assert.deepEqual(talk.nodes.map((node) => node.id), [
    "sk.voice@es", "sk.point@es", "sk.showtell@es",
    "sk.audience@jh", "sk.speech@jh", "sk.discuss@jh",
    "sk.consensus@sh", "sk.present@sh", "sk.qa@sh",
    "sk.persuade@uni", "sk.facilitate@uni",
  ]);
  assert.equal(talk.nodes.every((node) => node.pageHref?.startsWith("/kp/sk.")), true);
  const point = talk.nodes.find((node) => node.id === "sk.point@es");
  assert.ok(point);
  assert.equal(point.priors.some((prior) => prior.label.includes("說出理由") && prior.href), true);
  assert.equal(point.priors.some((prior) => prior.href == null && prior.label.startsWith("準備中")), false);
  const discuss = talk.nodes.find((node) => node.id === "sk.discuss@jh");
  assert.ok(discuss);
  assert.ok(discuss.priors.some((prior) => prior.href == null && prior.label.includes("準備中")));
  assert.equal(JSON.stringify(discuss.priors).includes("專心聽，再說回來"), false);
  const emp = open.diagrams.find((item) => item.branchId === "emp");
  const solve = open.diagrams.find((item) => item.branchId === "solve");
  assert.equal(emp?.nodes.length, 0);
  assert.equal(solve?.nodes.length, 0);
  const openBlob = JSON.stringify(open);
  assert.equal(openBlob.includes("說出感覺：我覺得……因為……"), false);
  assert.equal(openBlob.includes("問五次為什麼"), false);
  assert.equal(open.branches.find((item) => item.id === "talk")?.task?.title, "從開口到說服");
  assert.equal(open.disciplines.find((item) => item.id === "language")?.ready, false);
  assert.equal(open.branches.some((item) => item.disciplineId === "language"), false);
});

test("語文打開後十一條線都有點，關掉時不進圖", () => {
  const catalog = loadCatalog();
  const closed = buildHomeDiagram(catalog, publicDisciplineIds(), true, false);
  assert.equal(JSON.stringify(closed).includes("zh.punct@es"), false);
  assert.equal(closed.disciplines.find((item) => item.id === "language")?.ready, false);

  const open = buildHomeDiagram(catalog, publicDisciplineIds(), true, true);
  assert.equal(open.disciplines.find((item) => item.id === "language")?.ready, true);
  const diagrams = open.diagrams.filter((item) => item.id === "language");
  assert.deepEqual(diagrams.map((item) => item.branchId), [
    "basic", "read", "classic", "write", "practical", "ai",
    "en-talk", "en-read", "en-bench", "ja-read", "ja-talk",
  ]);
  const seen = new Set<string>();
  for (const diagram of diagrams) {
    assert.ok(diagram.nodes.length > 0 && diagram.nodes.length <= 14, `${diagram.branchId} ${diagram.nodes.length}`);
    for (const node of diagram.nodes) seen.add(node.id);
  }
  assert.equal(seen.size, 108);
  const bench = diagrams.find((item) => item.branchId === "en-bench");
  assert.ok(bench);
  assert.equal(bench.nodes.filter((node) => node.badge === "英日共用").length, 4);
  assert.equal(diagrams.find((item) => item.branchId === "basic")?.nodes.some((node) => node.badge), false);
  assert.equal(open.branches.find((item) => item.id === "en-talk")?.task?.title, "從打招呼到看圖說話");
  assert.equal(open.branches.find((item) => item.id === "basic")?.task?.id, "zh.basics");
  const talk = open.diagrams.find((item) => item.id === "soft-skills" && item.branchId === "talk");
  assert.equal(talk?.nodes[0]?.id, "sk.voice@es");
});
