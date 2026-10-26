"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { recordPageView } from "@/lib/api/analytics";
import type { DisciplineGlyph, HomeDiagram, HomeModel, HomeNode, HomeTask, TaskCross } from "@/lib/kp/home-diagram";
import type { HomeState } from "@/lib/kp/home-state";
import { routeWires, type WireJoint, type WirePath } from "@/lib/kp/home-wires";
import "./home-v2.css";

const TONE = { norm: "#3a3834", hi: "#e4571e", dim: "#cfcbc3" } as const;
const PARENT_TIP = "國小的點，孩子可以自己先看；高中、大學的點，適合大人陪著讀，或自己先讀。";

interface Box {
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function useBoxes(key: string) {
  const root = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const read = () => {
      const current = root.current;
      if (!current) return;
      const bounds = current.getBoundingClientRect();
      if (bounds.width < 2) return;
      const next: Record<string, Box> = {};
      current.querySelectorAll<HTMLElement>("[data-anchor]").forEach((node) => {
        const id = node.dataset.anchor;
        if (!id) return;
        const rect = node.getBoundingClientRect();
        next[id] = {
          x: Math.round(rect.left + rect.width / 2 - bounds.left),
          y: Math.round(rect.top + rect.height / 2 - bounds.top),
          left: Math.round(rect.left - bounds.left),
          right: Math.round(rect.right - bounds.left),
          top: Math.round(rect.top - bounds.top),
          bottom: Math.round(rect.bottom - bounds.top),
        };
      });
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    read();
    const frame = window.requestAnimationFrame(read);
    const observer = new ResizeObserver(read);
    observer.observe(host);
    window.addEventListener("resize", read);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [key]);
  return { root, boxes };
}

function Glyph({ name, size = 18, color = "#1d1c1a" }: { name: DisciplineGlyph; size?: number; color?: string }) {
  const common = { width: size, height: size, viewBox: `0 0 ${size} ${size}`, "aria-hidden": true as const, className: "hv2-gl" };
  if (name === "square") {
    return <svg {...common}><rect x="3" y="3" width={size - 6} height={size - 6} rx="2" fill={color} /></svg>;
  }
  if (name === "circle") {
    return <svg {...common}><circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill={color} /></svg>;
  }
  if (name === "triangle") {
    return <svg {...common}><path d={`M${size / 2} 3 L${size - 3} ${size - 3} L3 ${size - 3} Z`} fill={color} /></svg>;
  }
  return <svg {...common}><path d={`M${size / 2} 2.5 L${size - 2.5} ${size / 2} L${size / 2} ${size - 2.5} L2.5 ${size / 2} Z`} fill={color} /></svg>;
}

function Logo() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <rect x="1.5" y="1.5" width="27" height="27" rx="15" fill="#1d1c1a" />
      <path d="M15 7 V23" stroke="#e4571e" strokeWidth="2.6" />
      <circle cx="15" cy="9" r="3" fill="#fff" />
      <circle cx="15" cy="21" r="3" fill="#fff" />
    </svg>
  );
}

function HeroDeco() {
  const stems = [24, 84, 144, 204];
  return (
    <svg className="hv2-deco" width="240" height="92" viewBox="0 0 240 92" aria-hidden="true">
      <path d="M4 46 H236" stroke="#d3cfc6" strokeWidth="2" />
      {stems.map((x, index) => {
        const y = index % 2 ? 20 : 72;
        return (
          <g key={x}>
            <path d={`M${x} 46 V${y}`} stroke="#d3cfc6" strokeWidth="2" />
            <circle cx={x} cy={y} r="8" fill="#fff" stroke="#1d1c1a" strokeWidth="2.5" />
            <circle cx={x} cy={y} r="3.5" fill="#e4571e" />
            <circle cx={x} cy="46" r="4" fill="#3a3834" />
          </g>
        );
      })}
    </svg>
  );
}

function FooterLine() {
  const ticks = [];
  for (let x = 30, index = 0; x < 1180; x += 64, index += 1) {
    const up = index % 3 !== 1;
    const y = up ? 12 : 60;
    const accent = index % 4 === 0;
    ticks.push(
      <g key={x}>
        <path d={`M${x} 36 V${y}`} stroke="#d3cfc6" strokeWidth="1.6" />
        <circle cx={x} cy={y} r="6" fill="none" stroke={accent ? "#e4571e" : "#d3cfc6"} strokeOpacity={accent ? 0.7 : 1} strokeWidth="2" />
        <circle cx={x} cy="36" r="3" fill="#d3cfc6" />
      </g>,
    );
  }
  return (
    <div className="hv2-footline">
      <svg width="1200" height="72" viewBox="0 0 1200 72" aria-hidden="true">
        <path d="M0 36 H1200" stroke="#d3cfc6" strokeWidth="2" />
        {ticks}
      </svg>
    </div>
  );
}

function WireLayer({ prefix, paths, joints, ghost }: { prefix: string; paths: WirePath[]; joints: WireJoint[]; ghost?: string }) {
  return (
    <svg className="hv2-wires" aria-hidden="true">
      <defs>
        {(["norm", "hi", "dim"] as const).map((tone) => (
          <marker key={tone} id={`${prefix}-${tone}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke={TONE[tone]} strokeWidth="2" />
          </marker>
        ))}
      </defs>
      {ghost ? <path d={ghost} fill="none" stroke="#d9d5cc" strokeWidth="2.5" strokeDasharray="6 6" /> : null}
      {paths.map((path, index) => (
        <path
          key={`${path.d}-${index}`}
          d={path.d}
          fill="none"
          stroke={TONE[path.tone]}
          strokeWidth="2.5"
          strokeDasharray={path.kind === "ext" ? "7 6" : undefined}
          markerEnd={`url(#${prefix}-${path.tone})`}
        />
      ))}
      {joints.map((joint, index) => (
        <circle key={`${joint.x}-${joint.y}-${index}`} cx={joint.x} cy={joint.y} r="4.5" fill={TONE[joint.tone]} />
      ))}
    </svg>
  );
}

function glyphOf(model: HomeModel, mention: string): DisciplineGlyph {
  return model.disciplines.find((item) => item.mention === mention)?.glyph ?? "circle";
}

function NodeDetail({ node, model, homeHref }: { node: HomeNode; model: HomeModel; homeHref: string }) {
  return (
    <div className="hv2-det" data-testid="node-detail">
      <div className="hv2-bk">
        <Link className="hv2-backtext" href={homeHref}>← 回到目前任務</Link>
        <Link className="hv2-x" href={homeHref} aria-label="關閉">×</Link>
      </div>
      <div className="hv2-stg">{node.stageName} · {node.grades}</div>
      <h3>{node.title}</h3>
      <p className="hv2-idea">{node.idea}</p>
      <div className="hv2-rel">
        {node.prerequisites.map((item, index) => (
          <div key={item.href}><b>{index === 0 ? "先學" : ""}</b>{item.title} · {item.stageName}</div>
        ))}
        {node.next ? <div><b>接下來</b>{node.next.title} · {node.next.stageName}</div> : null}
      </div>
      {node.question ? <div className="hv2-q">想一想：{node.question}</div> : null}
      <div className="hv2-acts">
        <Link className="hv2-btn hv2-btn-pri" href={node.href}>開始學</Link>
        <Link className="hv2-btn hv2-btn-sec" href="/?view=task">加入目前任務</Link>
      </div>
      {node.also.length > 0 ? (
        <p className="hv2-xd">
          這一課也連到
          {node.also.map((mention) => (
            <span key={mention}> <Glyph name={glyphOf(model, mention)} size={14} color="#57544e" /> {mention}</span>
          ))}
          ，在「目前任務」裡看。
        </p>
      ) : null}
    </div>
  );
}

function TaskCard({ task }: { task: HomeTask }) {
  return (
    <div className="hv2-card" data-testid="task-card">
      <h3>目前任務：{task.title}</h3>
      <p className="hv2-sub">{task.summary}</p>
      <ol className="hv2-tl">
        {task.steps.map((step) => (
          <li key={step.id}><i>{step.index}</i><b>{step.title}</b><span>{step.stageName}</span></li>
        ))}
      </ol>
      {task.uses.length > 0 ? (
        <div className="hv2-uses">
          途中也會用到
          {task.uses.map((item) => (
            <span key={item.mention}> <Glyph name={item.glyph} size={14} color="#57544e" /> {item.mention}</span>
          ))}
        </div>
      ) : null}
      <Link className="hv2-btn hv2-btn-pri hv2-btn-block" href="/?view=task">打開任務圖</Link>
    </div>
  );
}

function StageDiagram({
  model,
  diagram,
  selected,
  disciplineTitle,
  readyTitle,
  readyHref,
}: {
  model: HomeModel;
  diagram: HomeDiagram;
  selected: HomeNode | null;
  disciplineTitle: string;
  readyTitle: string;
  readyHref: string;
}) {
  const { root, boxes } = useBoxes(`${diagram.id}:${selected?.id ?? ""}`);
  const placed = diagram.nodes.flatMap((node) => {
    const box = boxes[node.id];
    return box ? [{ id: node.id, x: box.x, y: box.y }] : [];
  });
  const routed = routeWires(placed, diagram.edges, selected?.id ?? null);
  const ghosts = model.stages.flatMap((stage) => {
    const box = boxes[`ghost-${stage.id}`];
    return box ? [box] : [];
  });
  let ghost = "";
  if (diagram.nodes.length === 0 && ghosts.length >= 2) {
    const ordered = [...ghosts].sort((a, b) => a.y - b.y);
    ghost = ordered.slice(0, -1).map((box, index) => `M ${box.x} ${box.y + 14} V ${ordered[index + 1].y - 14}`).join(" ");
  }
  const homeHref = `/?d=${diagram.id}`;

  return (
    <div className="hv2-diagram" ref={root} data-testid="stage-diagram">
      {model.stages.map((stage) => {
        const nodes = diagram.nodes.filter((node) => node.stageId === stage.id);
        const open = selected?.stageId === stage.id;
        return (
          <div className={open ? "hv2-zone is-open" : "hv2-zone"} key={stage.id} style={nodes.length > 1 ? { minHeight: nodes.length * 104 } : undefined}>
            <div className="hv2-zl">{stage.name}<small>{stage.grades}</small></div>
            {nodes.length === 0 ? <span className="hv2-ghost" data-anchor={`ghost-${stage.id}`} /> : null}
            {nodes.map((node, index) => (
              <Link
                key={node.id}
                href={`/?d=${diagram.id}&kp=${encodeURIComponent(node.id)}`}
                scroll={false}
                className={`hv2-node${selected?.id === node.id ? " is-on" : ""}${selected && selected.id !== node.id ? " is-dim" : ""}`}
                style={nodes.length > 1 ? { top: `${((index + 1) / (nodes.length + 1)) * 100}%` } : undefined}
                aria-current={selected?.id === node.id ? "page" : undefined}
              >
                <span className="hv2-fx" data-anchor={node.id} />
                <span className="hv2-lb"><b>{node.title}</b><span>{node.question}</span></span>
              </Link>
            ))}
            {open && selected ? (
              <div className="hv2-inline">
                <NodeDetail node={selected} model={model} homeHref={homeHref} />
              </div>
            ) : null}
          </div>
        );
      })}
      <WireLayer prefix={`stage-${diagram.id}`} paths={routed.paths} joints={routed.joints} ghost={ghost} />
      {diagram.nodes.length === 0 ? (
        <div className="hv2-msg" role="status">
          <h3>{disciplineTitle}正在準備中</h3>
          <p>知識點寫好、檢查過，就會出現在這張圖上。</p>
          {readyHref ? (
            <Link className="hv2-btn hv2-btn-pri" href={readyHref} scroll={false}>先看 {readyTitle}</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CrossCard({ cross }: { cross: TaskCross }) {
  const body = (
    <>
      <span className="hv2-chip"><Glyph name={cross.glyph} size={13} color="#57544e" /> {cross.label}</span>
      {cross.title ? <b>{cross.title}</b> : null}
    </>
  );
  if (cross.href) {
    return <Link className="hv2-xcard" href={cross.href} data-anchor={cross.key}>{body}</Link>;
  }
  return <div className="hv2-xcard" data-anchor={cross.key}>{body}</div>;
}

function TaskDiagram({ task }: { task: HomeTask }) {
  const { root, boxes } = useBoxes(task.id);
  const spine: string[] = [];
  const dashes: string[] = [];
  const dots: { x: number; y: number }[] = [];
  for (let index = 0; index < task.steps.length - 1; index += 1) {
    const from = boxes[task.steps[index].id];
    const to = boxes[task.steps[index + 1].id];
    if (!from || !to) continue;
    spine.push(`M ${from.x} ${from.y + 22} V ${to.y - 22}`);
  }
  for (const step of task.steps) {
    const origin = boxes[step.id];
    if (!origin) continue;
    for (const cross of step.crosses) {
      const card = boxes[cross.key];
      if (!card) continue;
      const sideBySide = Math.abs(card.y - origin.y) < 36;
      const towardLeft = card.x < origin.x;
      if (sideBySide && towardLeft) {
        const start = origin.x - 22;
        const end = card.right + 6;
        if (start > end + 10) {
          dashes.push(`M ${start} ${origin.y} H ${end}`);
          dots.push({ x: start, y: origin.y });
        }
      } else if (sideBySide) {
        const label = boxes[`label-${step.id}`];
        const start = label ? label.right + 8 : origin.x + 22;
        const end = card.left - 8;
        if (end > start + 10) {
          dashes.push(`M ${start} ${origin.y} H ${end}`);
          const dotX = label ? Math.round((origin.x + 20 + label.left) / 2) : origin.x + 22;
          dots.push({ x: dotX, y: origin.y });
        }
      } else {
        const end = towardLeft ? card.right + 4 : card.left - 4;
        dashes.push(`M ${origin.x} ${card.y} H ${end}`);
        dots.push({ x: origin.x, y: card.y });
      }
    }
  }

  return (
    <div className="hv2-diagram" ref={root}>
      {task.steps.map((step) => {
        const why = step.crosses.filter((cross) => cross.side === "why");
        const related = step.crosses.filter((cross) => cross.side === "related");
        return (
          <div className="hv2-tband" key={step.id}>
            <div className="hv2-zl">{step.stageName}<small>{step.grades}</small></div>
            <div className="hv2-step">
              <span className="hv2-sp" data-anchor={step.id}>{step.index}</span>
              <span className="hv2-lb" data-anchor={`label-${step.id}`}>
                <b>{step.title}</b>
                <span><Glyph name={step.glyph} size={12} color="#57544e" /> {step.disciplineTitle}<span className="hv2-only-narrow"> · {step.stageName}</span></span>
              </span>
            </div>
            {why.length > 0 ? <div className="hv2-xcol why">{why.map((cross) => <CrossCard key={cross.key} cross={cross} />)}</div> : <div className="hv2-xcol why" />}
            {related.length > 0 ? <div className="hv2-xcol related">{related.map((cross) => <CrossCard key={cross.key} cross={cross} />)}</div> : <div className="hv2-xcol related" />}
          </div>
        );
      })}
      <svg className="hv2-wires" aria-hidden="true">
        <defs>
          <marker id="task-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke="#3a3834" strokeWidth="2" />
          </marker>
        </defs>
        {spine.map((d) => <path key={d} d={d} fill="none" stroke="#e4571e" strokeWidth="6" strokeLinecap="round" />)}
        {dashes.map((d) => <path key={d} d={d} fill="none" stroke="#3a3834" strokeWidth="2.5" strokeDasharray="7 6" markerEnd="url(#task-arr)" />)}
        {dots.map((dot) => <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="5" fill="#e4571e" />)}
      </svg>
    </div>
  );
}

function Shell({ current, children }: { current: "map" | "task"; children: React.ReactNode }) {
  return (
    <div className="hv2">
      <a className="skip" href="#main">跳到主要內容</a>
      <header className="hv2-wrap hv2-top">
        <Link className="hv2-logo" href="/"><Logo />Mido Learning</Link>
        <nav className="hv2-nav" aria-label="主要">
          <Link className="hv2-navlink" href="/" aria-current={current === "map" ? "page" : undefined}>學門總圖</Link>
          <Link className="hv2-navlink" href="/?view=task" aria-current={current === "task" ? "page" : undefined}>目前任務</Link>
          <Link className="hv2-navlink" href="/components">投影片教材</Link>
          <Link className="hv2-login" href="/login">登入</Link>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="hv2-wrap hv2-foot">
        <FooterLine />
        <div className="hv2-ft">
          <span>Mido Learning · 親子一起看的知識圖</span>
          <span>國小到高中依 108 課綱分段</span>
        </div>
        <div className="hv2-more">
          <b>其他看法</b>
          <Link href="/kp/map?view=system">分層分段總圖</Link>
          <Link href="/kp/map">知識地圖</Link>
          <Link href="/kp/map?view=list">清單</Link>
          <span>授權：待定</span>
        </div>
      </footer>
    </div>
  );
}

function MapScreen({ model, state }: { model: HomeModel; state: HomeState }) {
  const discipline = model.disciplines.find((item) => item.id === state.disciplineId) ?? model.disciplines[0];
  const diagram = model.diagrams.find((item) => item.id === discipline?.id) ?? model.diagrams[0];
  const selected = diagram?.nodes.find((node) => node.id === state.nodeId) ?? null;
  const ready = model.disciplines.find((item) => item.ready);
  const homeHref = `/?d=${discipline?.id ?? ""}`;

  return (
    <Shell current="map">
      <section className="hv2-wrap hv2-hero">
        <div>
          <h1>先選學門，再從上往下看</h1>
          <p>圓點是知識點，線是先學、後學。</p>
        </div>
        <HeroDeco />
      </section>
      <div className="hv2-wrap">
        <div className="hv2-seg" role="group" aria-label="選擇學門" data-testid="discipline-switch">
          {model.disciplines.map((item) => (
            <Link
              key={item.id}
              href={`/?d=${item.id}`}
              scroll={false}
              className="hv2-sg"
              aria-pressed={item.id === discipline?.id}
              aria-current={item.id === discipline?.id ? "page" : undefined}
              aria-label={item.ready ? item.title : `${item.title}，準備中`}
            >
              <Glyph name={item.glyph} size={20} color={item.id === discipline?.id ? "#e4571e" : "#1d1c1a"} />
              <span className="hv2-full">{item.title}</span>
              <span className="hv2-short">{item.shortTitle}</span>
              {item.ready ? null : <small>準備中</small>}
            </Link>
          ))}
        </div>
        <div className="hv2-cols">
          <section className="hv2-panel" aria-labelledby="stage-map-title">
            <div className="hv2-ph">
              <div>
                <h2 id="stage-map-title">{discipline ? <Glyph name={discipline.glyph} size={20} color="#e4571e" /> : null} {discipline?.title}的學段總圖</h2>
                <p>{diagram && diagram.nodes.length > 0 ? "最上面是國小，越往下越進階。點一個圓點看它在學什麼。" : "這個學門的知識點還在整理。"}</p>
              </div>
              {diagram && diagram.edges.length > 0 ? (
                <div className="hv2-leg" aria-label="圖例">
                  <span><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H29" stroke="#3a3834" strokeWidth="2.5" /></svg>先學</span>
                  <span><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H29" stroke="#3a3834" strokeWidth="2.5" strokeDasharray="6 5" /></svg>可以延伸</span>
                </div>
              ) : null}
            </div>
            <div data-testid="home-diagram">
              {diagram && discipline ? (
                <StageDiagram
                  model={model}
                  diagram={diagram}
                  selected={selected}
                  disciplineTitle={discipline.title}
                  readyTitle={ready?.title ?? ""}
                  readyHref={ready ? `/?d=${ready.id}` : ""}
                />
              ) : null}
            </div>
          </section>
          <aside className="hv2-side">
            {selected ? (
              <div className="hv2-card hv2-side-det">
                <NodeDetail node={selected} model={model} homeHref={homeHref} />
              </div>
            ) : null}
            {model.task ? (
              <div className={selected ? "hv2-task-mobile" : undefined}>
                <TaskCard task={model.task} />
              </div>
            ) : null}
            {selected ? null : (
              <div className="hv2-tip"><b>給家長</b>{PARENT_TIP}</div>
            )}
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function TaskScreen({ model }: { model: HomeModel }) {
  const task = model.task;
  const back = `/?d=${task?.disciplineId ?? model.defaultDisciplineId}`;
  return (
    <Shell current="task">
      <section className="hv2-wrap hv2-thead">
        <div>
          <Link className="hv2-back" href={back}>← 回到學門總圖</Link>
          <h1>目前任務：{task?.title ?? "還沒有發布的路線"}</h1>
          <p>{task?.intro ?? "發布一條路線之後，步驟會排在這裡。"}</p>
        </div>
        <span className="hv2-note">虛線框的知識點還在準備中。</span>
      </section>
      {task ? (
        <div className="hv2-wrap" data-testid="task-view">
          <section className="hv2-panel">
            <div className="hv2-hleg">
              <span><Glyph name={task.steps[0]?.glyph ?? "square"} size={15} color="#57544e" /> {task.steps[0]?.disciplineTitle}</span>
              {task.uses.map((item) => (
                <span key={item.mention}><Glyph name={item.glyph} size={15} color="#57544e" /> {model.disciplines.find((discipline) => discipline.mention === item.mention)?.title ?? item.mention}</span>
              ))}
              <span><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H29" stroke="#e4571e" strokeWidth="6" strokeLinecap="round" /></svg>任務步驟</span>
              <span><svg width="30" height="10" aria-hidden="true"><path d="M1 5 H29" stroke="#3a3834" strokeWidth="2.5" strokeDasharray="6 5" /></svg>跨學門</span>
            </div>
            <TaskDiagram task={task} />
            <div className="hv2-go">
              <Link className="hv2-btn hv2-btn-pri" href={task.startHref}>從第 1 步開始</Link>
              <span>{task.startCaption}</span>
            </div>
          </section>
        </div>
      ) : null}
    </Shell>
  );
}

export function KnowledgeHome({ model, state }: { model: HomeModel; state: HomeState }) {
  useEffect(() => {
    recordPageView();
  }, []);
  if (state.task) return <TaskScreen model={model} />;
  return <MapScreen model={model} state={state} />;
}
