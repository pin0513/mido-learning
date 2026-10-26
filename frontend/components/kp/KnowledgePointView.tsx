import Link from "next/link";
import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { competencyName, disciplineTitle, layerName, stageName } from "@/lib/content";
import { competencyPath, disciplinePath, knowledgePointPath, learningPathPath, stagePath } from "@/lib/kp/routes";
import { ColearnCard } from "./ColearnCard";
import { Estimator } from "./Estimator";
import { StageGlyph } from "./StageGlyph";
import { KpSlides } from "./KpSlides";
import { LicenseNotice } from "./LicenseNotice";

const textLink =
  "font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]";

const AUDIENCE_LABEL: Record<string, string> = {
  kid: "孩子",
  adult: "大人",
  family: "家庭一起讀",
};

function LinkedIds({
  ids,
  all,
  visibleIds,
}: {
  ids: string[];
  all: ContentCatalog;
  visibleIds: Set<string>;
}) {
  const known = ids.filter((id) => all.indexes.byId.has(id));
  const visible = known.filter((id) => visibleIds.has(id));
  const hidden = known.length - visible.length;
  if (visible.length === 0 && hidden === 0) return <p className="text-sm text-[#3d3830]">沒有</p>;
  return (
    <ul className="space-y-2 text-sm">
      {visible.map((id) => {
        const point = all.indexes.byId.get(id);
        if (!point) return null;
        return (
          <li key={id}>
            <Link href={knowledgePointPath(point.concept, point.stage)} className={textLink}>
              {point.title}
            </Link>
            <span className="text-[#3d3830]">
              {" "}
              · {layerName(all, point.layer)} · {stageName(all, point.stage)}
            </span>
          </li>
        );
      })}
      {hidden > 0 ? <li>另有 {hidden} 個知識點尚未發布</li> : null}
    </ul>
  );
}

export function KnowledgePointView({
  point,
  all,
  visible,
}: {
  point: KnowledgePoint;
  all: ContentCatalog;
  visible: ContentCatalog;
}) {
  const visibleIds = new Set(visible.points.map((item) => item.id));
  const stage = stageName(all, point.stage);
  const layer = layerName(all, point.layer);
  const folderName = disciplineTitle(all, point.folder);
  const neighbors = visible.indexes.neighbors.get(point.id) ?? [];
  const requiredBy = (visible.indexes.requiredBy.get(point.id) ?? [])
    .map((id) => visible.indexes.byId.get(id))
    .filter((item): item is KnowledgePoint => Boolean(item));
  const colearnPaths = all.paths.filter((path) => path.colearn && path.knowledgePointIds.includes(point.id));
  const showCurriculum = point.stage !== "uni" && point.curriculum108;

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <nav aria-label="麵包屑" className="text-sm">
        <ol className="flex flex-wrap gap-x-2 gap-y-1">
          <li>
            <Link href="/kp" className={textLink}>
              知識地圖
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={disciplinePath(point.folder)} className={textLink}>
              {folderName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/kp/layer/${point.layer}`} className={textLink}>
              {layer}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={stagePath(point.stage)} className={textLink}>
              {stage}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mt-6">
        <div className="flex flex-wrap gap-2">
          {point.status !== "published" ? (
            <span data-testid="kp-draft" className="border border-[#1a1614] bg-[#1a1614] px-2 py-1 text-xs font-semibold text-[#faf9f7]">
              {point.status === "review" ? "審核中" : "草稿"}
            </span>
          ) : null}
          <span className="border border-[#c0bab2] bg-white px-2 py-1 text-xs">{layer}</span>
          <span className="border border-[#c0bab2] bg-white px-2 py-1 text-xs">{stage}</span>
        </div>
        <h1 className="head" style={{ marginTop: 16 }}>{point.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <StageGlyph stage={point.stage} label={stage} />
          <p className="small" style={{ margin: 0 }}>{stage}・{layer}</p>
        </div>
        <p className="lead" style={{ marginTop: 16 }}>{point.idea}</p>
        {point.id.startsWith("pm.estimate@") ? <Estimator /> : null}
      </header>

      {point.toVerify ? (
        <aside data-testid="kp-to-verify" role="note" className="mt-6 border border-[#1a1614] bg-white p-4">
          <p className="font-bold">課綱對應待核對</p>
          {point.verifyNotes.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {point.verifyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </aside>
      ) : null}

      <section className="mt-8" aria-labelledby="kp-scenario-heading">
        <h2 id="kp-scenario-heading" className="text-xl font-bold">
          情境
        </h2>
        <p className="mt-2 max-w-3xl leading-7">{point.scenario}</p>
      </section>

      <section className="mt-8" aria-labelledby="kp-questions-heading">
        <h2 id="kp-questions-heading" className="text-xl font-bold">
          引導問題
        </h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 leading-7">
          {point.guidingQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="kp-path-heading">
        <h2 id="kp-path-heading" className="text-xl font-bold">
          學科路徑
        </h2>
        <p className="mt-2 leading-7">{point.disciplinePath.join(" / ")}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="border border-[#c0bab2] bg-white p-3">
            <dt className="font-semibold">階段</dt>
            <dd className="mt-1">
              <Link href={stagePath(point.stage)} className={textLink}>
                {stage}
              </Link>
              {point.grades.length > 0 ? <span> · {point.grades.join("、")} 年級</span> : null}
            </dd>
          </div>
          <div className="border border-[#c0bab2] bg-white p-3">
            <dt className="font-semibold">層級</dt>
            <dd className="mt-1">
              <Link href={`/kp/layer/${point.layer}`} className={textLink}>
                {layer}
              </Link>
            </dd>
          </div>
        </dl>
        {point.audience.length > 0 ? (
          <p className="mt-3 text-sm">讀者：{point.audience.map((item) => AUDIENCE_LABEL[item] ?? item).join("、")}</p>
        ) : null}
      </section>

      {showCurriculum && point.curriculum108 ? (
        <section data-testid="kp-curriculum" className="mt-8" aria-labelledby="kp-curriculum-heading">
          <h2 id="kp-curriculum-heading" className="text-xl font-bold">
            課綱對應
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#3d3830]">只列領域與總綱核心素養（A1–C3），不列學習表現或選修科目名稱。</p>
          <dl className="mt-3 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold">領域</dt>
              <dd>{point.curriculum108.domains.join("、")}</dd>
            </div>
            <div>
              <dt className="font-semibold">核心素養</dt>
              <dd>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {point.curriculum108.coreCompetencies.map((code) => (
                    <li key={code}>
                      <Link href={competencyPath(code)} className={`${textLink} inline-flex min-h-11 items-center border border-[#c0bab2] bg-white px-3`}>
                        {code} {competencyName(all, code)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            {point.curriculum108.issues.length > 0 ? (
              <div>
                <dt className="font-semibold">議題</dt>
                <dd>{point.curriculum108.issues.join("、")}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="kp-skill-heading">
        <h2 id="kp-skill-heading" className="text-xl font-bold">
          能力標籤
        </h2>
        <p className="mt-2 text-sm text-[#3d3830]">這是網站自己的專才／通才標籤，不是課綱代碼。</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="border border-[#c0bab2] bg-white p-3 text-sm">
            <h3 className="font-semibold">專才</h3>
            <p className="mt-1">{point.specialist.join("、")}</p>
          </div>
          <div className="border border-[#c0bab2] bg-white p-3 text-sm">
            <h3 className="font-semibold">通才</h3>
            <p className="mt-1">{point.generalist.join("、")}</p>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="kp-ai-heading">
        <h2 id="kp-ai-heading" className="text-xl font-bold">
          人機分工
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="border border-[#c0bab2] bg-white p-3 text-sm leading-6">
            <h3 className="font-semibold">可以交給工具</h3>
            <ul className="mt-2 list-disc pl-5">
              {point.delegable.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="border border-[#c0bab2] bg-white p-3 text-sm leading-6">
            <h3 className="font-semibold">要自己經歷</h3>
            <ul className="mt-2 list-disc pl-5">
              {point.humanExperience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="kp-prereq-heading">
        <h2 id="kp-prereq-heading" className="text-xl font-bold">
          先備
        </h2>
        <div className="mt-2">
          <LinkedIds ids={point.prerequisites} all={all} visibleIds={visibleIds} />
        </div>
        {requiredBy.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">把這裡當先備</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {requiredBy.map((item) => (
                <li key={item.id}>
                  <Link href={knowledgePointPath(item.concept, item.stage)} className={textLink}>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="kp-links-heading">
        <h2 id="kp-links-heading" className="text-xl font-bold">
          連結
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["why", "為什麼", point.links.why],
              ["how", "怎麼用", point.links.how],
              ["related", "相關", point.links.related],
              ["deeper", "下一個深度", point.links.deeper],
            ] as const
          ).map(([key, label, ids]) => (
            <div key={key} className="border border-[#c0bab2] bg-white p-3">
              <h3 className="text-sm font-semibold">{label}</h3>
              <div className="mt-2">
                <LinkedIds ids={ids} all={all} visibleIds={visibleIds} />
              </div>
            </div>
          ))}
        </div>
        {point.linkNotes ? (
          <p className="mt-4 text-sm leading-6 text-[#3d3830]">跨學門關聯：{point.linkNotes}</p>
        ) : null}
      </section>

      <KpSlides componentIds={point.slides} title={point.title} />

      {point.article ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">文章</h2>
          <p className="mt-2 leading-7">{point.article}</p>
        </section>
      ) : null}
      {point.exercise ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">練習</h2>
          <p className="mt-2 leading-7">{point.exercise}</p>
        </section>
      ) : null}
      {point.project ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">專題</h2>
          <p className="mt-2 leading-7">{point.project}</p>
        </section>
      ) : null}
      {point.aiPrompt ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">提問提示</h2>
          <p className="mt-2 leading-7">{point.aiPrompt}</p>
        </section>
      ) : null}
      {point.game ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">遊戲說明</h2>
          <p className="mt-2 text-sm text-[#3d3830]">遊戲維持獨立格式，這一頁只放說明，不內嵌遊戲。</p>
          <p className="mt-2 leading-7">{point.game}</p>
        </section>
      ) : null}

      {colearnPaths.map((path) => (
        <ColearnCard
          key={path.id}
          pathTitle={path.title}
          pathHref={learningPathPath(path.id)}
          colearn={path.colearn ?? ""}
          questions={point.guidingQuestions}
          scenario={point.scenario}
        />
      ))}

      {neighbors.length > 0 ? (
        <section className="mt-10" aria-labelledby="kp-pathpos-heading">
          <h2 id="kp-pathpos-heading" className="text-xl font-bold">
            在主線上的位置
          </h2>
          <ul className="mt-3 space-y-3">
            {neighbors.map((neighbor) => {
              const previous = neighbor.previousId ? all.indexes.byId.get(neighbor.previousId) : undefined;
              const next = neighbor.nextId ? all.indexes.byId.get(neighbor.nextId) : undefined;
              return (
                <li key={neighbor.pathId} className="border border-[#c0bab2] bg-white p-3 text-sm leading-6">
                  <Link href={learningPathPath(neighbor.pathId)} className={textLink}>
                    {neighbor.pathTitle}
                  </Link>
                  <p className="mt-1">
                    前一筆：
                    {previous && visibleIds.has(previous.id) ? (
                      <Link href={knowledgePointPath(previous.concept, previous.stage)} className={textLink}>
                        {previous.title}
                      </Link>
                    ) : (
                      "沒有"
                    )}
                  </p>
                  <p>
                    後一筆：
                    {next && visibleIds.has(next.id) ? (
                      <Link href={knowledgePointPath(next.concept, next.stage)} className={textLink}>
                        {next.title}
                      </Link>
                    ) : (
                      "沒有"
                    )}
                    {next && point.links.deeper.includes(next.id) ? <span> · 下一個深度</span> : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <footer className="mt-10 text-sm text-[#3d3830]">
        <p>作者：{point.authors.join("、")}</p>
        <p>
          更新：<time dateTime={point.updated}>{point.updated}</time>
        </p>
      </footer>
      <LicenseNotice />
    </article>
  );
}
