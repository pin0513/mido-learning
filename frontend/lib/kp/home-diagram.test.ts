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
  "統計推論：抽樣與信賴",
  "從平均變化率到瞬間變化率",
  "目標：我們想完成什麼",
];

const DRAFT_SLUGS = ["pm.goal", "ph.parts", "ph.bias", "ma.pattern", "ma.algebra", "ma.stats", "ma.rate", "pm.schedule"];

test("四個學門都有學段總圖，專案管理仍只有已發布的四步", () => {
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
  assert.deepEqual(
    pm.nodes.map((node) => node.title),
    ["大事拆成小事", "時間、金錢、品質的取捨", "WBS 與三點估算", "實獲值管理（EVM）"],
  );
  assert.equal(pm.nodes[1].question, "如果預算砍一半，你會犧牲時間還是品質？為什麼？");
  assert.match(pm.nodes[1].idea, /範疇/);
  assert.match(pm.nodes[2].idea, /PERT/);
  assert.match(pm.nodes[3].idea, /CPI=EV\/AC/);
  assert.equal(pm.nodes[2].pageHref, "/kp/pm.estimate/sh");
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
  for (const id of ["philosophy", "math", "it-ai"]) {
    const diagram = model.diagrams.find((item) => item.id === id);
    assert.ok(diagram);
    assert.ok(diagram.nodes.length > 4, id);
    for (const stage of ["es", "jh", "sh", "uni"]) {
      assert.ok(diagram.nodes.some((node) => node.stageId === stage), `${id} ${stage}`);
    }
    for (const node of diagram.nodes) {
      assert.ok(node.question.length > 0, node.id);
      assert.equal(node.pageHref, null, node.id);
    }
    assert.ok(diagram.edges.some((edge) => edge.kind === "pre"), id);
    assert.ok(diagram.edges.some((edge) => edge.kind === "ext"), id);
  }
  const blob = JSON.stringify(model);
  assert.equal(blob.includes("城市"), false);
  assert.equal(blob.includes("目標：我們想完成什麼"), false);
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
  assert.equal(count("pm-leadership", "pre"), 3);
  assert.equal(count("pm-leadership", "ext"), 1);
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

test("平行的垂直線至少隔 7px，而且避開學段名稱", () => {
  const nodes = [0, 1, 2, 3, 4, 5].map((index) => ({ id: `n${index}`, x: 140, y: 40 + index * 90 }));
  const edges = [
    { from: "n0", to: "n2", kind: "pre" as const },
    { from: "n0", to: "n3", kind: "pre" as const },
    { from: "n1", to: "n4", kind: "pre" as const },
    { from: "n1", to: "n5", kind: "pre" as const },
  ];
  const obstacle = { left: 16, top: 150, right: 120, bottom: 190 };
  const { paths } = routeWires(nodes, edges, null, { obstacles: [obstacle], minGap: 7 });
  const verticals = new Set<number>();
  for (const path of paths) {
    const tokens = path.d.split(/\s+/);
    let x = 0;
    let y = 0;
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token === "M") {
        x = Number(tokens[index + 1]);
        y = Number(tokens[index + 2]);
        index += 2;
      } else if (token === "H") {
        x = Number(tokens[index + 1]);
        index += 1;
      } else if (token === "V") {
        const next = Number(tokens[index + 1]);
        if (Math.abs(next - y) > 24) verticals.add(x);
        const top = Math.min(y, next);
        const bot = Math.max(y, next);
        const overlaps = x >= obstacle.left && x <= obstacle.right && bot > obstacle.top && top < obstacle.bottom;
        assert.equal(overlaps, false, path.d);
        y = next;
        index += 1;
      }
    }
  }
  const xs = [...verticals].sort((a, b) => a - b);
  assert.ok(xs.length >= 2);
  for (let index = 1; index < xs.length; index += 1) {
    assert.ok(xs[index] - xs[index - 1] >= 7, xs.join(","));
  }
});
