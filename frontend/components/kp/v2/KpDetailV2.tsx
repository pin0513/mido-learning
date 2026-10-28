import Link from "next/link";
import { Fragment } from "react";
import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { buildCircles } from "@/lib/kp/circle";
import { disciplinePath, stagePath } from "@/lib/kp/routes";
import { AttrChips, AttrPanel, pointFacts } from "./AttrPanel";
import { CircleSection } from "./CircleSection";
import { CurriculumPanel } from "./CurriculumPanel";
import "./detail.css";
import { GoldenCircleNav } from "./GoldenCircleNav";
import { ReviewStatePanel } from "./ReviewStatePanel";
import { SeqPanel } from "./SeqPanel";
import { SourcesPanel } from "./SourcesPanel";
import { RichText, TitleLine } from "./text";

export function KpDetailV2({
  point,
  all,
  visible,
}: {
  point: KnowledgePoint;
  all: ContentCatalog;
  visible: ContentCatalog;
}) {
  const built = buildCircles(point, visible);
  const facts = pointFacts(point, all);
  const crumbs = point.disciplinePath.length > 1 ? point.disciplinePath.slice(0, -1) : point.disciplinePath;
  return (
    <article className="kp-detail" data-testid="kp-detail-v2" data-converted={built.converted ? "yes" : "no"}>
      <nav className="v2-crumbs" aria-label="麵包屑">
        <Link className="v2-hit v2-crumb" href="/kp">知識地圖</Link>
        {crumbs.map((segment, index) => (
          <Fragment key={`${segment}-${index}`}>
            <span className="v2-sep" aria-hidden="true">/</span>
            {index === 0 ? (
              <Link className="v2-hit v2-crumb" href={disciplinePath(point.folder)}>{segment}</Link>
            ) : (
              <span className="v2-crumb">{segment}</span>
            )}
          </Fragment>
        ))}
        <span className="v2-sep" aria-hidden="true">/</span>
        <Link className="v2-hit v2-crumb" href={stagePath(point.stage)}>{facts.stage}</Link>
      </nav>

      <div className="v2-layout">
        <div className="v2-main">
          <header className="v2-hero">
            {point.status !== "published" ? (
              <p className="v2-draft">{point.status === "review" ? "審核中" : "草稿"}</p>
            ) : null}
            <h1><TitleLine title={point.title} /></h1>
            <AttrChips facts={facts} />
            {point.idea ? <p className="v2-lead"><RichText text={point.idea} /></p> : null}
            {point.goal ? (
              <div className="v2-goal">
                <b>學完能做到</b>
                <p><RichText text={point.goal} /></p>
              </div>
            ) : null}
          </header>
          <GoldenCircleNav circles={built.circles} point={point} />
          {built.circles.map((circle) => (
            <CircleSection key={circle.kind} circle={circle} point={point} all={all} visible={visible} />
          ))}
        </div>
        <aside className="v2-aside" aria-label="知識點屬性與出處" data-testid="v2-aside">
          <div className="v2-panel">
            <AttrPanel facts={facts} />
            <SeqPanel point={point} all={all} visible={visible} />
            <CurriculumPanel point={point} all={all} />
            <SourcesPanel sources={point.sources} />
            <ReviewStatePanel point={point} converted={built.converted} />
          </div>
        </aside>
      </div>
    </article>
  );
}
