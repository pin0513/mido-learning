import type { CompareFigure } from "@/lib/content/types";
import { ToneMark, splitBopomofo } from "./marks";

const RELATION: Record<CompareFigure["relation"], string> = {
  not_equal: "≠",
  equal: "=",
  versus: "vs",
};

type Item = CompareFigure["items"][number];

/** 半形約 0.62 個全形寬，用來在 SVG 裡先把字收進卡片，避免和旁邊的卡片重疊。 */
function units(text: string): number {
  let total = 0;
  for (const ch of text) total += ch.charCodeAt(0) <= 0x7e ? 0.62 : 1;
  return total;
}

function fontToFit(text: string, maxWidth: number, preferred: number, min: number): number {
  const width = units(text);
  if (width <= 0) return preferred;
  return Math.max(min, Math.min(preferred, maxWidth / width));
}

function wrapToWidth(text: string, maxWidth: number, font: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (line && units(next) * font > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function Card({
  item,
  x,
  y,
  width,
}: {
  item: Item;
  x: number;
  y: number;
  width: number;
}) {
  const inner = width - 28;
  const reading = item.reading ? splitBopomofo(item.reading) : null;
  const cx = x + width / 2;
  const termPreferred = reading ? 22 : units(item.term) <= 3 ? 36 : 28;
  const termFont = fontToFit(item.term, inner, termPreferred, 14);
  const readFont = reading ? fontToFit(reading.body, inner - (reading.tone ? 28 : 0), 28, 16) : 0;
  const notes = item.note ? wrapToWidth(item.note, inner, 14) : [];
  const cardH = reading ? 118 : 96;
  const termY = reading ? y + cardH - 22 : y + cardH / 2 + termFont * 0.32;
  const noteStart = y + cardH + 22;
  return (
    <g>
      <rect x={x} y={y} width={width} height={cardH} rx={12} fill="#f6f4ef" stroke="#d9d4cc" />
      {reading ? (
        <g>
          {reading.dot ? <ToneMark mark="˙" x={cx - 56} y={y + 8} size={22} /> : null}
          <text x={cx - (reading.tone ? 8 : 0)} y={y + 44} textAnchor="middle" fontSize={readFont} fill="#1a1614">
            {reading.body}
          </text>
          {reading.tone ? (
            <ToneMark mark={reading.tone} x={cx + units(reading.body) * readFont * 0.45} y={y + 8} size={Math.max(18, readFont)} />
          ) : null}
        </g>
      ) : null}
      <text x={cx} y={termY} textAnchor="middle" fontSize={termFont} fontWeight={700} fill="#1a1614">
        {item.term}
      </text>
      {notes.map((line, index) => (
        <text key={`${line}-${index}`} x={cx} y={noteStart + index * 20} textAnchor="middle" fontSize={14} fill="#47413b">
          {line}
        </text>
      ))}
    </g>
  );
}

function blockHeight(item: Item, width: number): number {
  const notes = item.note ? wrapToWidth(item.note, width - 28, 14).length : 0;
  const cardH = item.reading ? 118 : 96;
  return cardH + 16 + Math.max(notes, 1) * 20 + 8;
}

/**
 * 並排一張、直排一張，CSS 依寬度切換。stacked 時兩種寬度都用直排：
 * 和問答並排的窄欄（約 340px）放不下並排版，字會被縮到 9px。
 */
export function Compare({ figure, stacked = false }: { figure: CompareFigure; stacked?: boolean }) {
  const items = figure.items;
  const gap = 36;
  const cardW = Math.max(
    168,
    ...items.map((item) => {
      const termSize = item.reading ? 22 : units(item.term) <= 3 ? 36 : 28;
      const term = units(item.term) * termSize + 36;
      const note = item.note ? Math.min(units(item.note) * 14 + 36, 248) : 0;
      const reading = item.reading ? units(splitBopomofo(item.reading).body) * 24 + 48 : 0;
      return Math.ceil(Math.max(term, note, reading));
    }),
  );
  const width = items.length * cardW + (items.length - 1) * gap;
  const height = 1 + Math.max(...items.map((item) => blockHeight(item, cardW)));
  let mobileY = 1;
  const mobileRows = items.map((item) => {
    const row = { item, y: mobileY };
    mobileY += blockHeight(item, 304) + 28;
    return row;
  });
  const vertical = (
    <svg className={stacked ? "v2-cmp-stack" : "v2-only-m"} viewBox={`0 0 320 ${mobileY - 20}`} role="img" aria-label={figure.alt}>
      {mobileRows.map(({ item, y }, index) => (
        <g key={`${item.term}-m`}>
          {index > 0 ? (
            <text x={160} y={y - 12} textAnchor="middle" fontSize={18} fill="#6a635b">
              {RELATION[figure.relation]}
            </text>
          ) : null}
          <Card item={item} x={8} y={y} width={304} />
        </g>
      ))}
    </svg>
  );
  if (stacked) return vertical;
  return (
    <>
      <svg className="v2-only-d" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={figure.alt}>
        {items.map((item, index) => (
          <g key={item.term}>
            {index > 0 ? (
              <text x={index * (cardW + gap) - gap / 2} y={item.reading ? 58 : 50} textAnchor="middle" fontSize={22} fill="#6a635b">
                {RELATION[figure.relation]}
              </text>
            ) : null}
            <Card item={item} x={index * (cardW + gap)} y={1} width={cardW} />
          </g>
        ))}
      </svg>
      {vertical}
    </>
  );
}
