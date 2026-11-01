/**
 * 知識點引用課綱代碼時可以寫「科目:代碼」（例如「語文/英語文:6-V-1」），
 * 用在不同科目同號的代碼。畫面上只顯示代碼本身。
 */
export function curriculumCodeLabel(ref: string): string {
  const at = ref.lastIndexOf(":");
  return at === -1 ? ref : ref.slice(at + 1);
}
