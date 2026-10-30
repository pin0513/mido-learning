/**
 * YAML 註解鎖：在學門凍結之前，內容 PR 不能悄悄刪掉或改掉既有的 YAML 註解（批次審稿紀錄）。
 * 規格見 docs/kp-db-restructure.md 第 8 節與第 16 節。
 *
 * `content/comments.lock.yaml` 記每個檔的註解指紋（逐字內容的 sha256 前 12 碼，順序無關、重複照算）。
 * - 鎖裡的註解，檔案裡一定要還在：刪掉、改字、整個檔刪掉都會擋下。故意的話跑
 *   `pnpm content:comments:lock` 重寫鎖檔，鎖檔的變更會出現在 review。
 * - 新檔、新註解不擋（批次常常加檔頭註解）；下一次重寫鎖檔時一起鎖進去。
 * - 和 main 比（CI）：main 上有、還沒鎖、這個 PR 刪掉的註解，發 GitHub 警告。
 *
 * 純函式：不讀檔、不碰 git。讀檔與 git 在 scripts/check-yaml-comments.ts。
 */
import { createHash } from "node:crypto";
import { parse } from "yaml";
import { extractComments } from "./revision/comments";

/** 鎖檔相對 content/ 的位置。這個檔自己不掃。 */
export const LOCK_FILE = "comments.lock.yaml";

/** 檔名（相對 content/）→ 註解指紋（排序過，重複保留）。 */
export type CommentSnapshot = Map<string, string[]>;

export interface CommentLock {
  version: 1;
  files: CommentSnapshot;
}

export function commentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

/** 每個檔的註解指紋。沒有註解的檔不列。 */
export function snapshotComments(files: Iterable<{ file: string; text: string }>): CommentSnapshot {
  const out: CommentSnapshot = new Map();
  for (const { file, text } of files) {
    if (file === LOCK_FILE) continue;
    const hashes = extractComments(text).map((comment) => commentHash(comment.text));
    if (hashes.length > 0) out.set(file, hashes.sort());
  }
  return new Map([...out].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const HEADER = [
  "# YAML 註解鎖（docs/kp-db-restructure.md 第 8、16 節）。不要手改，用指令重寫：",
  "#   cd frontend && pnpm content:comments:lock",
  "# 每個檔列出它每一則註解的指紋（逐字內容的 sha256 前 12 碼，順序無關）。",
  "# CI 擋下：鎖裡的註解在檔案裡不見了（刪掉或改字）。新檔、新加的註解不擋。",
  "# 故意刪改既有註解時才需要重寫，鎖檔的變更會出現在 review。",
];

export function lockToText(snapshot: CommentSnapshot): string {
  const lines = [...HEADER, "version: 1", "files:"];
  for (const [file, hashes] of snapshot) lines.push(`  ${JSON.stringify(file)}: [${hashes.map((hash) => JSON.stringify(hash)).join(", ")}]`);
  if (snapshot.size === 0) lines[lines.length - 1] = "files: {}";
  return `${lines.join("\n")}\n`;
}

export function parseLock(text: string): { lock: CommentLock | null; errors: string[] } {
  let value: unknown;
  try {
    value = parse(text);
  } catch (error) {
    return { lock: null, errors: [`${LOCK_FILE}: YAML 壞掉：${error instanceof Error ? error.message : String(error)}`] };
  }
  const errors: string[] = [];
  const record = value as { version?: unknown; files?: unknown } | null;
  if (!record || typeof record !== "object") return { lock: null, errors: [`${LOCK_FILE}: 必須是物件`] };
  if (record.version !== 1) errors.push(`${LOCK_FILE}: version 必須是 1`);
  if (!record.files || typeof record.files !== "object" || Array.isArray(record.files)) {
    return { lock: null, errors: [...errors, `${LOCK_FILE}: files 必須是物件`] };
  }
  const files: CommentSnapshot = new Map();
  for (const [file, hashes] of Object.entries(record.files as Record<string, unknown>)) {
    if (!Array.isArray(hashes) || !hashes.every((hash) => typeof hash === "string" && /^[0-9a-f]{12}$/.test(hash))) {
      errors.push(`${LOCK_FILE}: ${file} 必須是 12 碼十六進位指紋的陣列`);
      continue;
    }
    files.set(file, [...hashes].sort());
  }
  return errors.length > 0 ? { lock: null, errors } : { lock: { version: 1, files }, errors };
}

/** a 減 b（多重集合）。 */
function minus(a: readonly string[], b: readonly string[]): string[] {
  const left = new Map<string, number>();
  for (const hash of b) left.set(hash, (left.get(hash) ?? 0) + 1);
  const out: string[] = [];
  for (const hash of a) {
    const n = left.get(hash) ?? 0;
    if (n > 0) left.set(hash, n - 1);
    else out.push(hash);
  }
  return out;
}

export interface LockCheck {
  /** 擋下的問題：鎖住的註解不見了。 */
  errors: string[];
  /** 還沒鎖的註解（新檔或新加的）：不擋，只列出來。 */
  unlocked: { file: string; count: number }[];
  lockedFiles: number;
  lockedComments: number;
}

const HINT = "確定要刪改就跑 `pnpm content:comments:lock`，把 content/comments.lock.yaml 一起提交";

/** 鎖裡每一則註解都要還在。 */
export function checkAgainstLock(lock: CommentLock, current: CommentSnapshot): LockCheck {
  const errors: string[] = [];
  const unlocked: LockCheck["unlocked"] = [];
  let lockedComments = 0;
  for (const [file, hashes] of lock.files) {
    lockedComments += hashes.length;
    const now = current.get(file);
    if (now === undefined) {
      errors.push(`${file}: 鎖裡有 ${hashes.length} 則註解，檔案裡一則都沒有了（註解被刪光，或整個檔被刪／改名）。${HINT}`);
      continue;
    }
    const missing = minus(hashes, now);
    if (missing.length > 0) {
      errors.push(
        `${file}: 鎖住的註解有 ${missing.length} 則不見了（被刪或改字；指紋 ${missing.join("、")}）。用 git diff 看是哪幾行。${HINT}`,
      );
    }
  }
  for (const [file, hashes] of current) {
    const extra = minus(hashes, lock.files.get(file) ?? []);
    if (extra.length > 0) unlocked.push({ file, count: extra.length });
  }
  return { errors, unlocked, lockedFiles: lock.files.size, lockedComments };
}

/**
 * 和 main 比：main 上有、main 的鎖裡沒有（新加後還沒重寫鎖）、這個 PR 刪掉的註解。
 * 這種刪除從鎖看不出來是不是故意的，所以只發警告（不擋），請 reviewer 看一眼。
 */
export function unlockedRemovals(base: CommentSnapshot, baseLock: CommentLock | null, head: CommentSnapshot): string[] {
  const warnings: string[] = [];
  for (const [file, hashes] of base) {
    const notLocked = minus(hashes, baseLock?.files.get(file) ?? []);
    const removed = minus(notLocked, minus(head.get(file) ?? [], baseLock?.files.get(file) ?? []));
    if (removed.length > 0) {
      warnings.push(`${file}: main 上有 ${removed.length} 則還沒鎖的註解，這個 PR 刪掉了（指紋 ${removed.join("、")}）`);
    }
  }
  return warnings;
}
