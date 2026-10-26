# mido CLI

MIDO Learning 的 Node CLI（`packages/cli`），用來登入並上傳、列出教材。

## 需求

- Node.js 20+
- CLI 專用的 Firebase Web API Key

網站用的 `NEXT_PUBLIC_FIREBASE_API_KEY` 有 HTTP referrer 限制，Node CLI 無法使用。請向專案管理員取得另一把未限制 referrer 的 Web API Key，只給這個 CLI 用。

## 設定 Firebase API Key

登入（`mido auth login`）與 access token 過期後的 refresh 會呼叫 Firebase Identity Toolkit / Secure Token API，必須能讀到這把金鑰。其他指令在 token 仍有效時不會用到它。

優先讀取環境變數：

```bash
export MIDO_FIREBASE_API_KEY=<your-firebase-api-key>
```

也可以寫進 CLI 設定檔 `~/.mido-cli/config.json`（權限 `0600`）：

```json
{
  "env": "prod",
  "firebaseApiKey": "<your-firebase-api-key>"
}
```

同時存在時，以 `MIDO_FIREBASE_API_KEY` 為準。未設定就執行登入或 token refresh 時，CLI 會退出並說明上述兩種設定方式。

不要把金鑰寫進程式碼、提交到 git，或貼進 log。

## 其他設定

API 位址維持原本的環境切換，不受這次金鑰調整影響：

| 設定 | 說明 |
|------|------|
| `mido auth env prod` | `https://mido-learning-api-24mwb46hra-de.a.run.app` |
| `mido auth env local` | `http://localhost:5199` |
| 設定檔 `apiUrl` | 覆寫上面的預設位址 |

登入狀態存在 `~/.mido-cli/config.json` 的 `auth` 欄位（與 shell 腳本 `scripts/mido` 使用的 `~/.mido-cli.json` 不同）。

## 開發

```bash
cd packages/cli
npm install
npm test
npm run build
```
