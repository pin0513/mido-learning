/** 只在畫面上拿掉標題裡的 emoji，不改來源資料。 */
export function stripEmoji(value: string): string {
  return value.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "").replace(/\s{2,}/g, " ").trim();
}
