/**
 * e2e 用的學門旗標，照 lib/content/catalog.ts 的 isFolderLaunched 寫。
 * 這個檔不 import 任何東西：spec 直接 import lib/content/catalog.ts 時，Playwright 的轉譯會報
 * 「exports is not defined in ES module scope」。兩邊是否一致由 lib/kp/folder-flags.test.ts 守住。
 */
export const FOLDER_FLAG: Record<string, string> = { "soft-skills": "KP_SOFTSKILLS_ENABLED", language: "KP_YUWEN_ENABLED" };

/** 學門在這個行程是否打開；env 預設是 process.env。 */
export function folderLaunched(folder: string, env: Record<string, string | undefined> = process.env): boolean {
  const flag = FOLDER_FLAG[folder];
  return !flag || (env.KP_ENABLED === "true" && env[flag] === "true");
}
