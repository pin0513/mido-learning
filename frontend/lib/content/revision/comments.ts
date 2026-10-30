/**
 * YAML 註解（批次審稿紀錄）的去處。規格見 docs/kp-db-restructure.md 第 3.2、8 節。
 *
 * 註解不是知識點的資料，往返比對不比它；但不能在匯入時消失。匯入時逐字抽出來，
 * 放在第一版修訂的 importNotes，同時寫一筆 audit_log（importAuditEntry）。
 * 每筆記下行號、欄位位置，以及它附著的欄位路徑（行號換了格式就沒意義，路徑還在）。
 */
import { isMap, isScalar, isSeq, Lexer, parseDocument, type Node } from "yaml";
import type { KpImportNotes, KpRecord, KpSourceComment } from "./types";

interface Anchor {
  offset: number;
  path: string;
}

/** 每個鍵與序列項目在原文的起點，配上欄位路徑（例如 why.items[2].title）。 */
function anchors(text: string): Anchor[] {
  const out: Anchor[] = [];
  const walk = (node: unknown, path: string) => {
    if (isMap(node)) {
      for (const pair of node.items) {
        const key = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
        const child = path ? `${path}.${key}` : key;
        const start = (pair.key as Node | null)?.range?.[0];
        if (start !== undefined) out.push({ offset: start, path: child });
        walk(pair.value, child);
      }
    } else if (isSeq(node)) {
      node.items.forEach((item, index) => {
        const child = `${path}[${index}]`;
        const start = (item as Node | null)?.range?.[0];
        if (start !== undefined) out.push({ offset: start, path: child });
        walk(item, child);
      });
    }
  };
  walk(parseDocument(text).contents, "");
  return out.sort((a, b) => a.offset - b.offset);
}

/**
 * 逐字抽出 YAML 原文裡的每一個註解（用 yaml 的 Lexer，所以字串、區塊字串裡的 # 不會被誤認）。
 * line、column 從 1 起算；text 含開頭的 #，不含換行。
 * path：整行註解是它下面第一個鍵（檔尾註解為 null）；行尾註解是同一行的鍵。
 */
export function extractComments(text: string): KpSourceComment[] {
  const found: { offset: number; text: string }[] = [];
  let offset = 0;
  for (const token of new Lexer().lex(text)) {
    // Lexer 會插入不佔原文的控制字元（\x02 文件開始、\x1f 純量開始、\x18 流集合錯誤）；BOM 佔原文。
    if (token.length === 1 && token.charCodeAt(0) < 0x20 && token !== "\n" && token !== "\t") continue;
    if (token.startsWith("#")) found.push({ offset, text: token });
    offset += token.length;
  }
  if (found.length === 0) return [];
  const marks = anchors(text);
  return found.map(({ offset: at, text: comment }) => {
    const lineStart = text.lastIndexOf("\n", at - 1) + 1;
    const line = text.slice(0, lineStart).split("\n").length;
    const inline = text.slice(lineStart, at).trim() !== "";
    let path: string | null = null;
    if (inline) {
      for (const mark of marks) {
        if (mark.offset >= at) break;
        if (mark.offset >= lineStart) path = mark.path;
      }
    } else {
      path = marks.find((mark) => mark.offset > at)?.path ?? null;
    }
    return { line, column: at - lineStart + 1, text: comment, inline, path };
  });
}

/** 匯入時放進第一版修訂的 importNotes。沒有註解就回傳 null（不寫這個欄位）。 */
export function importNotesFor(text: string, file: string, commit?: string): KpImportNotes | null {
  const comments = extractComments(text);
  if (comments.length === 0) return null;
  return commit ? { file, commit, comments } : { file, comments };
}

/** 把抽出的註解從原文挖掉（換成空白）。測試用來證明沒有漏抽：挖完之後 Lexer 應該找不到任何註解。 */
export function blankComments(text: string, comments: readonly KpSourceComment[]): string {
  const lines = text.split("\n");
  for (const comment of comments) {
    const row = lines[comment.line - 1];
    const start = comment.column - 1;
    if (row === undefined || row.slice(start, start + comment.text.length) !== comment.text) {
      throw new Error(`第 ${comment.line} 行第 ${comment.column} 欄不是這段註解：${comment.text}`);
    }
    lines[comment.line - 1] = row.slice(0, start) + " ".repeat(comment.text.length) + row.slice(start + comment.text.length);
  }
  return lines.join("\n");
}

export interface ImportAuditEntry {
  action: "kp.import";
  kpId: string;
  revisionId: string;
  actor: string;
  at: string;
  file: string;
  commit: string;
  /** 和修訂版 importNotes.comments 同一份；修訂版被改或刪也還查得到。 */
  comments: KpSourceComment[];
}

/** 匯入寫進 audit_log 的那一筆（純資料；寫入由匯入程式做）。 */
export function importAuditEntry(
  record: KpRecord,
  meta: { revisionId: string; actor: string; at: string; file: string; commit: string },
): ImportAuditEntry {
  return {
    action: "kp.import",
    kpId: record.kpId,
    revisionId: meta.revisionId,
    actor: meta.actor,
    at: meta.at,
    file: meta.file,
    commit: meta.commit,
    comments: (record.revision.importNotes?.comments ?? []).map((comment) => ({ ...comment })),
  };
}
