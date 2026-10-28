import type { SymbolGridFigure } from "@/lib/content/types";

const CELL = 40;
const GAP = 6;
const COLS = 7;

function groupSize(count: number): { rows: number; width: number; height: number } {
  const rows = Math.ceil(count / COLS);
  return {
    rows,
    width: COLS * CELL + (COLS - 1) * GAP,
    height: 22 + rows * CELL + Math.max(0, rows - 1) * GAP,
  };
}

function Cells({
  symbols,
  highlight,
  originX,
  originY,
}: {
  symbols: string[];
  highlight: Set<string>;
  originX: number;
  originY: number;
}) {
  return (
    <g>
      {symbols.map((symbol, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const x = originX + col * (CELL + GAP);
        const y = originY + row * (CELL + GAP);
        const on = highlight.has(symbol);
        return (
          <g key={`${symbol}-${index}`}>
            <rect x={x} y={y} width={CELL} height={CELL} rx={8} fill={on ? "#ffd2bd" : "#f6f4ef"} />
            <text x={x + CELL / 2} y={y + 28} textAnchor="middle" fontSize={22} fill="#1a1614">
              {symbol}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function SymbolGrid({ figure }: { figure: SymbolGridFigure }) {
  const highlight = new Set(figure.highlight?.symbols ?? []);
  const groups = figure.groups;
  const sizes = groups.map((group) => groupSize(group.symbols.length));
  const side = groups.length > 1 && groups.length <= 2;
  const desktopWidth = side ? sizes[0].width + 48 + sizes[1].width : Math.max(...sizes.map((size) => size.width), 320);
  const desktopHeight = side
    ? Math.max(sizes[0].height, sizes[1].height) + (figure.highlight ? 28 : 8)
    : sizes.reduce((sum, size) => sum + size.height + 16, figure.highlight ? 28 : 8);
  const mobileHeight = sizes.reduce((sum, size) => sum + size.height + 16, figure.highlight ? 28 : 8);

  const paint = (stacked: boolean) => {
    let y = 4;
    const nodes = groups.map((group, index) => {
      const size = sizes[index];
      const x = stacked || !side ? 2 : index === 0 ? 0 : sizes[0].width + 48;
      const top = stacked || !side ? y : 4;
      if (stacked || !side) y += size.height + 16;
      return (
        <g key={group.name}>
          <text x={x} y={top + 16} fontSize={14} fontWeight={700} fill="#47413b">
            {group.name} {group.symbols.length} 個
          </text>
          <Cells symbols={group.symbols} highlight={highlight} originX={x} originY={top + 24} />
        </g>
      );
    });
    return nodes;
  };

  const legend = (y: number) =>
    figure.highlight ? (
      <g>
        <rect x={2} y={y} width={16} height={16} rx={4} fill="#ffd2bd" />
        <text x={24} y={y + 13} fontSize={14} fill="#47413b">
          {figure.highlight.label}
        </text>
      </g>
    ) : null;

  return (
    <>
      <svg className="v2-only-d" viewBox={`0 0 ${desktopWidth} ${desktopHeight}`} role="img" aria-label={figure.alt}>
        {paint(false)}
        {legend(desktopHeight - 24)}
      </svg>
      <svg className="v2-only-m" viewBox={`0 0 320 ${mobileHeight}`} role="img" aria-label={figure.alt}>
        {paint(true)}
        {legend(mobileHeight - 24)}
      </svg>
    </>
  );
}
