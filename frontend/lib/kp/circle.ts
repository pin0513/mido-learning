import type { ContentCatalog } from "../content/catalog";
import type { CirclePart, KnowledgePoint } from "../content/types";

export type CircleKind = "why" | "how" | "what";

export type Block =
  | { kind: "paragraphs"; texts: string[] }
  | { kind: "questions"; items: string[] }
  | { kind: "uses"; title?: string; items: { title: string; text: string; code?: string }[] }
  | { kind: "methods"; items: { title: string; text: string; example?: string }[] }
  | { kind: "checklist"; title?: string; items: string[] }
  | { kind: "scenario"; title?: string; caption?: string; text?: string; figureId?: string }
  | { kind: "review"; text: string }
  | { kind: "ai"; delegable: string[]; human: string[] }
  | { kind: "figure"; id: string; notes?: string[] }
  | { kind: "figureQa"; figureId: string; question: string; answer: string }
  | { kind: "qa"; question: string; answer: string }
  | { kind: "links"; ids: string[] }
  | { kind: "formats"; items: { label: string; text: string }[] }
  | { kind: "notes"; items: string[] }
  | { kind: "placeholder"; text: string };

export type Circle = {
  kind: CircleKind;
  heading: string;
  converted: boolean;
  blocks: Block[];
};

const PREFIX: Record<CircleKind, string> = {
  why: "為什麼學",
  how: "怎麼學",
  what: "學什麼",
};

const PLACEHOLDER = "這一圈內容補強中";

function knownIds(ids: string[], catalog: ContentCatalog): string[] {
  return ids.filter((id) => catalog.indexes.byId.has(id));
}

/** 全形冒號切成三段以上時，前兩段當標題，其餘當圖說。否則整段當內文。 */
export function splitScenario(text: string): { title?: string; caption?: string; text?: string } {
  const parts = text.split("：");
  if (parts.length >= 3 && parts[0] && parts[1]) {
    return { title: `${parts[0]}：${parts[1]}`, caption: parts.slice(2).join("：") };
  }
  return { text };
}

function exerciseDuplicate(point: KnowledgePoint): string | null {
  if (!point.goal || !point.review) return null;
  return `目標：${point.goal}　檢核：${point.review}`;
}

function fallbackWhy(point: KnowledgePoint, catalog: ContentCatalog): Block[] {
  const blocks: Block[] = [];
  if (point.guidingQuestions.length > 0) blocks.push({ kind: "questions", items: point.guidingQuestions });
  const ids = knownIds(point.links.why, catalog);
  if (ids.length > 0) blocks.push({ kind: "links", ids });
  return blocks;
}

function fallbackHow(point: KnowledgePoint, catalog: ContentCatalog): Block[] {
  const blocks: Block[] = [];
  if (point.scenario) blocks.push({ kind: "scenario", text: point.scenario });
  if (point.review) blocks.push({ kind: "review", text: point.review });
  if (point.delegable.length > 0 || point.humanExperience.length > 0) {
    blocks.push({ kind: "ai", delegable: point.delegable, human: point.humanExperience });
  }
  const ids = knownIds(point.links.how, catalog);
  if (ids.length > 0) blocks.push({ kind: "links", ids });
  return blocks;
}

function fallbackWhat(point: KnowledgePoint, catalog: ContentCatalog): Block[] {
  const blocks: Block[] = [];
  const formats: { label: string; text: string }[] = [];
  const skipExercise = exerciseDuplicate(point);
  const rows: Array<[string, string | undefined]> = [
    ["文章", point.article],
    ["練習", point.exercise],
    ["作品", point.project],
    ["遊戲", point.game],
    ["問 AI", point.aiPrompt],
  ];
  for (const [label, text] of rows) {
    if (!text) continue;
    if (label === "練習" && text === skipExercise) continue;
    formats.push({ label, text });
  }
  if (point.slides.length > 0) formats.push({ label: "投影片", text: `這一點有 ${point.slides.length} 份投影片教材。` });
  if (formats.length > 0) blocks.push({ kind: "formats", items: formats });
  const ids = knownIds(point.links.related, catalog);
  if (ids.length > 0) blocks.push({ kind: "links", ids });
  if (blocks.length === 0) blocks.push({ kind: "placeholder", text: PLACEHOLDER });
  return blocks;
}

function convertedWhy(part: CirclePart, point: KnowledgePoint): Block[] {
  const blocks: Block[] = [];
  if (part.body.length > 0) blocks.push({ kind: "paragraphs", texts: part.body });
  const paired = new Set<string>();
  const compareId = part.figures.find((id) => point.figures?.find((figure) => figure.id === id && figure.type === "compare"));
  if (compareId && part.qa) {
    blocks.push({ kind: "figureQa", figureId: compareId, question: part.qa.question, answer: part.qa.answer });
    paired.add(compareId);
  } else if (part.qa) {
    blocks.push({ kind: "qa", question: part.qa.question, answer: part.qa.answer });
  }
  for (const id of part.figures) {
    if (!paired.has(id)) blocks.push({ kind: "figure", id });
  }
  if (part.items.length > 0) {
    const block: Extract<Block, { kind: "uses" }> = {
      kind: "uses",
      items: part.items.map((item) => {
        const row: { title: string; text: string; code?: string } = { title: item.title, text: item.text };
        if (item.code) row.code = item.code;
        return row;
      }),
    };
    if (part.itemsTitle) block.title = part.itemsTitle;
    blocks.push(block);
  }
  if (part.notes.length > 0) blocks.push({ kind: "notes", items: part.notes });
  return blocks;
}

function convertedHow(part: CirclePart, point: KnowledgePoint): Block[] {
  const blocks: Block[] = [];
  if (part.body.length > 0) blocks.push({ kind: "paragraphs", texts: part.body });
  for (const id of part.figures) {
    if (id !== part.activityFigure) blocks.push({ kind: "figure", id });
  }
  if (part.items.length > 0) {
    if (part.items.some((item) => item.example)) {
      blocks.push({
        kind: "methods",
        items: part.items.map((item) => {
          const row: { title: string; text: string; example?: string } = { title: item.title, text: item.text };
          if (item.example) row.example = item.example;
          return row;
        }),
      });
    } else {
      const block: Extract<Block, { kind: "uses" }> = {
        kind: "uses",
        items: part.items.map((item) => {
          const row: { title: string; text: string; code?: string } = { title: item.title, text: item.text };
          if (item.code) row.code = item.code;
          return row;
        }),
      };
      if (part.itemsTitle) block.title = part.itemsTitle;
      blocks.push(block);
    }
  }
  if (part.checklist.length > 0) {
    const block: Extract<Block, { kind: "checklist" }> = { kind: "checklist", items: part.checklist };
    if (part.checklistTitle) block.title = part.checklistTitle;
    blocks.push(block);
  }
  if (point.scenario || part.activityFigure) {
    const scenario: Extract<Block, { kind: "scenario" }> = { kind: "scenario" };
    if (point.scenario) {
      const split = splitScenario(point.scenario);
      if (split.title) scenario.title = split.title;
      if (split.caption) scenario.caption = split.caption;
      if (split.text) scenario.text = split.text;
    }
    if (part.activityFigure) scenario.figureId = part.activityFigure;
    blocks.push(scenario);
  }
  if (point.review) blocks.push({ kind: "review", text: point.review });
  if (point.delegable.length > 0 || point.humanExperience.length > 0) {
    blocks.push({ kind: "ai", delegable: point.delegable, human: point.humanExperience });
  }
  return blocks;
}

function convertedWhat(part: CirclePart, point: KnowledgePoint): Block[] {
  const blocks: Block[] = [];
  const lastId = part.figures[part.figures.length - 1];
  const last = point.figures?.find((figure) => figure.id === lastId);
  const notesOnLast = last?.type === "tone_chart" && part.notes.length > 0;
  part.figures.forEach((id, index) => {
    const block: Extract<Block, { kind: "figure" }> = { kind: "figure", id };
    if (notesOnLast && index === part.figures.length - 1) block.notes = part.notes;
    blocks.push(block);
  });
  if (!notesOnLast && part.notes.length > 0) blocks.push({ kind: "notes", items: part.notes });
  return blocks;
}

function oneCircle(
  kind: CircleKind,
  part: CirclePart | undefined,
  point: KnowledgePoint,
  catalog: ContentCatalog,
): Circle {
  if (!part) {
    const blocks = kind === "why" ? fallbackWhy(point, catalog) : kind === "how" ? fallbackHow(point, catalog) : fallbackWhat(point, catalog);
    return { kind, heading: PREFIX[kind], converted: false, blocks };
  }
  const blocks = kind === "why" ? convertedWhy(part, point) : kind === "how" ? convertedHow(part, point) : convertedWhat(part, point);
  return { kind, heading: part.heading, converted: true, blocks };
}

/**
 * 三圈都有才算已轉換。缺的圈用既有欄位補。
 * 連結只留 catalog 裡找得到的 id。頁面應傳入可見的 catalog，草稿就不會被連出去。
 */
export function buildCircles(point: KnowledgePoint, catalog: ContentCatalog): { circles: Circle[]; converted: boolean } {
  const circles = [
    oneCircle("why", point.why, point, catalog),
    oneCircle("how", point.how, point, catalog),
    oneCircle("what", point.what, point, catalog),
  ];
  return { circles, converted: circles.every((circle) => circle.converted) };
}
