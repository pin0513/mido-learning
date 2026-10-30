import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCK_FILE,
  checkAgainstLock,
  commentHash,
  lockToText,
  parseLock,
  snapshotComments,
  unlockedRemovals,
  type CommentLock,
} from "./comment-lock";
import { walkYaml } from "./load";
import { importNotesFor } from "./revision";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content");

function repoFiles() {
  return walkYaml(contentDir).map((path) => ({ file: relative(contentDir, path), text: readFileSync(path, "utf8") }));
}

function committedLock(): CommentLock {
  const { lock, errors } = parseLock(readFileSync(join(contentDir, LOCK_FILE), "utf8"));
  assert.deepEqual(errors, []);
  assert.ok(lock);
  return lock;
}

/** 把 repo 的一個檔換成 text（undefined＝刪掉），其他檔不動。 */
function withFile(file: string, text: string | undefined) {
  const files = repoFiles().filter((entry) => entry.file !== file);
  if (text !== undefined) files.push({ file, text });
  return snapshotComments(files);
}

const LANGUAGE_FILE = "knowledge/language/zh.prompt/jh.yaml";
const PLAIN_FILE = "knowledge/philosophy/ph.aimind/uni.yaml";

test("提交的鎖檔和目前內容相符：鎖住的註解都還在", () => {
  const lock = committedLock();
  const result = checkAgainstLock(lock, snapshotComments(repoFiles()));
  assert.deepEqual(result.errors, []);
  assert.ok(result.lockedFiles > 100);
});

test("刪掉一則既有註解會擋下，訊息寫出檔名和重寫鎖的指令", () => {
  const text = readFileSync(join(contentDir, LANGUAGE_FILE), "utf8");
  const lines = text.split("\n");
  assert.match(lines[1], /^#/);
  const deleted = [lines[0], ...lines.slice(2)].join("\n");
  const result = checkAgainstLock(committedLock(), withFile(LANGUAGE_FILE, deleted));
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], new RegExp(`^${LANGUAGE_FILE.replace(/\./g, "\\.")}: 鎖住的註解有 1 則不見了`));
  assert.match(result.errors[0], new RegExp(commentHash(lines[1])));
  assert.match(result.errors[0], /pnpm content:comments:lock/);
});

test("改一個字、刪光檔頭、刪掉整個檔都會擋下", () => {
  const text = readFileSync(join(contentDir, LANGUAGE_FILE), "utf8");
  const edited = text.replace(/^# (.)/, "# 改$1");
  assert.equal(checkAgainstLock(committedLock(), withFile(LANGUAGE_FILE, edited)).errors.length, 1);
  const stripped = text
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
  assert.match(checkAgainstLock(committedLock(), withFile(LANGUAGE_FILE, stripped)).errors[0], /一則都沒有了/);
  assert.match(checkAgainstLock(committedLock(), withFile(LANGUAGE_FILE, undefined)).errors[0], /一則都沒有了/);
});

test("一般批次不受影響：改內容、加檔頭註解、搬動註解、新增檔案都過", () => {
  const lock = committedLock();
  // 像 B13–B23：改沒有註解的檔，提案的檔頭在發布時拿掉。
  const plain = readFileSync(join(contentDir, PLAIN_FILE), "utf8");
  assert.deepEqual(checkAgainstLock(lock, withFile(PLAIN_FILE, plain.replace("status: draft", "status: published"))).errors, []);
  // 像 B1–B12：發布時保留提案檔頭。
  const header = "# B24 提案：ph.aimind@uni\n# - 補 Why/How/What、兩張圖、來源。\n";
  const added = checkAgainstLock(lock, withFile(PLAIN_FILE, header + plain));
  assert.deepEqual(added.errors, []);
  assert.deepEqual(added.unlocked, [{ file: PLAIN_FILE, count: 2 }]);
  // 已有檔頭的檔再加一段「新增」紀錄，或把註解搬到別處。
  const text = readFileSync(join(contentDir, LANGUAGE_FILE), "utf8");
  const lines = text.split("\n");
  const headerEnd = lines.findIndex((line) => !line.startsWith("#"));
  const moved = [...lines.slice(headerEnd), "# 新增：B30 複審", ...lines.slice(0, headerEnd)].join("\n");
  assert.deepEqual(checkAgainstLock(lock, withFile(LANGUAGE_FILE, moved)).errors, []);
  // 新檔。
  assert.deepEqual(checkAgainstLock(lock, withFile("knowledge/philosophy/ph.new/uni.yaml", header + "id: ph.new@uni\n")).errors, []);
});

test("故意刪改時重寫鎖就過；鎖檔文字可以讀回；同一則註解出現兩次要各算一次", () => {
  const text = readFileSync(join(contentDir, LANGUAGE_FILE), "utf8");
  const lines = text.split("\n");
  const deleted = [lines[0], ...lines.slice(2)].join("\n");
  const after = withFile(LANGUAGE_FILE, deleted);
  const { lock } = parseLock(lockToText(after));
  assert.ok(lock);
  assert.deepEqual(lock.files, after);
  assert.deepEqual(checkAgainstLock(lock, after).errors, []);

  const twice = snapshotComments([{ file: "a.yaml", text: "#\nid: a\n#\n" }]);
  assert.deepEqual(twice.get("a.yaml"), [commentHash("#"), commentHash("#")]);
  const once = snapshotComments([{ file: "a.yaml", text: "#\nid: a\n" }]);
  assert.equal(checkAgainstLock({ version: 1, files: twice }, once).errors.length, 1);
  assert.deepEqual(snapshotComments([{ file: LOCK_FILE, text: "# 鎖檔自己\n" }]), new Map());
  assert.match(parseLock("version: 1\nfiles:\n  a.yaml: [123456789012]\n").errors[0], /12 碼十六進位/);
  assert.match(parseLock("version: 2\nfiles: {}\n").errors[0], /version/);
});

test("和 main 比：還沒鎖的註解被刪掉時發警告", () => {
  const base = snapshotComments([
    { file: "a.yaml", text: "# 已鎖\n# 新加、還沒鎖\nid: a\n" },
    { file: "b.yaml", text: "# b 新檔頭\nid: b\n" },
  ]);
  const baseLock: CommentLock = { version: 1, files: new Map([["a.yaml", [commentHash("# 已鎖")]]]) };
  const head = snapshotComments([
    { file: "a.yaml", text: "# 已鎖\nid: a\n" },
    { file: "b.yaml", text: "# b 新檔頭\nid: b\n" },
  ]);
  const warnings = unlockedRemovals(base, baseLock, head);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^a\.yaml: main 上有 1 則還沒鎖的註解/);
  assert.deepEqual(unlockedRemovals(base, baseLock, base), []);
});

test("主線（content/paths）的註解可以照 importNotes 的方式逐字抽出", () => {
  const paths = walkYaml(join(contentDir, "paths"));
  assert.ok(paths.length > 0);
  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    const notes = importNotesFor(text, relative(contentDir, path));
    const hashLines = text.split("\n").filter((line) => /^\s*#/.test(line));
    assert.deepEqual(notes?.comments.map((comment) => comment.text) ?? [], hashLines);
  }
});
