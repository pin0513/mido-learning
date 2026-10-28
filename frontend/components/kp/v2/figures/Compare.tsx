import type { CompareFigure } from "@/lib/content/types";
import { ToneMark, splitBopomofo } from "./marks";

const RELATION: Record<CompareFigure["relation"], string> = {
  not_equal: "≠",
  equal: "=",
  versus: "vs",
};

function Card({
  item,
  x,
  y,
  width,
}: {
  item: CompareFigure["items"][number];
  x: number;
  y: number;
  width: number;
}) {
  const reading = item.reading ? splitBopomofo(item.reading) : null;
  const cx = x + width / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={112} rx={12} fill="#f6f4ef" stroke="#d9d4cc" />
      {reading ? (
        <g>
          {reading.dot ? <ToneMark mark="˙" x={cx - 56} y={y + 8} size={22} /> : null}
          <text x={cx - (reading.tone ? 8 : 0)} y={y + 40} textAnchor="middle" fontSize={24} fill="#1a1614">
            {reading.body}
          </text>
          {reading.tone ? <ToneMark mark={reading.tone} x={cx + reading.body.length * 10} y={y + 6} size={28} /> : null}
        </g>
      ) : null}
      <text x={cx} y={y + 96} textAnchor="middle" fontSize={40} fontWeight={700} fill="#1a1614">
        {item.term}
      </text>
      {item.note ? (
        <text x={cx} y={y + 144} textAnchor="middle" fontSize={14} fill="#47413b">
          {item.note}
        </text>
      ) : null}
    </g>
  );
}

export function Compare({ figure }: { figure: CompareFigure }) {
  const items = figure.items;
  const wide = items.length >= 3;
  const cardW = 148;
  const gap = 42;
  const width = items.length * cardW + (items.length - 1) * gap;
  const desktop = (
    <svg className={wide ? "v2-only-d" : undefined} viewBox={`0 0 ${Math.max(width, 340)} 168`} role="img" aria-label={figure.alt}>
      {items.map((item, index) => (
        <g key={item.term}>
          {index > 0 ? (
            <text x={index * (cardW + gap) - gap / 2} y={66} textAnchor="middle" fontSize={26} fill="#6a635b">
              {RELATION[figure.relation]}
            </text>
          ) : null}
          <Card item={item} x={index * (cardW + gap)} y={1} width={cardW} />
        </g>
      ))}
    </svg>
  );
  if (!wide) return desktop;
  const mobileHeight = items.length * 150 + 8;
  return (
    <>
      {desktop}
      <svg className="v2-only-m" viewBox={`0 0 320 ${mobileHeight}`} role="img" aria-label={figure.alt}>
        {items.map((item, index) => (
          <g key={item.term}>
            {index > 0 ? (
              <text x={160} y={index * 150 - 16} textAnchor="middle" fontSize={22} fill="#6a635b">
                {RELATION[figure.relation]}
              </text>
            ) : null}
            <Card item={item} x={8} y={index * 150 + 1} width={304} />
          </g>
        ))}
      </svg>
    </>
  );
}
