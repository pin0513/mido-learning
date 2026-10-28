import type { ReactNode } from "react";

/** 書名號《…》不斷行。 */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /《[^》]+》/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <span className="v2-nw" key={key++}>
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  if (nodes.length === 1 && typeof nodes[0] === "string") return nodes[0];
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
