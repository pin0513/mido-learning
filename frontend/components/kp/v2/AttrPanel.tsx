import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { layerShortName, stageName } from "@/lib/content";

const AUDIENCE: Record<string, string> = {
  kid: "孩子",
  adult: "大人",
  family: "家庭一起讀",
};

const GRADE = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

export function gradeText(grades: number[]): string {
  return grades.map((grade) => `${GRADE[grade] ?? String(grade)}年級`).join("、");
}

export function pointFacts(point: KnowledgePoint, all: ContentCatalog) {
  const path = point.disciplinePath;
  const chip = path.slice(-2);
  return {
    stage: stageName(all, point.stage),
    grades: point.grades.length > 0 ? gradeText(point.grades) : "",
    layer: layerShortName(all, point.layer),
    subjectChip: chip.join("・"),
    subjectPath: path.join(" › "),
    time: point.estTime ? `學校：${point.estTime.school}` : "",
    readers: point.audience.map((item) => AUDIENCE[item] ?? item).join("、"),
    specialist: point.specialist,
    generalist: point.generalist,
  };
}

export function AttrChips({ facts }: { facts: ReturnType<typeof pointFacts> }) {
  const chips: Array<[string, string]> = [
    ["學段", facts.stage],
    ...(facts.grades ? [["年級", facts.grades] as [string, string]] : []),
    ["層級", facts.layer],
    ["學科", facts.subjectChip],
    ...(facts.time ? [["時間", facts.time] as [string, string]] : []),
  ];
  return (
    <ul className="v2-chips" aria-label="屬性">
      {chips.map(([label, value]) => (
        <li key={label} className={label === "學科" ? "v2-chip-wrap" : undefined}>
          <i>{label}</i>
          <b>{value}</b>
        </li>
      ))}
    </ul>
  );
}

export function AttrPanel({ facts }: { facts: ReturnType<typeof pointFacts> }) {
  const rows: Array<[string, string, boolean]> = [
    ["學段", facts.stage, true],
    ...(facts.grades ? [["年級", facts.grades, true] as [string, string, boolean]] : []),
    ["層級", facts.layer, true],
    ["學科", facts.subjectPath, true],
    ...(facts.time ? [["時間", facts.time, true] as [string, string, boolean]] : []),
    ...(facts.readers ? [["讀者", facts.readers, false] as [string, string, boolean]] : []),
  ];
  return (
    <section>
      <h2>屬性</h2>
      <dl className="v2-attrs">
        {rows.map(([label, value, inChips]) => (
          <div key={label} className={inChips ? "v2-in-chips" : undefined}>
            <dt>{label}</dt>
            <dd>{label === "學段" || label === "層級" ? <b>{value}</b> : value}</dd>
          </div>
        ))}
        {facts.specialist.length > 0 || facts.generalist.length > 0 ? (
          <div>
            <dt>能力</dt>
            <dd>
              {facts.specialist.map((item) => (
                <span className="v2-pill" key={`s-${item}`}>專才：{item}</span>
              ))}
              {facts.generalist.map((item) => (
                <span className="v2-pill" key={`g-${item}`}>通才：{item}</span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
