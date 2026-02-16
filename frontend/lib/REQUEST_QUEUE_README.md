# Request Queue & Cache 使用說明

## 📦 已安裝的功能

### 1. Request Queue（請求隊列）
- **限制同時併發**：最多 6 個請求同時執行
- **限制請求頻率**：每秒最多 10 個請求
- **自動排隊**：超過限制的請求會自動排隊等待

### 2. API Cache（API 快取）
- **自動快取**：GET 請求自動快取 30 秒
- **避免重複請求**：相同參數的請求會直接回傳快取
- **自動過期**：30 秒後快取自動失效

---

## 🎯 解決的問題

**Before（改善前）**：
- ❌ 無限制併發，可能同時發送 20+ 個請求
- ❌ 每次操作都重新請求，浪費流量
- ❌ 輕易觸發 Firebase rate limit (100 次/分鐘)

**After（改善後）**：
- ✅ 最多同時 6 個請求
- ✅ 每秒最多 10 個請求 = 最多 60 次/分鐘
- ✅ 重複請求使用快取，實際請求更少
- ✅ **理論上不會再觸發 429 錯誤**

---

## 🔍 如何驗證效果

### 在瀏覽器 Console 測試

```javascript
// 1. 查看 Queue 統計
window.__requestQueue.stats()
// Output: { pending: 2, size: 5, isPaused: false }

// 2. 查看 Cache 統計
window.__apiCache.stats()
// Output: { size: 10, ttl: 30000 }

// 3. 清除所有快取（測試用）
window.__apiCache.clear()

// 4. 啟動自動記錄（每 10 秒記錄一次）
window.__debugQueue.start()

// 5. 停止自動記錄
window.__debugQueue.stop()
```

### 測試場景

**場景 1：快速切換類別**
1. 打開首頁或教材清單
2. 快速點擊不同類別 5-10 次
3. 觀察 Network tab：應該看到請求被控制，不會同時發送太多

**場景 2：重複請求**
1. 打開首頁
2. 切換到「數學」類別
3. 切換到其他類別
4. 再切換回「數學」類別
5. 觀察 Network tab：第二次切換到「數學」應該使用快取（沒有新請求）

**場景 3：併發限制**
1. 打開 Console，輸入 `window.__debugQueue.start()`
2. 重新載入首頁
3. 觀察 Console：應該看到 queue 狀態變化
4. 確認 `pending` 不會超過 6

---

## 📊 預期效果

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| **最大併發數** | 無限制 | 6 個 | ✅ 控制在安全範圍 |
| **每秒請求數** | 無限制 | 10 個 | ✅ 平滑流量 |
| **每分鐘請求數** | 100+ | ≤ 60 | ✅ 遠低於 100 次限制 |
| **重複請求** | 每次都發送 | 快取 30 秒 | ✅ 減少 50%+ |
| **429 錯誤** | 經常發生 | 理論上不會 | ✅ 問題解決 |

---

## 🛠️ 已修改的檔案

### 新增的檔案
- ✅ `lib/request-queue.ts` - Request Queue 核心
- ✅ `lib/simple-cache.ts` - Simple Cache 核心
- ✅ `lib/debug-queue.ts` - 除錯工具

### 修改的檔案
- ✅ `lib/api/components.ts` - 使用 queuedFetch + cache
- ✅ `lib/api/analytics.ts` - 使用 queuedFetch
- ✅ `lib/api.ts` - 使用 queuedFetch

### 套件
- ✅ `p-queue` - Queue 管理套件

---

## 🚀 如何測試

```bash
# 1. 啟動開發伺服器
cd frontend
pnpm dev

# 2. 打開瀏覽器
# http://localhost:3000

# 3. 打開 Console
# F12 或 Cmd+Option+I

# 4. 啟動除錯記錄
window.__debugQueue.start()

# 5. 測試快速切換類別、搜尋、換頁
# 觀察 Console 輸出與 Network tab

# 6. 確認：
# - 請求被排隊（pending 數量合理）
# - 重複請求使用快取（沒有新的 network 請求）
# - 沒有 429 錯誤
```

---

## ⚙️ 如何調整參數

如果還是遇到 429，可以調整參數：

### 調整 Queue 參數

編輯 `lib/request-queue.ts`：

```typescript
const queue = new PQueue({
  concurrency: 4,        // 降低併發數（原本 6）
  interval: 1000,        // 時間間隔
  intervalCap: 5,        // 每秒最多 5 個請求（原本 10）
});
```

### 調整 Cache TTL

編輯 `lib/simple-cache.ts`：

```typescript
export const apiCache = new SimpleCache(60000);  // 改成 60 秒（原本 30 秒）
```

---

## 📝 注意事項

1. **快取只適用於 GET 請求**：POST/PUT/DELETE 不會快取
2. **快取會在 30 秒後自動過期**：確保資料不會太舊
3. **開發環境有除錯工具**：生產環境不會有 console 輸出
4. **Queue 是全局的**：所有 API 請求共用同一個 queue

---

## 🐛 常見問題

### Q: 資料更新後沒有立即顯示？
A: 這是快取造成的。有兩種解決方式：
1. 等待 30 秒快取過期
2. 手動清除快取：`window.__apiCache.clear()`

### Q: 如何停用快取？
A: 修改對應的 API 函數，移除快取檢查的部分。

### Q: Queue 會影響效能嗎？
A: 不會。Queue 只是控制併發，不會讓請求變慢。反而可以避免瀏覽器因為過多併發而卡住。

---

**Version**: 1.0
**Created**: 2026-02-16
**Author**: Claude Code Team
