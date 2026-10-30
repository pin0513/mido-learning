/**
 * 黃金圈一圈（why／how／what）與 Markdown 互轉。格式見 docs/kp-db-restructure.md 第 4 節。
 *
 * ```
 * ## 標題
 *
 * 第一段（body）
 *
 * :::qa{source="scrum-guide"}
 * ### 問題（必須是 guiding_questions 其中一題）
 * 回答
 * :::
 *
 * :::items{title="四步做"}
 * - 項目標題 {code="涯 Ca-V-2"}
 *   項目內容
 *   > 例子
 * :::
 *
 * :::checklist{title="每輪檢查"}
 * - 檢查項目
 * :::
 *
 * ::figure{#agile-flow role="activity"}
 * ::figure{#agile-compare}
 *
 * :::notes
 * 補充說明
 * :::
 *
 * [^scrum-guide] [^zonghe]
 * ```
 *
 * 每個值佔一行。值是空字串、含換行、前後有空白、或開頭是 `# : - > [ \ { * + |` 時，
 * 整行寫成 `\` 加上 JSON 字串，讀回來一字不差。屬性值一律是 JSON 字串。
 * 不允許原始 HTML 由規則與 RichText 處理（RichText 只輸出文字），這裡不另外擋。
 */
import { isRecord } from "../rules/util";

const RESERVED_START = /^[#:\->[\\{*+|]/;

function needsJson(value: string, inline: boolean): boolean {
  return (
    value === "" ||
    /[\r\n]/.test(value) ||
    value !== value.trim() ||
    RESERVED_START.test(value) ||
    (inline && value.includes("{"))
  );
}

/** 一行文字。inline 表示後面可能接 `{屬性}`，所以值裡有 `{` 也要用 JSON。 */
export function encodeLine(value: string, inline = false): string {
  return needsJson(value, inline) ? `\\${JSON.stringify(value)}` : value;
}

/** 從 index 開始讀一個 JSON 字串字面值，回傳值與結尾位置。 */
function readJsonString(text: string, index: number): { value: string; end: number } | null {
  if (text[index] !== '"') return null;
  let cursor = index + 1;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === '"') {
      try {
        const value: unknown = JSON.parse(text.slice(index, cursor + 1));
        return typeof value === "string" ? { value, end: cursor + 1 } : null;
      } catch {
        return null;
      }
    }
    cursor += 1;
  }
  return null;
}

/** 解一行值；inline 時同時拆出後面的 `{屬性}`。 */
function decodeValue(text: string, inline: boolean): { value: string; attrs: string } | null {
  if (text.startsWith("\\")) {
    const parsed = readJsonString(text, 1);
    if (!parsed) return null;
    const rest = text.slice(parsed.end);
    if (rest === "") return { value: parsed.value, attrs: "" };
    if (inline && rest.startsWith(" {")) return { value: parsed.value, attrs: rest.slice(1) };
    return null;
  }
  if (!inline) return { value: text, attrs: "" };
  const brace = text.indexOf(" {");
  if (brace < 0) return { value: text, attrs: "" };
  return { value: text.slice(0, brace), attrs: text.slice(brace + 1) };
}

type Attrs = { id?: string; values: Map<string, string> };

function encodeAttrs(id: string | undefined, values: [string, string | undefined][]): string {
  const parts: string[] = [];
  if (id !== undefined) parts.push(`#${id}`);
  for (const [key, value] of values) if (value !== undefined) parts.push(`${key}=${JSON.stringify(value)}`);
  return parts.length > 0 ? `{${parts.join(" ")}}` : "";
}

function parseAttrs(text: string): Attrs | null {
  if (text === "") return { values: new Map() };
  if (!text.startsWith("{") || !text.endsWith("}")) return null;
  const attrs: Attrs = { values: new Map() };
  let cursor = 1;
  const end = text.length - 1;
  while (cursor < end) {
    if (text[cursor] === " ") {
      cursor += 1;
      continue;
    }
    if (text[cursor] === "#") {
      const match = /^#([^\s}]+)/.exec(text.slice(cursor, end));
      if (!match || attrs.id !== undefined) return null;
      attrs.id = match[1];
      cursor += match[0].length;
      continue;
    }
    const key = /^([a-z_]+)=/.exec(text.slice(cursor, end));
    if (!key || attrs.values.has(key[1])) return null;
    const parsed = readJsonString(text, cursor + key[0].length);
    if (!parsed || parsed.end > end) return null;
    attrs.values.set(key[1], parsed.value);
    cursor = parsed.end;
  }
  return attrs;
}

const CIRCLE_FIELDS = [
  "heading",
  "body",
  "qa",
  "items_title",
  "items",
  "checklist_title",
  "checklist",
  "activity_figure",
  "figures",
  "notes",
  "sources",
] as const;
const ITEM_FIELDS = ["title", "text", "example", "code"] as const;
const QA_FIELDS = ["question", "answer", "source"] as const;
const REF_ID = /^[^\s[\]\\"{}#]+$/;

function strings(value: unknown, where: string, problems: string[]): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    problems.push(`${where} 必須是字串陣列`);
    return [];
  }
  return value as string[];
}

function text(value: unknown, where: string, problems: string[]): string {
  if (typeof value !== "string") {
    problems.push(`${where} 必須是字串`);
    return "";
  }
  return value;
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], where: string, problems: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) problems.push(`${where} 有轉換器不認得的欄位 ${key}`);
}

function refId(value: string, where: string, problems: string[]): string {
  if (!REF_ID.test(value)) problems.push(`${where} 的 id「${value}」不能寫進 Markdown`);
  return value;
}

/**
 * YAML 的一圈（schema 形狀）→ Markdown。轉不了（有不認得的欄位、型別不對、
 * 必須至少一項的清單是空的）就把原因放進 problems，不靜靜丟掉資料。
 */
export function circleToMarkdown(part: unknown, where: string, problems: string[]): string {
  if (!isRecord(part)) {
    problems.push(`${where} 必須是物件`);
    return "";
  }
  unknownKeys(part, CIRCLE_FIELDS, where, problems);
  const blocks: string[] = [`## ${encodeLine(text(part.heading, `${where}.heading`, problems))}`];

  if (part.body !== undefined) {
    const body = strings(part.body, `${where}.body`, problems);
    if (body.length === 0) problems.push(`${where}.body 是空陣列，Markdown 表示不了`);
    for (const paragraph of body) blocks.push(encodeLine(paragraph));
  }

  if (part.qa !== undefined) {
    if (!isRecord(part.qa)) {
      problems.push(`${where}.qa 必須是物件`);
    } else {
      unknownKeys(part.qa, QA_FIELDS, `${where}.qa`, problems);
      const source = refId(text(part.qa.source, `${where}.qa.source`, problems), `${where}.qa.source`, problems);
      blocks.push(
        [
          `:::qa${encodeAttrs(undefined, [["source", source]])}`,
          `### ${encodeLine(text(part.qa.question, `${where}.qa.question`, problems))}`,
          encodeLine(text(part.qa.answer, `${where}.qa.answer`, problems)),
          ":::",
        ].join("\n"),
      );
    }
  }

  const itemsTitle = part.items_title === undefined ? undefined : text(part.items_title, `${where}.items_title`, problems);
  if (part.items !== undefined) {
    const lines = [`:::items${encodeAttrs(undefined, [["title", itemsTitle]])}`];
    if (!Array.isArray(part.items) || part.items.length === 0) problems.push(`${where}.items 必須是非空陣列`);
    for (const [index, item] of (Array.isArray(part.items) ? part.items : []).entries()) {
      const at = `${where}.items[${index}]`;
      if (!isRecord(item)) {
        problems.push(`${at} 必須是物件`);
        continue;
      }
      unknownKeys(item, ITEM_FIELDS, at, problems);
      const code = item.code === undefined ? undefined : text(item.code, `${at}.code`, problems);
      const attrs = encodeAttrs(undefined, [["code", code]]);
      lines.push(`- ${encodeLine(text(item.title, `${at}.title`, problems), true)}${attrs ? ` ${attrs}` : ""}`);
      lines.push(`  ${encodeLine(text(item.text, `${at}.text`, problems))}`);
      if (item.example !== undefined) lines.push(`  > ${encodeLine(text(item.example, `${at}.example`, problems))}`);
    }
    lines.push(":::");
    blocks.push(lines.join("\n"));
  } else if (itemsTitle !== undefined) {
    problems.push(`${where}.items_title 沒有 items，Markdown 表示不了`);
  }

  const checklistTitle =
    part.checklist_title === undefined ? undefined : text(part.checklist_title, `${where}.checklist_title`, problems);
  if (part.checklist !== undefined) {
    const checklist = strings(part.checklist, `${where}.checklist`, problems);
    if (checklist.length === 0) problems.push(`${where}.checklist 是空陣列，Markdown 表示不了`);
    blocks.push(
      [
        `:::checklist${encodeAttrs(undefined, [["title", checklistTitle]])}`,
        ...checklist.map((entry) => `- ${encodeLine(entry)}`),
        ":::",
      ].join("\n"),
    );
  } else if (checklistTitle !== undefined) {
    problems.push(`${where}.checklist_title 沒有 checklist，Markdown 表示不了`);
  }

  const figureLines: string[] = [];
  if (part.activity_figure !== undefined) {
    const id = refId(text(part.activity_figure, `${where}.activity_figure`, problems), `${where}.activity_figure`, problems);
    figureLines.push(`::figure${encodeAttrs(id, [["role", "activity"]])}`);
  }
  if (part.figures !== undefined) {
    const figures = strings(part.figures, `${where}.figures`, problems);
    if (figures.length === 0) figureLines.push("::figure{}");
    for (const id of figures) figureLines.push(`::figure${encodeAttrs(refId(id, `${where}.figures`, problems), [])}`);
  }
  if (figureLines.length > 0) blocks.push(figureLines.join("\n"));

  if (part.notes !== undefined) {
    const notes = strings(part.notes, `${where}.notes`, problems);
    blocks.push([":::notes", notes.map((note) => encodeLine(note)).join("\n\n"), ":::"].filter((line) => line !== "").join("\n"));
  }

  if (part.sources !== undefined) {
    const sources = strings(part.sources, `${where}.sources`, problems);
    if (sources.length === 0) problems.push(`${where}.sources 是空陣列，Markdown 表示不了`);
    blocks.push(sources.map((id) => `[^${refId(id, `${where}.sources`, problems)}]`).join(" "));
  }

  return `${blocks.join("\n\n")}\n`;
}

const SOURCES_LINE = /^\[\^[^\s[\]\\"{}#]+\](?: \[\^[^\s[\]\\"{}#]+\])*$/;

/**
 * Markdown → YAML 的一圈（欄位順序同 schema）。有錯時 part 為 null，errors 帶行號。
 * 訊息開頭是 where（例如 knowledge_points/pm.agile@sh 的 why）。
 */
export function markdownToCircle(markdown: string, where: string): { part: Record<string, unknown> | null; errors: string[] } {
  const errors: string[] = [];
  const fail = (line: number, message: string) => errors.push(`${where} 第 ${line + 1} 行：${message}`);
  const lines = markdown.endsWith("\n") ? markdown.slice(0, -1).split("\n") : markdown.split("\n");

  let heading: string | undefined;
  const body: string[] = [];
  let qa: Record<string, string> | undefined;
  let itemsTitle: string | undefined;
  let items: Record<string, string>[] | undefined;
  let checklistTitle: string | undefined;
  let checklist: string[] | undefined;
  let activityFigure: string | undefined;
  let figures: string[] | undefined;
  let notes: string[] | undefined;
  let sources: string[] | undefined;

  const value = (raw: string, line: number): string | null => {
    const decoded = decodeValue(raw, false);
    if (!decoded) fail(line, "JSON 字串寫錯");
    return decoded ? decoded.value : null;
  };

  let index = 0;
  /** 讀到 `:::` 為止，回傳區塊內的行（含原始行號）。 */
  const blockLines = (start: number): { line: number; text: string }[] | null => {
    const inner: { line: number; text: string }[] = [];
    for (let cursor = start + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor] === ":::") {
        index = cursor + 1;
        return inner;
      }
      inner.push({ line: cursor, text: lines[cursor] });
    }
    fail(start, "區塊沒有用 ::: 收尾");
    index = lines.length;
    return null;
  };

  while (index < lines.length) {
    const lineNo = index;
    const line = lines[index];
    if (line === "") {
      index += 1;
      continue;
    }
    if (heading === undefined) {
      if (!line.startsWith("## ")) {
        fail(lineNo, "第一行必須是「## 標題」");
        return { part: null, errors };
      }
      heading = value(line.slice(3), lineNo) ?? "";
      index += 1;
      continue;
    }
    const container = /^:::([a-z]+)(.*)$/.exec(line);
    if (container) {
      const name = container[1];
      const attrs = parseAttrs(container[2]);
      const inner = blockLines(lineNo);
      if (!attrs) {
        fail(lineNo, `:::${name} 的屬性寫錯`);
        continue;
      }
      if (!inner) continue;
      if (name === "qa") {
        if (qa) fail(lineNo, "qa 只能有一個");
        const source = attrs.values.get("source");
        const content = inner.filter((entry) => entry.text !== "");
        if (source === undefined || attrs.values.size !== 1 || attrs.id !== undefined) fail(lineNo, "qa 只收 source 屬性，而且必填");
        if (content.length !== 2 || !content[0].text.startsWith("### ")) {
          fail(lineNo, "qa 裡面要有一行「### 問題」和一行回答");
          continue;
        }
        const question = value(content[0].text.slice(4), content[0].line);
        const answer = value(content[1].text, content[1].line);
        if (question !== null && answer !== null && source !== undefined) qa = { question, answer, source };
        continue;
      }
      if (name === "items") {
        if (items) fail(lineNo, "items 只能有一個");
        if (attrs.id !== undefined || [...attrs.values.keys()].some((key) => key !== "title")) fail(lineNo, "items 只收 title 屬性");
        itemsTitle = attrs.values.get("title");
        items = [];
        let current: Record<string, string> | null = null;
        for (const entry of inner) {
          if (entry.text === "") continue;
          if (entry.text.startsWith("- ")) {
            const decoded = decodeValue(entry.text.slice(2), true);
            const itemAttrs = decoded ? parseAttrs(decoded.attrs) : null;
            if (!decoded || !itemAttrs || itemAttrs.id !== undefined || [...itemAttrs.values.keys()].some((key) => key !== "code")) {
              fail(entry.line, "項目標題或 {code=…} 寫錯");
              current = null;
              continue;
            }
            current = { title: decoded.value };
            items.push(current);
            const code = itemAttrs.values.get("code");
            if (code !== undefined) current.code = code;
            continue;
          }
          if (!current) {
            fail(entry.line, "項目內容前面要先有「- 項目標題」");
            continue;
          }
          if (entry.text.startsWith("  > ")) {
            if (current.text === undefined || current.example !== undefined) fail(entry.line, "例子要接在項目內容後面，而且只能一行");
            const example = value(entry.text.slice(4), entry.line);
            if (example !== null) current.example = example;
            continue;
          }
          if (entry.text.startsWith("  ")) {
            if (current.text !== undefined) fail(entry.line, "項目內容只能一行");
            const itemText = value(entry.text.slice(2), entry.line);
            if (itemText !== null) current.text = itemText;
            continue;
          }
          fail(entry.line, "items 裡只能有「- 標題」、兩格縮排的內容、「  > 例子」");
        }
        for (const item of items) if (item.text === undefined) errors.push(`${where}：項目「${item.title}」沒有內容`);
        items = items.map((item) => {
          const ordered: Record<string, string> = { title: item.title, text: item.text ?? "" };
          if (item.example !== undefined) ordered.example = item.example;
          if (item.code !== undefined) ordered.code = item.code;
          return ordered;
        });
        continue;
      }
      if (name === "checklist") {
        if (checklist) fail(lineNo, "checklist 只能有一個");
        if (attrs.id !== undefined || [...attrs.values.keys()].some((key) => key !== "title")) fail(lineNo, "checklist 只收 title 屬性");
        checklistTitle = attrs.values.get("title");
        checklist = [];
        for (const entry of inner) {
          if (entry.text === "") continue;
          if (!entry.text.startsWith("- ")) {
            fail(entry.line, "checklist 每一項以「- 」開頭");
            continue;
          }
          const item = value(entry.text.slice(2), entry.line);
          if (item !== null) checklist.push(item);
        }
        continue;
      }
      if (name === "notes") {
        if (notes) fail(lineNo, "notes 只能有一個");
        if (attrs.id !== undefined || attrs.values.size > 0) fail(lineNo, "notes 不收屬性");
        notes = [];
        for (const entry of inner) {
          if (entry.text === "") continue;
          const note = value(entry.text, entry.line);
          if (note !== null) notes.push(note);
        }
        continue;
      }
      fail(lineNo, `不認得的區塊 :::${name}`);
      continue;
    }
    if (line.startsWith("::figure")) {
      const attrs = parseAttrs(line.slice("::figure".length));
      index += 1;
      if (!attrs) {
        fail(lineNo, "::figure 的屬性寫錯");
        continue;
      }
      const role = attrs.values.get("role");
      if ([...attrs.values.keys()].some((key) => key !== "role") || (role !== undefined && role !== "activity")) {
        fail(lineNo, "::figure 只收 #id 與 role=\"activity\"");
        continue;
      }
      if (role === "activity") {
        if (attrs.id === undefined || activityFigure !== undefined) fail(lineNo, "活動圖要有 #id，而且只能一張");
        else activityFigure = attrs.id;
        continue;
      }
      figures ??= [];
      if (attrs.id !== undefined) figures.push(attrs.id);
      continue;
    }
    if (line.startsWith("[^")) {
      index += 1;
      if (sources) fail(lineNo, "來源只能寫一行");
      if (!SOURCES_LINE.test(line)) {
        fail(lineNo, "來源寫成「[^id] [^id]」");
        continue;
      }
      sources = line.split(" ").map((token) => token.slice(2, -1));
      continue;
    }
    if (line.startsWith("#") || line.startsWith(":::")) {
      fail(lineNo, "標題只能有一個，區塊要用 :::名稱 開頭");
      index += 1;
      continue;
    }
    const paragraph = value(line, lineNo);
    if (paragraph !== null) body.push(paragraph);
    index += 1;
  }

  if (heading === undefined) {
    errors.push(`${where}：沒有「## 標題」`);
    return { part: null, errors };
  }
  if (errors.length > 0) return { part: null, errors };

  const part: Record<string, unknown> = { heading };
  if (body.length > 0) part.body = body;
  if (qa) part.qa = qa;
  if (itemsTitle !== undefined) part.items_title = itemsTitle;
  if (items) part.items = items;
  if (checklistTitle !== undefined) part.checklist_title = checklistTitle;
  if (checklist) part.checklist = checklist;
  if (activityFigure !== undefined) part.activity_figure = activityFigure;
  if (figures) part.figures = figures;
  if (notes) part.notes = notes;
  if (sources) part.sources = sources;
  return { part, errors };
}
