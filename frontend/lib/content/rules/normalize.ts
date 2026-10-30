/**
 * 把符合 schema 形狀的知識點物件（YAML 解析結果，或之後由資料庫修訂版轉回的物件）
 * 讀成頁面用的型別。只讀不驗，驗證在 point.ts。
 */
import type { CirclePart, KnowledgeFigure, KnowledgeSource } from "../types";
import { asStringArray, isRecord } from "./util";

export function readOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readSources(value: unknown): KnowledgeSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources: KnowledgeSource[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string") continue;
    const source: KnowledgeSource = {
      title: item.title,
      publisher: typeof item.publisher === "string" ? item.publisher : "",
      url: typeof item.url === "string" ? item.url : "",
      accessed: typeof item.accessed === "string" ? item.accessed : "",
      kind: typeof item.kind === "string" ? item.kind : "",
      supports: typeof item.supports === "string" ? item.supports : "",
    };
    if (typeof item.id === "string") source.id = item.id;
    sources.push(source);
  }
  return sources;
}

function readFigure(item: Record<string, unknown>): KnowledgeFigure | null {
  if (typeof item.id !== "string" || typeof item.type !== "string") return null;
  const alt = typeof item.alt === "string" ? item.alt : "";
  const source = readOptionalText(item.source);
  const title = readOptionalText(item.title);
  const caption = readOptionalText(item.caption);
  const unknown = (): KnowledgeFigure => {
    const figure: KnowledgeFigure = { id: item.id as string, type: "unknown", rawType: item.type as string, alt };
    if (source) figure.source = source;
    return figure;
  };
  if (item.type === "compare" && Array.isArray(item.items)) {
    const relation = item.relation === "equal" || item.relation === "versus" || item.relation === "not_equal" ? item.relation : "not_equal";
    const items: CompareItems = [];
    for (const row of item.items) {
      if (!isRecord(row) || typeof row.term !== "string") continue;
      const parsed: CompareItems[number] = { term: row.term };
      const reading = readOptionalText(row.reading);
      const note = readOptionalText(row.note);
      if (reading) parsed.reading = reading;
      if (note) parsed.note = note;
      items.push(parsed);
    }
    const figure: KnowledgeFigure = { id: item.id, type: "compare", alt, relation, items };
    if (source) figure.source = source;
    if (title) figure.title = title;
    if (caption) figure.caption = caption;
    return figure;
  }
  if (item.type === "flow" && Array.isArray(item.steps)) {
    const steps: { actor?: string; text: string }[] = [];
    for (const step of item.steps) {
      if (!isRecord(step) || typeof step.text !== "string") continue;
      const parsed: { actor?: string; text: string } = { text: step.text };
      const actor = readOptionalText(step.actor);
      if (actor) parsed.actor = actor;
      steps.push(parsed);
    }
    const figure: KnowledgeFigure = { id: item.id, type: "flow", alt, steps };
    if (source) figure.source = source;
    if (title) figure.title = title;
    if (caption) figure.caption = caption;
    return figure;
  }
  if (item.type === "spelling" && Array.isArray(item.rows)) {
    const tones = new Set(["", "ˊ", "ˇ", "ˋ", "˙"]);
    const rows: SpellingRows = [];
    for (const row of item.rows) {
      if (!isRecord(row) || typeof row.kind !== "string" || typeof row.result !== "string") continue;
      const tone = typeof row.tone === "string" && tones.has(row.tone) ? row.tone : "";
      rows.push({
        kind: row.kind,
        initial: typeof row.initial === "string" ? row.initial : "",
        medial: typeof row.medial === "string" ? row.medial : "",
        final: typeof row.final === "string" ? row.final : "",
        tone: tone as SpellingRows[number]["tone"],
        result: row.result,
      });
    }
    const figure: KnowledgeFigure = { id: item.id, type: "spelling", alt, rows };
    if (source) figure.source = source;
    if (title) figure.title = title;
    if (caption) figure.caption = caption;
    return figure;
  }
  if (item.type === "tone_chart" && Array.isArray(item.tones)) {
    const marks = new Set(["ˉ", "ˊ", "ˇ", "ˋ", "˙"]);
    const contours = new Set(["high_level", "rising", "dipping", "falling", "neutral"]);
    const tones: ToneRows = [];
    for (const tone of item.tones) {
      if (!isRecord(tone) || typeof tone.name !== "string" || typeof tone.example !== "string" || typeof tone.reading !== "string") continue;
      if (typeof tone.mark !== "string" || !marks.has(tone.mark)) continue;
      if (typeof tone.contour !== "string" || !contours.has(tone.contour)) continue;
      const parsed: ToneRows[number] = {
        name: tone.name,
        mark: tone.mark as ToneRows[number]["mark"],
        contour: tone.contour as ToneRows[number]["contour"],
        example: tone.example,
        reading: tone.reading,
      };
      const alias = readOptionalText(tone.alias);
      if (alias) parsed.alias = alias;
      tones.push(parsed);
    }
    const figure: KnowledgeFigure = { id: item.id, type: "tone_chart", alt, tones };
    if (source) figure.source = source;
    if (title) figure.title = title;
    if (caption) figure.caption = caption;
    return figure;
  }
  if (item.type === "symbol_grid" && Array.isArray(item.groups)) {
    const groups: { name: string; symbols: string[] }[] = [];
    for (const group of item.groups) {
      if (!isRecord(group) || typeof group.name !== "string" || !Array.isArray(group.symbols)) continue;
      const symbols = group.symbols.filter((symbol): symbol is string => typeof symbol === "string");
      groups.push({ name: group.name, symbols });
    }
    const figure: KnowledgeFigure = { id: item.id, type: "symbol_grid", alt, groups };
    if (source) figure.source = source;
    if (title) figure.title = title;
    if (caption) figure.caption = caption;
    if (isRecord(item.highlight) && Array.isArray(item.highlight.symbols) && typeof item.highlight.label === "string") {
      figure.highlight = {
        symbols: item.highlight.symbols.filter((symbol): symbol is string => typeof symbol === "string"),
        label: item.highlight.label,
      };
    }
    return figure;
  }
  return unknown();
}

type CompareItems = Extract<KnowledgeFigure, { type: "compare" }>["items"];
type SpellingRows = Extract<KnowledgeFigure, { type: "spelling" }>["rows"];
type ToneRows = Extract<KnowledgeFigure, { type: "tone_chart" }>["tones"];

export function readFigures(value: unknown): KnowledgeFigure[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const figures: KnowledgeFigure[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const figure = readFigure(item);
    if (figure) figures.push(figure);
  }
  return figures;
}

export function readCircle(value: unknown): CirclePart | undefined {
  if (!isRecord(value) || typeof value.heading !== "string") return undefined;
  const items: CirclePart["items"] = [];
  if (Array.isArray(value.items)) {
    for (const item of value.items) {
      if (!isRecord(item) || typeof item.title !== "string" || typeof item.text !== "string") continue;
      const parsed: CirclePart["items"][number] = { title: item.title, text: item.text };
      if (typeof item.example === "string") parsed.example = item.example;
      if (typeof item.code === "string") parsed.code = item.code;
      items.push(parsed);
    }
  }
  const circle: CirclePart = {
    heading: value.heading,
    body: asStringArray(value.body) ?? [],
    sources: asStringArray(value.sources) ?? [],
    items,
    checklist: asStringArray(value.checklist) ?? [],
    figures: asStringArray(value.figures) ?? [],
    notes: asStringArray(value.notes) ?? [],
  };
  const itemsTitle = readOptionalText(value.items_title);
  const checklistTitle = readOptionalText(value.checklist_title);
  if (itemsTitle) circle.itemsTitle = itemsTitle;
  if (checklistTitle) circle.checklistTitle = checklistTitle;
  if (typeof value.activity_figure === "string") circle.activityFigure = value.activity_figure;
  if (
    isRecord(value.qa) &&
    typeof value.qa.question === "string" &&
    typeof value.qa.answer === "string" &&
    typeof value.qa.source === "string"
  ) {
    circle.qa = { question: value.qa.question, answer: value.qa.answer, source: value.qa.source };
  }
  return circle;
}

export function circleHasContent(raw: Record<string, unknown>): boolean {
  return (
    (Array.isArray(raw.body) && raw.body.length > 0) ||
    (Array.isArray(raw.items) && raw.items.length > 0) ||
    (Array.isArray(raw.checklist) && raw.checklist.length > 0) ||
    (Array.isArray(raw.figures) && raw.figures.length > 0) ||
    (Array.isArray(raw.notes) && raw.notes.length > 0)
  );
}
