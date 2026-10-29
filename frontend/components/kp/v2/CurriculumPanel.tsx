import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { competencyName } from "@/lib/content";
import { RichText, type PointRefs } from "./text";

function CodeRows({ codes, catalog }: { codes: string[]; catalog: ContentCatalog }) {
  return (
    <dd>
      {codes.map((code) => {
        const entry = catalog.taxonomy.curriculumCodes.get(code);
        return (
          <div key={code}>
            <span className="v2-code">{code}</span>
            <span>{entry ? <RichText text={entry.text} /> : code}</span>
          </div>
        );
      })}
    </dd>
  );
}

export function CurriculumPanel({ point, all, refs }: { point: KnowledgePoint; all: ContentCatalog; refs: PointRefs }) {
  const curriculum = point.curriculum108;
  if (!curriculum && !point.linkNotes) return null;
  const performances = curriculum?.performances ?? [];
  const contents = curriculum?.contents ?? [];
  const competencies = curriculum?.coreCompetencies ?? [];
  return (
    <section className="v2-cur">
      <h2>108 課綱對應</h2>
      <dl>
        {competencies.length > 0 ? (
          <>
            <dt>核心素養</dt>
            <dd>
              {competencies.map((code) => (
                <div key={code}>
                  <span className="v2-code">{code}</span>
                  <span>{competencyName(all, code)}</span>
                </div>
              ))}
            </dd>
          </>
        ) : null}
        {performances.length > 0 ? (
          <>
            <dt>
              學習表現
              {point.toVerify ? <span className="v2-new">建議補入</span> : null}
            </dt>
            <CodeRows codes={performances} catalog={all} />
          </>
        ) : null}
        {contents.length > 0 ? (
          <>
            <dt>
              學習內容
              {point.toVerify ? <span className="v2-new">建議補入</span> : null}
            </dt>
            <CodeRows codes={contents} catalog={all} />
          </>
        ) : null}
        {point.linkNotes ? (
          <>
            <dt>跨學門關聯</dt>
            <dd className="v2-link-note">
              <RichText text={point.linkNotes} refs={refs} />
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
