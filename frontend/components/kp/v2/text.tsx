import Link from "next/link";
import { Fragment, type ReactNode } from "react";

const ROMAN = "IV|III|II|V|I";
const PERF = `(?:[\\u4e00-\\u9fff] )?[0-9]{1,2}[a-z]?-(?:${ROMAN})-[0-9]{1,2}`;
const CONTENT = `(?:[\\u4e00-\\u9fff] )?(?:[A-Za-z]{1,2}-(?:${ROMAN})-[0-9]{1,2}|[A-Z]-(?:[1-9]|1[0-2])[A-Z]?-[0-9]{1,2})`;
const ONE = `(?:${PERF}|${CONTENT})`;
const CODE = `${ONE}(?:\\s*[~～〜]\\s*${ONE}|[~～〜]\\d{1,2})?`;
/** 書名號、課綱代碼（含 3-I-1～3-I-4 這種區間）、注音音節（含調號，以及「把ㄅㄚˇ」這種例字）。 */
const TOKEN = new RegExp(
  `《[^》]+》|${CODE}|[\\u4e00-\\u9fff]?˙?[\\u3105-\\u312f]+[ˉˊˇˋ]?`,
  "g",
);
/** 《重編國語辭典修訂本》這種短書名整段不拆。更長的書名要能換行，否則 390 寬會被英文書名撐出畫面。 */
const BOOK_KEEP = 16;

/** 內文提到的知識點。有 href 才連出去（草稿或未上線的學門只顯示標題）。 */
export type PointRef = { title: string; href?: string };
/** key 是 concept（例如 pm.estimate）或 concept@stage。 */
export type PointRefs = ReadonlyMap<string, PointRef>;

type Piece = { text: string; nowrap: boolean } | { ref: PointRef; open: string; close: string };
type TextPiece = Extract<Piece, { text: string }>;

function isText(piece: Piece): piece is TextPiece {
  return "text" in piece;
}

function piecesOf(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ text: text.slice(last, index), nowrap: false });
    const token = match[0];
    const nowrap = !token.startsWith("《") || [...token].length <= BOOK_KEEP;
    pieces.push({ text: token, nowrap });
    last = index + token.length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), nowrap: false });
  return pieces;
}

/** 內文裡的知識點 id（pm.estimate、sk.present@sh）。前後不能黏著英數、點或斜線，網址和檔名才不會被誤認。 */
const POINT_ID = /(?<![A-Za-z0-9_.@/-])[a-z]{2}\.[a-z][a-z0-9]*(?:@[a-z]{2,3})?(?![A-Za-z0-9_@/-])/g;
const CJK_OR_PUNCT = /[\u3000-\u30ff\u3105-\u312f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;

/** 讀者不該看到內部 id：換成知識點標題，前後沒有引號就補上「」，和中文相鄰的半形空白一併拿掉。 */
function withRefs(text: string, refs: PointRefs | undefined): Piece[] {
  if (!refs || refs.size === 0) return piecesOf(text);
  const out: Piece[] = [];
  let cursor = 0;
  const matches = [...text.matchAll(POINT_ID)].filter((match) => refs.has(match[0]));
  if (matches.length === 0) return piecesOf(text);
  for (const match of matches) {
    const index = match.index ?? 0;
    const ref = refs.get(match[0]);
    if (!ref) continue;
    let before = text.slice(cursor, index);
    let after = index + match[0].length;
    if (before.endsWith(" ") && CJK_OR_PUNCT.test(before.at(-2) ?? "")) before = before.slice(0, -1);
    if (text[after] === " " && CJK_OR_PUNCT.test(text[after + 1] ?? "")) after += 1;
    const quoted = /[「『〈《]$/.test(before);
    const open = quoted ? "" : ref.title.includes("「") ? "『" : "「";
    const close = quoted ? "" : open === "『" ? "』" : "」";
    if (before) out.push(...piecesOf(before));
    out.push({ ref, open, close });
    cursor = after;
  }
  const rest = text.slice(cursor);
  if (rest) out.push(...piecesOf(rest));
  return out;
}

/** 不能放在行首的標點（逗號、句號、收尾括號……）。 */
const NO_START = "，。、；：！？」』）》〉】〕…‥—～,.;:!?)]}%";
/** 不能放在行尾的標點（開頭括號）。 */
const NO_END = "「『（《〈【〔([{";
const CJK = /[\u3040-\u30ff\u3105-\u312f\u3400-\u9fff\uf900-\ufaff]/;

/**
 * 段落結尾的最後兩個中日文字，連同後面的標點黏在一起，最後一行就不會只剩一個字或一個標點。
 * 只黏這麼短，窄欄裡也不會因為黏太長被迫在詞中間斷開。結尾是英數或代碼時不黏，英文本來就不會拆字。
 * 行首不放逗號句號、行尾不放開括號，交給 CSS 的 line-break: strict。
 */
function keepTail(pieces: Piece[]): Piece[] {
  const last = pieces.at(-1);
  if (!last || !isText(last) || last.nowrap) return pieces;
  const chars = [...last.text];
  let index = chars.length;
  while (index > 0 && NO_START.includes(chars[index - 1])) index -= 1;
  let kept = 0;
  while (index > 0 && kept < 2 && CJK.test(chars[index - 1])) {
    index -= 1;
    kept += 1;
  }
  if (kept === 0) return pieces;
  while (index > 0 && NO_END.includes(chars[index - 1])) index -= 1;
  const head = chars.slice(0, index).join("");
  const tail = chars.slice(index).join("");
  const rest = pieces.slice(0, -1);
  if (head) rest.push({ text: head, nowrap: false });
  rest.push({ text: tail, nowrap: true });
  return rest;
}

/** 短書名、注音、課綱代碼不斷行。長書名照一般段落換行。內文裡的知識點 id 換成標題連結。 */
export function RichText({ text, refs }: { text: string; refs?: PointRefs }) {
  const pieces = keepTail(withRefs(text, refs));
  if (pieces.length === 1 && isText(pieces[0]) && !pieces[0].nowrap) return pieces[0].text;
  const nodes: ReactNode[] = [];
  pieces.forEach((piece, index) => {
    if (!isText(piece)) {
      const label = `${piece.open}${piece.ref.title}${piece.close}`;
      nodes.push(
        piece.ref.href ? (
          <Fragment key={`ref-${index}`}>
            {piece.open}
            <Link className="v2-ref" href={piece.ref.href}>{piece.ref.title}</Link>
            {piece.close}
          </Fragment>
        ) : (
          label
        ),
      );
      return;
    }
    if (!piece.nowrap) {
      nodes.push(piece.text);
      return;
    }
    nodes.push(
      <span className="v2-nw" key={`${piece.text}-${index}`}>
        {piece.text}
      </span>,
    );
  });
  return <>{nodes}</>;
}

/** 結尾四個字黏在一起。舊版詳情頁沒有 V2 的分段器，用這個避免最後一行只剩一兩個字。 */
export function GlueTail({ text }: { text: string }) {
  const chars = [...text];
  if (chars.length <= 4) return text;
  return (
    <>
      {chars.slice(0, -4).join("")}
      <span className="whitespace-nowrap">{chars.slice(-4).join("")}</span>
    </>
  );
}

/** 全形冒號後不超過 14 字才不斷行，避免窄螢幕把整列撐出去。 */
export function HeadingLine({ lead, tail }: { lead: string; tail?: string }) {
  if (!tail) return lead;
  if (tail.length <= 14) {
    return (
      <>
        {lead}：<span className="v2-nw">{tail}</span>
      </>
    );
  }
  return (
    <>
      {lead}：<RichText text={tail} />
    </>
  );
}

export function TitleLine({ title }: { title: string }) {
  const index = title.indexOf("：");
  if (index <= 0) return <RichText text={title} />;
  return <HeadingLine lead={title.slice(0, index)} tail={title.slice(index + 1)} />;
}
