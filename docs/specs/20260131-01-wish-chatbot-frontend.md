# Spec: WISH-001 首頁願望 ChatBot 介面

**Date**: 2026-01-31
**Author**: PM
**Feature ID**: WISH-001
**Priority**: P1 (第一波)

---

## Background

米豆學習網需要收集訪客的學習願望，以了解市場需求。在首頁放置一個可愛的 ChatBot 風格輸入介面，讓訪客（甚至未登入）可以許願「想學什麼」。

---

## User Stories

- As a **訪客**, I want 在首頁看到許願入口, so that 我可以告訴米豆我想學什麼
- As a **訪客**, I want 不需登入就能許願, so that 降低提交門檻
- As a **訪客**, I want 看到可愛的對話框設計, so that 增加互動意願

---

## Acceptance Criteria

- [ ] 首頁 `/` 顯示「許願 ChatBot」區塊
- [ ] 使用對話框/聊天泡泡風格設計
- [ ] 顯示吉祥物 or 可愛圖示 (可用 emoji 或 SVG)
- [ ] 提示文字: 「你想學什麼呢？告訴米豆吧！」
- [ ] 文字輸入欄位 (textarea，最多 500 字)
- [ ] 可選填 Email 欄位 (用於後續通知)
- [ ] 「送出願望」按鈕
- [ ] 送出後顯示感謝訊息動畫
- [ ] RWD: 手機版全寬，桌機版居中 (max-width: 600px)

---

## UI Mockup (ASCII)

```
┌─────────────────────────────────────────┐
│  ╭──────────────────────────────────╮   │
│  │  🌟 你想學什麼呢？              │   │
│  │     告訴米豆吧！                │   │
│  ╰──────────────────────────────────╯   │
│         ╲                               │
│          ╲  ◉‿◉                         │
│           ╲ 米豆                         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │ [輸入你的學習願望...]           │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Email (選填): [________________]       │
│                                         │
│           [ 🌟 送出願望 ]               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technical Spec

### 前端元件
```
frontend/components/wish/
├── WishChatBot.tsx      # 主元件
├── WishInput.tsx        # 輸入欄位
└── WishSuccess.tsx      # 成功動畫
```

### 首頁整合
修改 `frontend/app/(public)/page.tsx`，在適當位置加入 `<WishChatBot />`

### API 呼叫 (暫用 Mock)
```typescript
// 此 Spec 僅處理前端，API 由 WISH-002 處理
// 暫時使用 mock response
const submitWish = async (content: string, email?: string) => {
  // TODO: Replace with actual API call in WISH-002
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, wishId: 'mock-id' };
};
```

---

## Out of Scope

- ❌ 後端 API 實作 (見 WISH-002)
- ❌ Admin 願望列表 (見 WISH-003)
- ❌ 願望分析儀表板 (見 WISH-004)

---

## Definition of Done

1. [ ] 元件開發完成
2. [ ] RWD 測試通過 (320px ~ 1920px)
3. [ ] 前端 lint 通過
4. [ ] 前端 build 成功
5. [ ] 部署到 Cloud Run 測試環境
