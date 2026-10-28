import type { KnowledgePoint } from "@/lib/content";

export function SourcesPanel({ sources }: { sources: KnowledgePoint["sources"] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section>
      <h2>出處</h2>
      <ol className="v2-srcs">
        {sources.map((source) => (
          <li key={source.url}>
            <a className="v2-hit" href={source.url}>
              <span>{source.title}</span>
              <small>
                {source.publisher}
                {source.supports ? `。${source.supports}` : ""}
              </small>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
