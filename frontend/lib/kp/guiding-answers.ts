import type { KnowledgePoint } from "../content/types";

/**
 * 引導問題的回答：why／how／what 三圈各自可以帶一組 qa，題目必定是 guiding_questions 其中一題
 * （內容規則會擋）。回傳「題目 → 回答」，依 why、how、what 的順序；同一題出現兩次時留第一個。
 * 詳細頁（v1）用它把回答放在對應的引導問題下面。
 */
export function guidingAnswers(point: Pick<KnowledgePoint, "why" | "how" | "what">): Map<string, string> {
  const answers = new Map<string, string>();
  for (const part of [point.why, point.how, point.what]) {
    const qa = part?.qa;
    if (qa && qa.question && qa.answer && !answers.has(qa.question)) answers.set(qa.question, qa.answer);
  }
  return answers;
}
