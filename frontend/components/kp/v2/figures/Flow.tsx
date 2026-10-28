import type { FlowFigure } from "@/lib/content/types";

function linesOf(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  for (let index = 0; index < text.length; index += size) out.push(text.slice(index, index + size));
  return out;
}

export function Flow({ figure }: { figure: FlowFigure }) {
  const steps = figure.steps;
  const n = steps.length;
  const arrow = 28;
  const cardW = Math.max(96, Math.floor((680 - (n - 1) * arrow - 4) / n));
  const desktopWidth = n * cardW + (n - 1) * arrow + 4;
  const markerD = `flow-${figure.id}-d`;
  const markerM = `flow-${figure.id}-m`;
  return (
    <>
      <svg className="v2-only-d" viewBox={`0 0 ${desktopWidth} 148`} role="img" aria-label={figure.alt}>
        <defs>
          <marker id={markerD} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#a83a0f" />
          </marker>
        </defs>
        {steps.map((step, index) => {
          const x = 2 + index * (cardW + arrow);
          const title = step.actor ?? step.text;
          const detail = step.actor ? linesOf(step.text, Math.max(4, Math.floor((cardW - 24) / 15))) : [];
          return (
            <g key={`${step.actor ?? ""}-${step.text}`}>
              <rect x={x} y={1} width={cardW} height={146} rx={12} fill="#fff" stroke="#c0bab2" />
              <circle cx={x + 26} cy={30} r={14} fill="#ff5b22" />
              <text x={x + 26} y={35} textAnchor="middle" fontSize={14} fontWeight={800} fill="#1a1614">
                {index + 1}
              </text>
              <text x={x + 14} y={72} fontSize={16} fontWeight={800} fill="#1a1614">
                {title}
              </text>
              {detail.map((line, lineIndex) => (
                <text key={line} x={x + 14} y={98 + lineIndex * 20} fontSize={14} fill="#47413b">
                  {line}
                </text>
              ))}
              {index < n - 1 ? (
                <line
                  x1={x + cardW + 6}
                  y1={74}
                  x2={x + cardW + arrow - 8}
                  y2={74}
                  stroke="#a83a0f"
                  strokeWidth={2}
                  markerEnd={`url(#${markerD})`}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <svg className="v2-only-m" viewBox={`0 0 320 ${n * 84 - 8}`} role="img" aria-label={figure.alt}>
        <defs>
          <marker id={markerM} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#a83a0f" />
          </marker>
        </defs>
        {steps.map((step, index) => {
          const y = index * 84;
          return (
            <g key={`${step.actor ?? ""}-${step.text}-m`}>
              <rect x={1} y={y + 1} width={318} height={60} rx={12} fill="#fff" stroke="#c0bab2" />
              <circle cx={30} cy={y + 31} r={14} fill="#ff5b22" />
              <text x={30} y={y + 36} textAnchor="middle" fontSize={14} fontWeight={800} fill="#1a1614">
                {index + 1}
              </text>
              <text x={56} y={y + 26} fontSize={16} fontWeight={800} fill="#1a1614">
                {step.actor ?? step.text}
              </text>
              {step.actor ? (
                <text x={56} y={y + 48} fontSize={14} fill="#47413b">
                  {step.text}
                </text>
              ) : null}
              {index < n - 1 ? (
                <line x1={30} y1={y + 66} x2={30} y2={y + 78} stroke="#a83a0f" strokeWidth={2} markerEnd={`url(#${markerM})`} />
              ) : null}
            </g>
          );
        })}
      </svg>
    </>
  );
}
