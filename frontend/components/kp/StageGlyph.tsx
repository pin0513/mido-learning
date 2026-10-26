const ORDER = ["es", "jh", "sh", "uni"] as const;
const NAMES: Record<string, string> = { es: "國小", jh: "國中", sh: "高中", uni: "大學" };

/** 四個同心圓，這一站所在的階段是橘色。 */
export function StageGlyph({ stage, size = 36, label }: { stage: string; size?: number; label?: string }) {
  const rings = [20, 15, 10, 5];
  return (
    <svg className={size >= 64 ? "sg sg-lg" : "sg"} viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={label ?? NAMES[stage] ?? "階段"}>
      {ORDER.map((id, index) => (
        <circle key={id} cx="20" cy="20" r={rings[index]} className={id === stage ? "x" : index % 2 === 0 ? "a" : "b"} />
      ))}
    </svg>
  );
}
