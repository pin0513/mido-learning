# Spec: Material Viewer RWD Enhancement

**Date:** 2026-02-01
**Author:** PM
**Priority:** Medium
**Affected Files:** `frontend/app/(public)/materials/[componentId]/page.tsx`

---

## Background

目前教材檢視頁在手機等小螢幕裝置上，投影片內容（iframe）可能會超出畫面或破版。需要增加全螢幕、縮放控制、自動縮放等功能，改善移動裝置使用體驗。

### Current Implementation (Line 292-299)
```tsx
<div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
  <iframe
    src={`${latestManifest.baseUrl}${latestManifest.entryPoint}...`}
    className="h-full w-full"
    title={component.title}
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
  />
</div>
```

**問題：**
- 固定 `aspect-video` 比例無法適應不同螢幕
- 無縮放控制
- 無全螢幕模式
- 小螢幕上內容可能超出可視範圍

---

## User Stories

- **US-01**: As a **手機用戶**, I want **全螢幕按鈕**, so that **我可以在全螢幕模式下觀看教材，提升閱讀體驗**
- **US-02**: As a **用戶**, I want **放大/縮小按鈕**, so that **我可以調整投影片大小，看清楚細節**
- **US-03**: As a **手機用戶**, I want **自動縮放功能**, so that **投影片內容不會超出螢幕範圍，無需手動調整**
- **US-04**: As a **觸控裝置用戶**, I want **捏合縮放 (pinch-to-zoom)**, so that **我可以用雙指手勢快速調整大小** (Optional)

---

## Acceptance Criteria

### AC-01: Fullscreen Button
- [ ] Given 用戶在教材頁面, When 點擊全螢幕按鈕, Then 頁面進入全螢幕模式
- [ ] Given 全螢幕模式, When 按 ESC 鍵, Then 退出全螢幕模式
- [ ] Given 全螢幕模式, When 再次點擊按鈕, Then 退出全螢幕模式
- [ ] Given 瀏覽器不支援 Fullscreen API, When 點擊按鈕, Then 顯示「瀏覽器不支援」提示

### AC-02: Zoom Controls
- [ ] Given 用戶在教材頁面, When 點擊 [+] 按鈕, Then 畫面放大 25%
- [ ] Given 用戶在教材頁面, When 點擊 [−] 按鈕, Then 畫面縮小 25%
- [ ] Given 用戶在教材頁面, When 點擊重置按鈕, Then 畫面回到 100%
- [ ] Given 縮放等級, When 達到 50% 下限, Then [−] 按鈕變為 disabled
- [ ] Given 縮放等級, When 達到 200% 上限, Then [+] 按鈕變為 disabled
- [ ] Given 縮放後, When 切換版本, Then 縮放等級保持不變

### AC-03: Auto-Scale for Mobile
- [ ] Given viewport 寬度 < 768px, When 頁面載入, Then 自動計算縮放比例適應螢幕
- [ ] Given 自動縮放後, When 旋轉螢幕, Then 重新計算縮放比例
- [ ] Given 自動縮放模式, When 手動縮放, Then 停用自動縮放（用戶手動覆蓋）

### AC-04: Existing Features Intact
- [ ] Given 新增 RWD 功能, When 執行所有操作, Then 下載按鈕正常運作
- [ ] Given 新增 RWD 功能, When 執行所有操作, Then 評分系統正常運作
- [ ] Given 新增 RWD 功能, When 執行所有操作, Then 版本切換正常運作

### AC-05: Browser Compatibility
- [ ] Given Chrome (latest), When 執行所有功能, Then 正常運作
- [ ] Given Safari (iOS), When 執行所有功能, Then 正常運作（含 webkit prefix）
- [ ] Given Firefox (latest), When 執行所有功能, Then 正常運作
- [ ] Given Edge (latest), When 執行所有功能, Then 正常運作

---

## Data Model Changes

**None.** 純前端 UI 變更，無需資料庫調整。

---

## API Changes

**None.** 無需後端 API 配合。

---

## UI Changes

### Component Structure

```tsx
// 新增狀態
const [isFullscreen, setIsFullscreen] = useState(false);
const [zoomLevel, setZoomLevel] = useState(1.0);
const [autoScale, setAutoScale] = useState(false);

// 新增控制列 (插入到 278-291 行之間)
<div className="flex items-center justify-between">
  {/* 左側：版本標籤 */}
  <span className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
    v{latestManifest.version} (最新版本)
  </span>

  {/* 右側：控制按鈕群組 */}
  <div className="flex items-center gap-2">
    {/* 縮放控制 */}
    <button onClick={handleZoomOut} disabled={zoomLevel <= 0.5} title="縮小">
      [−]
    </button>
    <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
    <button onClick={handleZoomIn} disabled={zoomLevel >= 2.0} title="放大">
      [+]
    </button>
    <button onClick={handleZoomReset} title="重置">
      [↺]
    </button>

    {/* 下載按鈕 */}
    <button onClick={handleDownload} title="下載教材">
      [📥]
    </button>

    {/* 全螢幕按鈕 */}
    <button onClick={handleFullscreen} title="全螢幕">
      [⛶]
    </button>
  </div>
</div>

// 修改 iframe 容器 (292-299 行)
<div
  ref={containerRef}
  className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200"
>
  <div
    style={{
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'top left',
      width: `${100 / zoomLevel}%`,
      height: `${100 / zoomLevel}%`
    }}
  >
    <iframe ... />
  </div>
</div>
```

### UI Layout Mockup

```
┌────────────────────────────────────────────────────────┐
│ v2 (最新版本)    [−] 100% [+] [↺]   [📥] [⛶]          │  ← 控制列
├────────────────────────────────────────────────────────┤
│                                                        │
│                  投影片內容 (可縮放)                    │
│                     (iframe)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Technical Decision: Transform Scale (Recommended)

**Chosen Approach:** CSS `transform: scale()`

**Rationale:**
- ✅ 瀏覽器相容性佳（所有現代瀏覽器）
- ✅ 不影響佈局流（不觸發 reflow）
- ✅ 效能優秀（GPU 加速）
- ✅ 可精確控制縮放中心點 (`transformOrigin`)

**Alternative (Rejected):** CSS `zoom`
- ❌ 非標準屬性（僅部分瀏覽器支援）
- ❌ 會影響佈局流
- ❌ Safari 支援度差

### Event Handlers

```tsx
const handleZoomIn = () => {
  setZoomLevel(prev => Math.min(prev + 0.25, 2.0));
  setAutoScale(false); // 手動縮放停用自動模式
};

const handleZoomOut = () => {
  setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  setAutoScale(false);
};

const handleZoomReset = () => {
  setZoomLevel(1.0);
  setAutoScale(false);
};

const handleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.current?.requestFullscreen?.()
      || containerRef.current?.webkitRequestFullscreen?.(); // Safari
  } else {
    document.exitFullscreen();
  }
};

// Auto-scale on mobile
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 768 && !autoScale) {
      const container = containerRef.current;
      if (container) {
        const scaleRatio = container.offsetWidth / 1920; // 假設投影片寬度 1920px
        setZoomLevel(scaleRatio);
        setAutoScale(true);
      }
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [autoScale]);
```

---

## Out of Scope

以下功能**不**在此 Spec 範圍內：

- ❌ 講稿側邊欄功能（目前不存在，若需要請另開 Spec）
- ❌ 投影片翻頁控制（iframe 內部功能，無法從外部控制）
- ❌ 手勢縮放（Pinch-to-Zoom）標記為 Optional，可延後實作
- ❌ 鍵盤快捷鍵（如 Ctrl+Plus/Minus 縮放）
- ❌ 投影片目錄/大綱功能
- ❌ 浮水印或品牌標記

---

## Testing Checklist

### Desktop Testing
- [ ] Chrome (macOS/Windows) - 所有功能正常
- [ ] Firefox (macOS/Windows) - 所有功能正常
- [ ] Safari (macOS) - 全螢幕需使用 webkit prefix
- [ ] Edge (Windows) - 所有功能正常

### Mobile Testing
- [ ] iOS Safari - 自動縮放生效，觸控操作正常
- [ ] Android Chrome - 自動縮放生效，觸控操作正常
- [ ] 橫向/直向切換 - 自動重新計算縮放

### Regression Testing
- [ ] 下載按鈕 - 仍可正常下載
- [ ] 評分系統 - 仍可正常評分
- [ ] 版本切換 - 切換後縮放保持
- [ ] 歷史版本下載 - 功能正常

---

## Implementation Notes

### File Modifications

**Primary File:**
- `frontend/app/(public)/materials/[componentId]/page.tsx` (Line 274-357)
  - 新增 state: `isFullscreen`, `zoomLevel`, `autoScale`
  - 新增 ref: `containerRef`
  - 新增控制按鈕群組 (Line ~278-291 之間)
  - 修改 iframe 容器結構 (Line 292-299)
  - 新增 event handlers
  - 新增 resize effect

**Optional (Future Enhancement):**
- `frontend/components/ui/ZoomControls.tsx` - 若需要元件重用可抽出
- `frontend/components/learning/MaterialViewer.tsx` - 若需要獨立元件

### Estimated Complexity

- **前端工作量:** 4-6 小時
  - State 管理: 1h
  - UI 控制列: 1h
  - 縮放邏輯: 1-2h
  - 全螢幕 API: 1h
  - 測試與調整: 1-2h

- **後端工作量:** 0 小時（無需後端配合）

---

## Changelog

### 2026-02-01
- 建立 Spec v1.0
- 決定採用 Transform Scale 方案
- 標記 Pinch-to-Zoom 為 Optional（延後實作）
