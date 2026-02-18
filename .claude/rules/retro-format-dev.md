---
name: Retro Format
description: Retrospective meeting format and output requirements for continuous improvement
---

# Retro Format

## 適用範圍

每輪交付完成後，必須執行 Retrospective 會議。

---

## Retro 時機

- 專案交付完成後
- 重大里程碑達成後
- 遇到重大技術挑戰後
- 團隊成員變動前

---

## Retro 框架

### 選項 A: Start-Stop-Continue

| 類別 | 問題 |
|------|------|
| **Start** | 我們應該開始做什麼？ |
| **Stop** | 我們應該停止做什麼？ |
| **Continue** | 我們應該繼續做什麼？ |

---

### 選項 B: 4Ls

| 類別 | 問題 |
|------|------|
| **Liked** | 我們喜歡什麼？ |
| **Learned** | 我們學到什麼？ |
| **Lacked** | 我們缺少什麼？ |
| **Longed For** | 我們渴望什麼？ |

---

## 必要產出

### 1. 做得好的事（Keep Doing）
至少 3 項。

### 2. 需要改進的事（Improve）
至少 3 項，每項必須包含：
- Problem（問題）
- Root Cause（根因）
- Action（行動計畫：Who/What/When）

### 3. 學到的教訓（Lessons Learned）
至少 2 項，每項必須包含：
- What we learned
- What went wrong
- How we fixed
- Next time

### 4. 技術債清單
包含：
- ID
- 描述
- 影響
- 優先順序
- 預估時間

### 5. 下一輪行動計畫
具體的 Action Items（Who/What/When）。

---

## 文件格式

```markdown
# Retro Handoff Document

**專案名稱**: {專案名稱}
**交付日期**: {YYYY-MM-DD}

## 做得好的事 (Keep Doing)
- ...

## 需要改進的事 (Improve)
- ...

## 學到的教訓 (Lessons Learned)
- ...

## 技術債清單
| ID | 描述 | 優先順序 |
|----|------|----------|

## 下一輪行動計畫
- [ ] {Who} to do {What} by {When}
```

---

## 違反判定

- 未執行 Retro → 違反
- Retro 產出不完整（缺少必要項目）→ 違反
- 行動計畫沒有 Who/What/When → 違反

---

**版本**：1.0
