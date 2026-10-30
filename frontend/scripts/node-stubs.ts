/**
 * 讓 Node 直接 render 詳細頁元件：`server-only` 與 `.css` 在 Next 之外沒有意義，換成空模組。
 *
 * 只給需要 render 的腳本用：在那支腳本第一行 `import "./node-stubs";`。
 * node --test 每個測試檔各自一個行程，所以只影響載入它的那個測試檔；
 * 其他單元測試照樣會在誤 import server-only 時失敗（revision.test.ts 有測）。
 * tsx 把 .ts／.tsx 編成 CommonJS 載入，所以攔 Module._load。
 */
import Module from "node:module";

type Load = (request: string, parent: unknown, isMain: boolean) => unknown;
const loader = Module as unknown as { _load: Load };
const original = loader._load;
loader._load = function load(this: unknown, request, parent, isMain) {
  if (request === "server-only" || request.endsWith(".css")) return {};
  return original.call(this, request, parent, isMain);
};
