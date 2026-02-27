# Changelog

All notable changes to Mido Learning are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.9.0] - 2026-02-28

### Added
- 經濟系統重構 — 雙幣別 (XP + 零用金) 全功能實作
  - 家長加扣分支援選擇 XP 或零用金
  - 商城商品雙標價 (xpPrice + allowancePrice)
  - XP→零用金兌換功能（匯率由家長設定）
  - 玩家提領零用金申請 + 家長審核
- 訪客排行榜頁面 — 透過家庭代碼公開瀏覽玩家排名 + 零用金餘額顯示

### Fixed
- FirebaseAuthHandler 加入 name claim + 修復舊教材建立者名稱

### Chore
- 移除一次性 fix-creators endpoint

## [0.8.0] - 2026-02-21

### Added
- 教材管理新增編輯入口
- 多家庭管理 UI 強化 — 家庭選擇器 + 行動版切換器
- Super Admin 家庭管理頁面（列表/封禁/刪除）
- 多家庭支援 + 共同家長
- 全站 Open Graph / Twitter Card 補齊 + 教材頁動態 metadata
- 教材上傳共用化 + 首頁分群 + Admin 上傳入口
- 報表 Tab 改為集點貼紙牆童趣風格

### Fixed
- collectionGroup query 加 try-catch 避免 500 crash
- 新增 coAdmins collection group index
- 修正已登入用戶仍顯示歡迎畫面
- 家庭登入用 Suspense 包住 useSearchParams 修正 prerender 失敗
- DELETE endpoint 加 [FromBody] 修正 Kestrel 啟動崩潰

## [0.7.0] - 2026-02-18

### Added
- Family Scoreboard 計分板系統
  - 家庭建立、玩家管理、積分加扣分
  - 商城 / 任務 / 每日任務
  - 共同家長（Email 查帳號）
  - 記錄管理 Tab（批次/單一刪除）
- 羽球場地戰術板 + 米字步訓練器

### Changed
- 家庭計分板正名 + 移除 Header 入口
- 商城/任務/Seed 重構 + 兌換頁修正

## [0.6.0] - 2026-02-11

### Added
- Skill Village 技能村模組
- 遊戲類別（Web Game 上傳）
- 頁面瀏覽 / 教材瀏覽追蹤分析
- 動態分類與標籤輸入 UI

### Fixed
- CORS 允許 learn.paulfun.net
- 匿名訪問教材列表 / manifest

## [0.5.0] - 2026-02-01

### Added
- 教材上傳系統（ZIP 上傳、版本管理、自動偵測 HTML 入口）
- 使用者管理功能
- WISH 聊天機器人（前端 + API）
- RWD 響應式改版（Header, Sidebar, Footer）

### Fixed
- Material content proxy / signed URL / iframe 認證

## [0.1.0] - 2026-01-31

### Added
- Initial project setup
- 基本教材 CRUD + 分類 + 評分系統
