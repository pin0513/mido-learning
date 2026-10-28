const SUFFIX = new Set(["ˉ", "ˊ", "ˇ", "ˋ"]);

export function splitBopomofo(reading: string): { dot: boolean; body: string; tone: string } {
  let text = reading;
  let dot = false;
  if (text.startsWith("˙")) {
    dot = true;
    text = text.slice(1);
  }
  const last = text.slice(-1);
  if (SUFFIX.has(last)) return { dot, body: text.slice(0, -1), tone: last };
  return { dot, body: text, tone: "" };
}

/** 調號用筆畫，不靠字型。座標是 28×28，左上角在 (x, y)。 */
export function ToneMark({ mark, x, y, size = 28 }: { mark: string; x: number; y: number; size?: number }) {
  if (!mark) return null;
  const scale = size / 28;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke="#a83a0f" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {mark === "ˉ" ? <path d="M6 14 H22" /> : null}
      {mark === "ˊ" ? <path d="M9 21 L19 7" /> : null}
      {mark === "ˇ" ? <path d="M7 8 L14 20 L21 8" /> : null}
      {mark === "ˋ" ? <path d="M9 7 L19 21" /> : null}
      {mark === "˙" ? <circle cx={14} cy={14} r={3.5} fill="#a83a0f" stroke="none" /> : null}
    </g>
  );
}

export function contourPath(contour: string): { d?: string; dot?: boolean } {
  if (contour === "high_level") return { d: "M10 12 L54 12" };
  if (contour === "rising") return { d: "M10 28 L54 10" };
  if (contour === "dipping") return { d: "M10 22 Q 26 46 54 14" };
  if (contour === "falling") return { d: "M10 10 L54 38" };
  return { dot: true };
}

const JIE = new Set(["ㄧ", "ㄨ", "ㄩ"]);

export function isMedialVowel(symbol: string): boolean {
  return JIE.has(symbol);
}
