import type { SpellingFigure } from "@/lib/content/types";
import { ToneMark, isMedialVowel, splitBopomofo } from "./marks";

type Row = SpellingFigure["rows"][number];

function Cell({
  x,
  y,
  size,
  value,
  dashed,
  tone,
  highlight,
}: {
  x: number;
  y: number;
  size: number;
  value?: string;
  dashed?: boolean;
  tone?: string;
  highlight?: boolean;
}) {
  const font = Math.max(13, Math.round(size * 0.46));
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={10}
        fill={dashed ? "none" : highlight ? "#ffd2bd" : tone ? "#ffe9df" : "#f6f4ef"}
        stroke={tone ? "#ffd2bd" : "#c0bab2"}
        strokeDasharray={dashed ? "5 5" : undefined}
      />
      {dashed ? (
        <text x={x + size / 2} y={y + size / 2 + 5} textAnchor="middle" fontSize={Math.max(13, font - 10)} fill="#6a635b">
          沒有
        </text>
      ) : null}
      {value ? (
        <text x={x + size / 2} y={y + size / 2 + font * 0.35} textAnchor="middle" fontSize={font} fill="#1a1614">
          {value}
        </text>
      ) : null}
      {tone === "" ? (
        <g>
          <text x={x + size / 2} y={y + size / 2 - 2} textAnchor="middle" fontSize={Math.max(13, font - 16)} fontWeight={700} fill="#a83a0f">
            一聲
          </text>
          <text x={x + size / 2} y={y + size / 2 + 16} textAnchor="middle" fontSize={Math.max(13, font - 18)} fill="#47413b">
            不標
          </text>
        </g>
      ) : null}
      {tone ? <ToneMark mark={tone} x={x + size / 2 - 16} y={y + size / 2 - 18} size={32} /> : null}
    </g>
  );
}

function Reading({ reading, x, y, font }: { reading: string; x: number; y: number; font: number }) {
  const parts = splitBopomofo(reading);
  const body = `${parts.dot ? "" : ""}${parts.body}`;
  return (
    <g>
      {parts.dot ? <ToneMark mark="˙" x={x} y={y - font} size={font} /> : null}
      <text x={x + (parts.dot ? font : 0)} y={y} fontSize={font} fill="#1a1614">
        {body}
      </text>
      {parts.tone ? <ToneMark mark={parts.tone} x={x + (parts.dot ? font : 0) + body.length * font * 0.95} y={y - font} size={font} /> : null}
    </g>
  );
}

function rowReading(row: Row): string {
  return `${row.initial}${row.medial}${row.final}${row.tone}`;
}

export function Spelling({ figure }: { figure: SpellingFigure }) {
  const rows = figure.rows;
  const desktopHeight = 36 + rows.length * 96;
  return (
    <>
      <svg className="v2-only-d" viewBox={`0 0 680 ${desktopHeight}`} role="img" aria-label={figure.alt}>
        <g fontSize={15} fill="#47413b" textAnchor="middle">
          <text x={108} y={20}>聲符</text>
          <text x={212} y={20}>介符</text>
          <text x={316} y={20}>韻符</text>
          <text x={420} y={20}>聲調</text>
          <text x={586} y={20}>字音</text>
        </g>
        {rows.map((row, index) => {
          const y = 40 + index * 96;
          return (
            <g key={row.kind}>
              <text x={0} y={y + 42} fontSize={15} fontWeight={800} fill="#1a1614">
                {row.kind}
              </text>
              <Cell x={72} y={y} size={72} value={row.initial || undefined} dashed={!row.initial} />
              <text x={160} y={y + 44} textAnchor="middle" fontSize={20} fill="#6a635b">+</text>
              <Cell x={176} y={y} size={72} value={row.medial || undefined} dashed={!row.medial} highlight={isMedialVowel(row.medial)} />
              <text x={264} y={y + 44} textAnchor="middle" fontSize={20} fill="#6a635b">+</text>
              <Cell x={280} y={y} size={72} value={row.final || undefined} dashed={!row.final} />
              <text x={368} y={y + 44} textAnchor="middle" fontSize={20} fill="#6a635b">+</text>
              <Cell x={384} y={y} size={72} tone={row.tone} />
              <text x={478} y={y + 44} textAnchor="middle" fontSize={22} fill="#6a635b">=</text>
              <rect x={500} y={y} width={172} height={72} rx={10} fill="#fff" stroke="#1a1614" strokeWidth={1.5} />
              <text x={548} y={y + 48} textAnchor="middle" fontSize={36} fontWeight={700} fill="#1a1614">
                {row.result}
              </text>
              <Reading reading={rowReading(row)} x={590} y={y + 44} font={18} />
            </g>
          );
        })}
      </svg>
      <svg className="v2-only-m" viewBox={`0 0 320 ${rows.length * 180}`} role="img" aria-label={figure.alt}>
        {rows.map((row, index) => {
          const y = index * 180;
          return (
            <g key={`${row.kind}-m`}>
              <text x={0} y={y + 16} fontSize={14} fontWeight={800} fill="#1a1614">
                {row.kind}
              </text>
              <g fontSize={13} fill="#47413b" textAnchor="middle">
                <text x={32} y={y + 40}>聲符</text>
                <text x={118} y={y + 40}>介符</text>
                <text x={204} y={y + 40}>韻符</text>
                <text x={290} y={y + 40}>聲調</text>
              </g>
              <Cell x={4} y={y + 48} size={56} value={row.initial || undefined} dashed={!row.initial} />
              <text x={75} y={y + 82} textAnchor="middle" fontSize={16} fill="#6a635b">+</text>
              <Cell x={90} y={y + 48} size={56} value={row.medial || undefined} dashed={!row.medial} highlight={isMedialVowel(row.medial)} />
              <text x={161} y={y + 82} textAnchor="middle" fontSize={16} fill="#6a635b">+</text>
              <Cell x={176} y={y + 48} size={56} value={row.final || undefined} dashed={!row.final} />
              <text x={247} y={y + 82} textAnchor="middle" fontSize={16} fill="#6a635b">+</text>
              <Cell x={262} y={y + 48} size={56} tone={row.tone} />
              <rect x={4} y={y + 116} width={312} height={44} rx={10} fill="#fff" stroke="#1a1614" strokeWidth={1.5} />
              <text x={20} y={y + 144} fontSize={16} fill="#6a635b">=</text>
              <text x={44} y={y + 148} fontSize={26} fontWeight={700} fill="#1a1614">
                {row.result}
              </text>
              <Reading reading={rowReading(row)} x={84} y={y + 144} font={16} />
            </g>
          );
        })}
      </svg>
    </>
  );
}
