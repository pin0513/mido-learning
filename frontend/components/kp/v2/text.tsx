import type { ReactNode } from "react";

const ROMAN = "VIII|VII|VI|IV|IX|III|II|V|I";
const CODE = `(?:\\d+|[A-Z][a-z])-(?:${ROMAN})-\\d+`;
/** 書名號、課綱代碼（含 3-I-1～3-I-4 這種區間）、注音音節（含調號，以及「把ㄅㄚˇ」這種例字）。 */
const TOKEN = new RegExp(
  `《[^》]+》|${CODE}(?:\\s*[~～〜]\\s*${CODE})?|[\\u4e00-\\u9fff]?˙?[\\u3105-\\u312f]+[ˉˊˇˋ]?`,
  "g",
);

type Piece = { text: string; nowrap: boolean };

function piecesOf(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ text: text.slice(last, index), nowrap: false });
    pieces.push({ text: match[0], nowrap: true });
    last = index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), nowrap: false });
  return pieces;
}

/** 結尾至少四個字黏在一起，避免最後一行只剩一兩個字。已是不斷行的代碼或音節整段算進去。 */
function keepTail(pieces: Piece[]): Piece[] {
  let need = 4;
  const tail: Piece[] = [];
  const head = [...pieces];
  while (head.length > 0 && need > 0) {
    const piece = head.pop();
    if (!piece) break;
    const length = [...piece.text].length;
    if (piece.nowrap || length <= need) {
      tail.unshift(piece);
      need -= length;
      continue;
    }
    const chars = [...piece.text];
    const stay = chars.slice(0, chars.length - need).join("");
    if (stay) head.push({ text: stay, nowrap: false });
    tail.unshift({ text: chars.slice(chars.length - need).join(""), nowrap: true });
    need = 0;
  }
  if (tail.length === 0) return pieces;
  return [...head, { text: tail.map((piece) => piece.text).join(""), nowrap: true }];
}

/** 書名號、注音、課綱代碼不斷行。 */
export function RichText({ text }: { text: string }) {
  const pieces = keepTail(piecesOf(text));
  if (pieces.length === 1 && !pieces[0].nowrap) return pieces[0].text;
  const nodes: ReactNode[] = [];
  pieces.forEach((piece, index) => {
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
