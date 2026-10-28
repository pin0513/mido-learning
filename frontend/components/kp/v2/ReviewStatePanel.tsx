import type { KnowledgePoint } from "@/lib/content";

export function ReviewStatePanel({ point, converted }: { point: KnowledgePoint; converted: boolean }) {
  const authors = point.authors.join("、");
  return (
    <section aria-labelledby="v2-review-h">
      <h2 id="v2-review-h">審閱狀態</h2>
      {point.toVerify ? (
        <p className="v2-rs-line">
          <span className="v2-status">待核對</span>
          <span>內容已上線，尚待老師核對。</span>
        </p>
      ) : null}
      {converted ? null : (
        <p className="v2-rs-line">
          <span className="v2-status v2-status-muted">內容補強中</span>
          <span>這一頁的黃金圈內容還在補，先用既有內容呈現。</span>
        </p>
      )}
      {point.toVerify && point.verifyNotes.length > 0 ? (
        <details>
          <summary>要核對的地方（{point.verifyNotes.length}）</summary>
          <ul>
            {point.verifyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="v2-byline">
        {authors ? `作者 ${authors}，` : ""}
        更新於 {point.updated}
      </p>
    </section>
  );
}
