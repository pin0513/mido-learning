import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import type { KnowledgeFigure, KnowledgeSource } from "@/lib/content/types";
import type { Block, Circle } from "@/lib/kp/circle";
import { Compare } from "./figures/Compare";
import { Flow } from "./figures/Flow";
import { Spelling } from "./figures/Spelling";
import { SymbolGrid } from "./figures/SymbolGrid";
import { ToneChart } from "./figures/ToneChart";
import { PointLinks } from "./PointLinks";
import { HeadingLine, RichText, TitleLine, type PointRefs } from "./text";

const PREFIX = { why: "為什麼學", how: "怎麼學", what: "學什麼" } as const;

const RING: Record<Circle["kind"], [string, string, string]> = {
  why: ["#ffe9df", "#ffd2bd", "#ff5b22"],
  how: ["#ffe9df", "#ff5b22", "#ffd2bd"],
  what: ["#ff5b22", "#ffd2bd", "#ffe9df"],
};

function cite(figure: { caption?: string; source?: string }, sources: KnowledgeSource[] | undefined, sourceOnly: boolean): string | null {
  const source = sources?.find((item) => item.id === figure.source);
  const book = source ? `《${source.title}》` : "";
  if (sourceOnly) return source ? `依${source.publisher}${book}。` : null;
  if (figure.caption && book) {
    const caption = figure.caption.endsWith("。") ? figure.caption : `${figure.caption}。`;
    return `${caption}依${book}。`;
  }
  if (figure.caption) return figure.caption;
  if (source) return `依${source.publisher}${book}。`;
  return null;
}

function FigureGraphic({ figure }: { figure: KnowledgeFigure }) {
  if (figure.type === "compare") return <Compare figure={figure} />;
  if (figure.type === "flow") return <Flow figure={figure} />;
  if (figure.type === "spelling") return <Spelling figure={figure} />;
  if (figure.type === "tone_chart") return <ToneChart figure={figure} />;
  if (figure.type === "symbol_grid") return <SymbolGrid figure={figure} />;
  return null;
}

function FigureBlock({
  figure,
  notes,
  sources,
  refs,
}: {
  figure: KnowledgeFigure;
  notes?: string[];
  sources: KnowledgeSource[] | undefined;
  refs: PointRefs;
}) {
  if (figure.type === "unknown") return null;
  if (figure.type === "symbol_grid") {
    const line = cite(figure, sources, true);
    return (
      <>
        {figure.title ? <h3><TitleLine title={figure.title} /></h3> : null}
        {figure.caption ? <p><RichText text={figure.caption} refs={refs} /></p> : null}
        <figure className="v2-fig">
          <FigureGraphic figure={figure} />
          {line ? <figcaption><RichText text={line} refs={refs} /></figcaption> : null}
        </figure>
      </>
    );
  }
  const line = cite(figure, sources, false);
  return (
    <>
      {figure.title ? <h3><TitleLine title={figure.title} /></h3> : null}
      <figure className="v2-fig">
        <FigureGraphic figure={figure} />
        {notes && notes.length > 0 ? (
          <ul className="v2-rules">
            {notes.map((note) => (
              <li key={note}><RichText text={note} refs={refs} /></li>
            ))}
          </ul>
        ) : null}
        {line ? <figcaption><RichText text={line} refs={refs} /></figcaption> : null}
      </figure>
    </>
  );
}

function ExampleRow({ example, refs }: { example: string; refs: PointRefs }) {
  const parts = example.split(/\s*(?:→|->)\s*/).filter(Boolean);
  if (parts.length < 2) return <p className="v2-example"><RichText text={example} refs={refs} /></p>;
  return (
    <div className="v2-method-row">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 ? <span className="v2-arr" aria-hidden="true">→</span> : null}
          <RichText text={part} refs={refs} />
        </span>
      ))}
    </div>
  );
}

function Blocks({
  blocks,
  point,
  all,
  visible,
  refs,
}: {
  blocks: Block[];
  point: KnowledgePoint;
  all: ContentCatalog;
  visible: ContentCatalog;
  refs: PointRefs;
}) {
  const figures = new Map((point.figures ?? []).map((figure) => [figure.id, figure]));
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        if (block.kind === "paragraphs") {
          return (
            <div key={key}>
              {block.texts.map((text) => (
                <p key={text}><RichText text={text} refs={refs} /></p>
              ))}
            </div>
          );
        }
        if (block.kind === "questions") {
          return (
            <ul className="v2-questions" key={key}>
              {block.items.map((item) => (
                <li key={item}><RichText text={item} refs={refs} /></li>
              ))}
            </ul>
          );
        }
        if (block.kind === "uses") {
          const count = block.items.length;
          const cols = count <= 3 ? count : count % 3 === 0 ? 3 : 2;
          return (
            <div key={key}>
              {block.title ? <h3><TitleLine title={block.title} /></h3> : null}
              <ul className="v2-uses" data-cols={cols} data-span-last={count % cols === 0 ? undefined : "yes"}>
                {block.items.map((item) => (
                  <li key={item.title}>
                    <b>{item.title}</b>
                    <span><RichText text={item.text} refs={refs} /></span>
                    {item.code ? <span className="v2-code">課綱 {item.code}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (block.kind === "methods") {
          return (
            <div className="v2-method" role="group" aria-label="做法" key={key}>
              {block.items.map((item) => (
                <div key={item.title}>
                  <b>{item.title}</b>
                  {item.example ? <ExampleRow example={item.example} refs={refs} /> : null}
                  <p><RichText text={item.text} refs={refs} /></p>
                </div>
              ))}
            </div>
          );
        }
        if (block.kind === "checklist") {
          return (
            <div className="v2-check-block" key={key}>
              {block.title ? <p className="v2-check-title">{block.title}</p> : null}
              <ul className="v2-check">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (block.kind === "scenario") {
          const figure = block.figureId ? figures.get(block.figureId) : undefined;
          return (
            <div key={key}>
              {block.title ? <h3><TitleLine title={block.title} /></h3> : null}
              {block.text ? <p><RichText text={block.text} refs={refs} /></p> : null}
              {figure && figure.type !== "unknown" ? (
                <figure className="v2-fig">
                  <FigureGraphic figure={figure} />
                  {block.caption ? <figcaption><RichText text={block.caption} refs={refs} /></figcaption> : null}
                </figure>
              ) : block.caption ? <p><RichText text={block.caption} refs={refs} /></p> : null}
            </div>
          );
        }
        if (block.kind === "review") {
          return (
            <div className="v2-review" key={key}>
              <b>怎麼知道學會了</b>
              <p><RichText text={block.text} refs={refs} /></p>
            </div>
          );
        }
        if (block.kind === "ai") {
          if (block.delegable.length === 0 && block.human.length === 0) return null;
          return (
            <div key={key}>
              <h3>人和工具怎麼分工</h3>
              <div className="v2-split">
                {block.delegable.length > 0 ? (
                  <div>
                    <b>可以交給工具</b>
                    {block.delegable.map((item) => <p key={item}><RichText text={item} refs={refs} /></p>)}
                  </div>
                ) : null}
                {block.human.length > 0 ? (
                  <div>
                    <b>要自己經歷</b>
                    {block.human.map((item) => <p key={item}><RichText text={item} refs={refs} /></p>)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        }
        if (block.kind === "figure" || block.kind === "figureQa") {
          const figure = figures.get(block.kind === "figure" ? block.id : block.figureId);
          if (!figure) return null;
          if (block.kind === "figureQa") {
            const line = cite(figure, point.sources, false);
            return (
              <figure className="v2-fig" key={key}>
                <div className="v2-why-grid">
                  {figure.type === "compare" ? <Compare figure={figure} stacked /> : <FigureGraphic figure={figure} />}
                  <div className="v2-ans">
                    <p className="v2-q"><RichText text={block.question} refs={refs} /></p>
                    <p><RichText text={block.answer} refs={refs} /></p>
                  </div>
                </div>
                {line ? <figcaption><RichText text={line} refs={refs} /></figcaption> : null}
              </figure>
            );
          }
          return <FigureBlock key={key} figure={figure} notes={block.notes} sources={point.sources} refs={refs} />;
        }
        if (block.kind === "qa") {
          return (
            <div className="v2-ans" key={key}>
              <p className="v2-q"><RichText text={block.question} refs={refs} /></p>
              <p><RichText text={block.answer} refs={refs} /></p>
            </div>
          );
        }
        if (block.kind === "links") {
          return (
            <PointLinks
              key={key}
              ids={block.ids}
              all={all}
              visible={visible}
              currentFolder={point.folder}
              empty=""
            />
          );
        }
        if (block.kind === "formats") {
          return (
            <ul className="v2-formats" key={key}>
              {block.items.map((item) => (
                <li key={item.label}>
                  <b>{item.label}</b>
                  <span><RichText text={item.text} refs={refs} /></span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "notes") {
          return (
            <aside className="v2-note" aria-label="說明" key={key}>
              <b>說明</b>
              {block.items.length === 1 ? (
                <p><RichText text={block.items[0]} refs={refs} /></p>
              ) : (
                <ul>
                  {block.items.map((item) => (
                    <li key={item}><RichText text={item} refs={refs} /></li>
                  ))}
                </ul>
              )}
            </aside>
          );
        }
        return <p className="v2-placeholder" key={key}>{block.text}</p>;
      })}
    </>
  );
}

export function CircleSection({
  circle,
  point,
  all,
  visible,
  refs,
}: {
  circle: Circle;
  point: KnowledgePoint;
  all: ContentCatalog;
  visible: ContentCatalog;
  refs: PointRefs;
}) {
  const [outer, mid, inner] = RING[circle.kind];
  const headingId = `${circle.kind}-h`;
  return (
    <section className="v2-sec" id={circle.kind} aria-labelledby={headingId}>
      <div className="v2-sec-h">
        <svg className="v2-ring" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="19" fill={outer} />
          <circle cx="20" cy="20" r="13" fill={mid} />
          <circle cx="20" cy="20" r="7" fill={inner} />
        </svg>
        <h2 id={headingId}>
          {circle.converted ? <HeadingLine lead={PREFIX[circle.kind]} tail={circle.heading} /> : PREFIX[circle.kind]}
        </h2>
      </div>
      <Blocks blocks={circle.blocks} point={point} all={all} visible={visible} refs={refs} />
    </section>
  );
}
