/**
 * YAML 註解不能悄悄消失（docs/kp-db-restructure.md 第 8、16 節）。
 *
 *   pnpm content:comments          檢查：content/ 底下每個 YAML 檔，鎖住的註解都要還在
 *   pnpm content:comments:lock     重寫 content/comments.lock.yaml（故意刪改既有註解時才需要）
 *   ... --base                     另外和 origin/main 比，main 上還沒鎖、被刪掉的註解發警告（CI 用）
 *
 * 新檔、新加的註解不擋，也不用重寫鎖。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCK_FILE,
  checkAgainstLock,
  lockToText,
  parseLock,
  snapshotComments,
  unlockedRemovals,
  type CommentSnapshot,
} from "../lib/content/comment-lock";
import { walkYaml } from "../lib/content/load";

const frontend = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(frontend, "content");
const repoRoot = join(frontend, "..");
const annotate = process.env.GITHUB_ACTIONS === "true";

function headSnapshot(): CommentSnapshot {
  return snapshotComments(
    walkYaml(contentDir).map((path) => ({ file: relative(contentDir, path), text: readFileSync(path, "utf8") })),
  );
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 28 });
}

function baseSnapshot(): { snapshot: CommentSnapshot; lockText: string | null } {
  // CI 的 checkout 是淺層，只抓 main 最新一個 commit；本機完整 clone 不要變成淺層。
  const shallow = git(["rev-parse", "--is-shallow-repository"]).trim() === "true";
  git(["fetch", "--quiet", ...(shallow ? ["--depth=1"] : []), "origin", "main"]);
  const prefix = "frontend/content/";
  const files = git(["ls-tree", "-r", "--name-only", "origin/main", prefix])
    .split("\n")
    .filter((file) => file.endsWith(".yaml"));
  const texts = files.map((file) => ({ file: file.slice(prefix.length), text: git(["show", `origin/main:${file}`]) }));
  const lock = texts.find((entry) => entry.file === LOCK_FILE);
  return { snapshot: snapshotComments(texts), lockText: lock?.text ?? null };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const lockPath = join(contentDir, LOCK_FILE);
  const head = headSnapshot();

  if (args.has("--write")) {
    let before: CommentSnapshot = new Map();
    try {
      before = parseLock(readFileSync(lockPath, "utf8")).lock?.files ?? new Map();
    } catch {
      // 第一次建立鎖檔。
    }
    writeFileSync(lockPath, lockToText(head));
    const released = checkAgainstLock({ version: 1, files: before }, head).errors;
    const total = [...head.values()].reduce((sum, hashes) => sum + hashes.length, 0);
    console.log(`已寫入 content/${LOCK_FILE}：${head.size} 個檔、${total} 則註解。`);
    if (released.length > 0) {
      console.log(`這次解鎖（刪改）了 ${released.length} 個檔的註解，請在 PR 說明寫原因：`);
      for (const line of released) console.log(`- ${line.split("。")[0]}`);
    }
    return;
  }

  let lockText: string;
  try {
    lockText = readFileSync(lockPath, "utf8");
  } catch {
    console.error(`沒有 content/${LOCK_FILE}。跑 pnpm content:comments:lock 建立。`);
    process.exit(1);
  }
  const { lock, errors: lockErrors } = parseLock(lockText);
  if (!lock) {
    for (const error of lockErrors) console.error(error);
    process.exit(1);
  }
  const result = checkAgainstLock(lock, head);

  let warnings: string[] = [];
  if (args.has("--base")) {
    try {
      const base = baseSnapshot();
      const baseLock = base.lockText ? parseLock(base.lockText).lock : null;
      warnings = unlockedRemovals(base.snapshot, baseLock, head);
    } catch (error) {
      console.log(`和 origin/main 比對跳過：${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }

  const unlockedCount = result.unlocked.reduce((sum, entry) => sum + entry.count, 0);
  const missing = result.errors.length;
  console.log(
    `註解鎖：${result.lockedFiles} 個檔、${result.lockedComments} 則註解；${missing === 0 ? "全部還在" : `${missing} 個檔有註解不見了`}。`,
  );
  if (unlockedCount > 0) {
    console.log(`還沒鎖的新註解 ${unlockedCount} 則（${result.unlocked.length} 個檔）：不擋；想讓它們受保護就跑 pnpm content:comments:lock。`);
  }
  for (const warning of warnings) {
    console.log(annotate ? `::warning file=frontend/content/${warning.split(":")[0]}::${warning}` : `警告：${warning}`);
  }
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(annotate ? `::error file=frontend/content/${error.split(":")[0]}::${error}` : `- ${error}`);
    }
    console.error(`\n${missing} 個檔的既有註解被刪或被改。`);
    process.exit(1);
  }
}

main();
