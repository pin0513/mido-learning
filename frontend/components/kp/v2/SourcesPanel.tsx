import type { KnowledgePoint } from "@/lib/content";
import { RichText } from "./text";

/** 引用說明超過這個字數就收進「引用重點」，側欄才不會被一兩份來源拉得很長。 */
const SUPPORTS_INLINE = 40;

export function SourcesPanel({ sources }: { sources: KnowledgePoint["sources"] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section>
      <h2>出處</h2>
      <ol className="v2-srcs">
        {sources.map((source) => {
          const supports = source.supports ?? "";
          const inline = supports && [...supports].length <= SUPPORTS_INLINE;
          return (
            <li key={source.url}>
              <a className="v2-hit" href={source.url}>
                <span>{source.title}</span>
                <small>
                  <RichText text={inline ? `${source.publisher}。${supports}` : source.publisher} />
                </small>
              </a>
              {supports && !inline ? (
                <details className="v2-src-more">
                  <summary>引用重點</summary>
                  <p><RichText text={supports} /></p>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
