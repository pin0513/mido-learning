import type { ToneChartFigure } from "@/lib/content/types";
import { ToneMark, contourPath, splitBopomofo } from "./marks";

const MARK_NAME: Record<string, string> = {
  "ˉ": "陰平調號",
  "ˊ": "陽平調號",
  "ˇ": "上聲調號",
  "ˋ": "去聲調號",
  "˙": "輕聲調號",
};

function Reading({ reading }: { reading: string }) {
  const parts = splitBopomofo(reading);
  return (
    <span className="v2-exz">
      {parts.dot ? <ToneMarkSvg mark="˙" label="" /> : null}
      {parts.body}
      {parts.tone ? <ToneMarkSvg mark={parts.tone} label="" /> : null}
    </span>
  );
}

function ToneMarkSvg({ mark, label }: { mark: string; label: string }) {
  return (
    <svg className="v2-mk" viewBox="0 0 28 28" role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <ToneMark mark={mark} x={0} y={0} size={28} />
    </svg>
  );
}

export function ToneChart({ figure }: { figure: ToneChartFigure }) {
  return (
    <ol className="v2-tones" aria-label={figure.alt}>
      {figure.tones.map((tone) => {
        const contour = contourPath(tone.contour);
        return (
          <li key={tone.name}>
            <svg viewBox="0 0 64 48" aria-hidden="true">
              <rect x={1} y={1} width={62} height={46} rx={6} fill="#f6f4ef" />
              {contour.d ? <path d={contour.d} stroke="#a83a0f" strokeWidth={4} strokeLinecap="round" fill="none" /> : null}
              {contour.dot ? <circle cx={32} cy={30} r={5} fill="#a83a0f" /> : null}
            </svg>
            <ToneMarkSvg mark={tone.mark} label={`${MARK_NAME[tone.mark] ?? tone.name} ${tone.mark}`} />
            <span className="v2-nm">{tone.name}</span>
            {tone.alias ? <span className="v2-nm2">{tone.alias}</span> : null}
            <span className="v2-ex">{tone.example}</span>
            <Reading reading={tone.reading} />
          </li>
        );
      })}
    </ol>
  );
}
