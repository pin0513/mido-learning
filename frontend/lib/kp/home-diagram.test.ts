import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog } from "../content/catalog";
import { buildHomeDiagram } from "./home-diagram";
import { routeWires } from "./home-wires";

const DRAFT_TITLES = [
  "部分與整體",
  "規律與關係",
  "用字母代表數：方程式",
  "認知偏誤與思考盲點",
  "統計推論：抽樣與信賴",
  "從平均變化率到瞬間變化率",
  "目標：我們想完成什麼",
];

const DRAFT_SLUGS = ["pm.goal", "ph.parts", "ph.bias", "ma.pattern", "ma.algebra", "ma.stats", "ma.rate", "pm.schedule"];

test("學段總圖只畫已發布的點，先學實線、延伸虛線", () => {
  const model = buildHomeDiagram(loadCatalog());
  assert.deepEqual(
    model.disciplines.map((item) => [item.id, item.ready]),
    [
      ["pm-leadership", true],
      ["philosophy", false],
      ["math", false],
      ["it-ai", false],
    ],
  );
  assert.equal(model.defaultDisciplineId, "pm-leadership");
  const pm = model.diagrams.find((item) => item.id === "pm-leadership");
  assert.ok(pm);
  assert.deepEqual(
    pm.nodes.map((node) => node.title),
    ["大事拆成小事", "時間、金錢、品質的取捨", "WBS 與三點估算", "實獲值管理（EVM）"],
  );
  assert.equal(pm.nodes[1].question, "如果預算砍一半，你會犧牲時間還是品質？為什麼？");
  assert.match(pm.nodes[1].idea, /範疇/);
  assert.match(pm.nodes[2].idea, /PERT/);
  assert.match(pm.nodes[3].idea, /CPI=EV\/AC/);
  assert.deepEqual(
    pm.edges.map((edge) => `${edge.kind}:${edge.from}->${edge.to}`).sort(),
    [
      "ext:pm.breakdown@es->pm.triangle@jh",
      "pre:pm.breakdown@es->pm.estimate@sh",
      "pre:pm.estimate@sh->pm.evm@uni",
      "pre:pm.triangle@jh->pm.estimate@sh",
    ].sort(),
  );
  const estimate = pm.nodes[2];
  assert.deepEqual(
    estimate.prerequisites.map((item) => item.title),
    ["大事拆成小事", "時間、金錢、品質的取捨"],
  );
  assert.equal(estimate.next?.title, "實獲值管理（EVM）");
  assert.deepEqual(estimate.also, ["哲學", "數學"]);
  for (const diagram of model.diagrams) {
    if (diagram.id === "pm-leadership") continue;
    assert.equal(diagram.nodes.length, 0);
    assert.equal(diagram.edges.length, 0);
  }
});

test("目前任務的跨學門草稿不帶標題", () => {
  const model = buildHomeDiagram(loadCatalog());
  assert.ok(model.task);
  assert.equal(model.task.title, "拆解與估算");
  assert.equal(model.task.steps.length, 4);
  assert.deepEqual(
    model.task.uses.map((item) => item.mention),
    ["哲學", "數學"],
  );
  const labels = model.task.steps.flatMap((step) => step.crosses.map((cross) => cross.label));
  assert.ok(labels.includes("哲學 · 準備中"));
  assert.ok(labels.includes("數學 · 準備中"));
  for (const cross of model.task.steps.flatMap((step) => step.crosses)) {
    assert.equal(cross.title, null);
    assert.equal(cross.href, null);
  }
  const blob = JSON.stringify(model);
  for (const title of DRAFT_TITLES) assert.equal(blob.includes(title), false, title);
  for (const slug of DRAFT_SLUGS) assert.equal(blob.includes(slug), false, slug);
  assert.equal(blob.includes("城市"), false);
  assert.equal(blob.includes("示意"), false);
});

test("跳過中間學段的先學走直角，轉角有接點", () => {
  const nodes = [
    { id: "pm.breakdown@es", x: 232, y: 59 },
    { id: "pm.triangle@jh", x: 232, y: 189 },
    { id: "pm.estimate@sh", x: 232, y: 319 },
    { id: "pm.evm@uni", x: 232, y: 449 },
  ];
  const edges = [
    { from: "pm.breakdown@es", to: "pm.triangle@jh", kind: "ext" as const },
    { from: "pm.triangle@jh", to: "pm.estimate@sh", kind: "pre" as const },
    { from: "pm.estimate@sh", to: "pm.evm@uni", kind: "pre" as const },
    { from: "pm.breakdown@es", to: "pm.estimate@sh", kind: "pre" as const },
  ];
  const { paths, joints } = routeWires(nodes, edges, "pm.estimate@sh");
  const elbow = paths.find((path) => path.d.includes(" H "));
  assert.ok(elbow);
  assert.equal(elbow.kind, "pre");
  assert.equal(elbow.tone, "hi");
  assert.equal(joints.length, 2);
  assert.equal(paths.filter((path) => path.kind === "ext")[0].tone, "dim");
  assert.equal(paths.filter((path) => !path.d.includes(" H ")).length, 3);
});
