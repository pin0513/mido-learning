# 羽球戰術板改版計畫

**日期**: 2026-02-18
**版本**: v1.0
**狀態**: 待實作

---

## 背景

目前 `badminton-tactical-board.html` 球場方向為橫式（landscape），不符合實際羽球場外觀；且戰術訓練 HUD 的「側別」切換設計不必要，應以「重心破壞原理」設計對方落點邏輯。

---

## 任務一：修正球場方向（橫式 → 直式）

### 目標

將球場從橫式（landscape）改為直式（portrait），使球場長軸（13.4m）垂直、短軸（6.1m）水平，符合羽球場正確外觀。

### 修改檔案

`frontend/public/badminton-tactical-board.html`

### 1.1 `resize()` — 修正 aspect ratio

```javascript
// 改前
const aspect = COURT_W / COURT_H;  // 2.2 = landscape

// 改後
const aspect = COURT_H / COURT_W;  // 0.455 = portrait
```

### 1.2 `computeScale()` — 交換 W/H 對應關係

cx(m) 對應 COURT_H（6.1m）水平方向，cy(m) 對應 COURT_W（13.4m）垂直方向。

```javascript
// 改前
const scW = (CW - MARGIN*2) / COURT_W;
const scH = (CH - MARGIN*2) / COURT_H;
OFFSET_X = (CW - COURT_W * SC) / 2;
OFFSET_Y = (CH - COURT_H * SC) / 2;

// 改後
const scW = (CW - MARGIN*2) / COURT_H;   // 水平 → 短軸 6.1m
const scH = (CH - MARGIN*2) / COURT_W;   // 垂直 → 長軸 13.4m
OFFSET_X = (CW - COURT_H * SC) / 2;
OFFSET_Y = (CH - COURT_W * SC) / 2;
```

### 1.3 `drawCourt()` — 直式球場線條（全面改寫）

cx 對應 0..6.1m 寬，cy 對應 0..13.4m 長：

| 線條名稱 | 方向 | 座標 |
|---------|------|------|
| 底線（上） | 水平 | cy(0)，cx(0)..cx(6.1) |
| 底線（下） | 水平 | cy(13.4)，cx(0)..cx(6.1) |
| 邊線雙打（左） | 垂直 | cx(0)，cy(0)..cy(13.4) |
| 邊線雙打（右） | 垂直 | cx(6.1)，cy(0)..cy(13.4) |
| 邊線單打（左） | 垂直 | cx(0.46)，cy(0)..cy(13.4) |
| 邊線單打（右） | 垂直 | cx(5.64)，cy(0)..cy(13.4) |
| 球網 | 水平 | cy(6.7)，cx(0)..cx(6.1) |
| 網柱（左） | 圓點 | (cx(0), cy(6.7)) |
| 網柱（右） | 圓點 | (cx(6.1), cy(6.7)) |
| 短發球線（上半） | 水平 | cy(4.72)，cx(0)..cx(6.1) |
| 短發球線（下半） | 水平 | cy(8.68)，cx(0)..cx(6.1) |
| 雙打長發球線（上） | 水平 | cy(0.76)，cx(0)..cx(6.1) |
| 雙打長發球線（下） | 水平 | cy(12.64)，cx(0)..cx(6.1) |
| 中線（上半） | 垂直 | cx(3.05)，cy(4.72)..cy(6.7) |
| 中線（下半） | 垂直 | cx(3.05)，cy(6.7)..cy(8.68) |

### 1.4 `drawServe()` — 更新發球位置座標

發球方站位（底線往場內約 0.3m），改為 portrait 座標系：

- 右發球區：`cx(4.57), cy(0.3)`（下半場右側）
- 左發球區：`cx(1.52), cy(0.3)`（下半場左側）

---

## 任務二：戰術訓練 HUD 改版

### 目標

移除不必要的「側別」切換，以「重心破壞原理」設計對方落點：**最長距離 + 反拍優先**。

### 2.1 HTML 修改

**移除「側別」row**（`badminton-tactical-board.html` 約 lines 429-433）：

```html
<!-- 刪除此區塊 -->
<div class="tp-row">
  <span class="tp-label">側別</span>
  <button class="tp-btn on" id="tp-home" onclick="setTrainSide('home')">我方</button>
  <button class="tp-btn"    id="tp-away" onclick="setTrainSide('away')">對方</button>
</div>
```

**更新 hint 文字**：

```html
<div class="tp-hint">🟢 我方站位 ↑上手 ↓下手<br>🟠 對方落點（最長距離+反拍優先）</div>
```

### 2.2 TACTICS_MAP 設計（重心破壞原理）

玩家站位（0=FL,1=FR,2=ML,3=MR,4=BL,5=BR）→ 對方落點優先序

| 玩家站位 | 最佳對方落點 | 說明 |
|---------|------------|------|
| FL（前左） | OBR(5), OBL(4) | 最長距離到後場；反拍對角 |
| FR（前右） | OBL(4), OBR(5) | 最長距離到後場；反拍直線 |
| ML（中左） | OBR(5), OFR(1) | 後場對角最遠；前場對角 |
| MR（中右） | OBL(4), OFL(0) | 後場對角+反拍最遠；前場對角 |
| BL（後左） | OFR(1), OFL(0) | 前場最長對角；前場直線 |
| BR（後右） | OFL(0), OFR(1) | 前場對角+反拍最遠；前場直線 |

對方落點索引：0=OFL, 1=OFR, 2=OML, 3=OMR, 4=OBL, 5=OBR

```javascript
const TACTICS_MAP = [
  [5, 4],  // 0=FL → OBR(5), OBL(4)
  [4, 5],  // 1=FR → OBL(4), OBR(5)
  [5, 1],  // 2=ML → OBR(5), OFR(1)
  [4, 0],  // 3=MR → OBL(4), OFL(0)
  [1, 0],  // 4=BL → OFR(1), OFL(0)
  [0, 1],  // 5=BR → OFL(0), OFR(1)
];
```

### 2.3 JavaScript 修改（`badminton-tactical-board.html`）

**刪除 `setTrainSide()` 函數**（完整移除）。

**簡化 `getTrainPositions()`、`getOppPositions()`、`drawTrainLights()`**：

```javascript
// 改前
const trainLeft = (TRAIN.side === 'home') ? homeLeft : !homeLeft;

// 改後
const trainLeft = homeLeft;  // 固定為我方
```

**`pickNextLight()` 對方落點改用 TACTICS_MAP**：

```javascript
// 改後（替換原本隨機選法）
const tactics = TACTICS_MAP[TRAIN.currentLight];
// 80% 選最佳落點，20% 選次佳（增加變化）
TRAIN.oppLight = Math.random() < 0.8 ? tactics[0] : tactics[1];
```

### 2.4 `badminton-trainer/page.tsx` 修改

**新增 TACTICS_MAP**（玩家 1-6 → 對方 1-6 映射）：

```typescript
const TACTICS_MAP: Record<PositionId, PositionId[]> = {
  1: [6, 5],  // 前左 → 對方後右(最遠), 後左(反拍)
  2: [5, 6],  // 前右 → 對方後左(反拍最遠), 後右
  3: [6, 2],  // 中左 → 對方後右(最遠), 前右
  4: [5, 1],  // 中右 → 對方後左(反拍最遠), 前左
  5: [2, 1],  // 後左 → 對方前右(最遠), 前左
  6: [1, 2],  // 後右 → 對方前左(反拍最遠), 前右
};
```

**`triggerNext()` 對方落點改用 TACTICS_MAP**：

```typescript
// 改前
setTargetPos(randomPositionId());

// 改後
const tactics = TACTICS_MAP[newPos];
const targetId = Math.random() < 0.8 ? tactics[0] : tactics[1];
setTargetPos(targetId);
```

---

## 修改檔案清單

| 檔案 | 修改項目 |
|------|---------|
| `frontend/public/badminton-tactical-board.html` | `resize()` aspect ratio、`computeScale()` W/H 交換、`drawCourt()` 全面改寫、`drawServe()` 座標更新、移除「側別」HTML、新增 `TACTICS_MAP`、移除 `setTrainSide()`、`getTrainPositions()`/`getOppPositions()`/`drawTrainLights()` 移除 side 依賴、`pickNextLight()` 使用 TACTICS_MAP |
| `frontend/app/(member)/badminton-trainer/page.tsx` | 新增 `TACTICS_MAP`、`triggerNext()` 改用 TACTICS_MAP |

---

## 驗收標準

- [ ] 球場顯示為直式，長軸垂直（上下方向為 13.4m）
- [ ] 球場線條（底線、邊線、球網、發球線、中線）位置正確
- [ ] 戰術訓練 HUD 不再顯示「側別」切換按鈕
- [ ] hint 文字更新為「最長距離+反拍優先」說明
- [ ] 對方落點根據 TACTICS_MAP 決定（80% 最佳，20% 次佳）
- [ ] `page.tsx` 的訓練器對方落點同樣使用 TACTICS_MAP
- [ ] 3D 透視模式（若有）不受影響
