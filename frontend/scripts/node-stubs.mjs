/**
 * 讓 Node 直接 render 詳細頁元件：`server-only` 與 `.css` 在 Next 之外沒有意義，換成空模組。
 * 只給測試與驗證腳本用（tsx --import ./scripts/node-stubs.mjs ...），不影響建置。
 * tsx 把 .ts／.tsx 編成 CommonJS 載入，所以攔 Module._load。
 */
import Module from "node:module";

const original = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "server-only" || request.endsWith(".css")) return {};
  return original.call(this, request, parent, isMain);
};
