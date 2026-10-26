/** 控制在 60 字以內，並把階段放進標題，避免和別的知識點撞名。 */
export function kpTitle(title: string, stageName: string): string {
  const withStage = `${title}（${stageName}）`;
  const full = `${withStage}｜知識地圖`;
  if (full.length <= 60) return full;
  return withStage.length <= 60 ? withStage : withStage.slice(0, 60);
}

/** 盡量落在 150–160 字。內容較短時補上固定的地圖說明，不另寫新的知識句子。 */
export function kpDescription(title: string, stageName: string, idea: string): string {
  const extras = ["收錄於 Mido Learning 知識地圖。", "可依學門、層級、階段與核心素養找到。"];
  let text = `${title}（${stageName}）。${idea.trim()}`;
  for (const extra of extras) {
    if (text.length >= 150) break;
    text += extra;
  }
  if (text.length > 160) return `${text.slice(0, 159)}…`;
  return text;
}
