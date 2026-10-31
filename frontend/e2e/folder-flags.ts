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

/**
 * 把「KP_A=true,KP_B=false」（deploy-frontend.yml 的 KP_BUILD_FLAGS 格式）變成 env 物件；沒給或空字串就是 {}（旗標全關）。
 * spec 用它表示「這份 build 是用哪些旗標 build 的」（E2E_BUILD_FLAGS），和執行時的 process.env 分開。
 */
export function flagEnv(list: string | undefined): Record<string, string> {
  if (!list) return {};
  return Object.fromEntries(
    list.split(",").map((pair) => {
      const match = /^(KP_[A-Z0-9_]+)=(true|false)$/.exec(pair.trim());
      if (!match) throw new Error(`E2E_BUILD_FLAGS 格式要是 KP_*=true|false：${pair}`);
      return [match[1], match[2]];
    }),
  );
}
