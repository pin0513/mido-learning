#!/bin/bash

# 測試資料插入腳本
# 需要先登入取得 admin token

API_URL="http://localhost:5000"
TOKEN="${ADMIN_TOKEN:-YOUR_ADMIN_TOKEN_HERE}"

echo "🌱 開始插入測試資料..."
echo ""

# 檢查 TOKEN
if [ "$TOKEN" = "YOUR_ADMIN_TOKEN_HERE" ]; then
    echo "❌ 請設定 ADMIN_TOKEN 環境變數"
    echo "   使用方式: ADMIN_TOKEN='your_token' ./seed-test-data.sh"
    exit 1
fi

echo "📊 插入成就資料..."

# 成就 1: 新手上路
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "新手上路",
    "description": "完成你的第一個課程",
    "icon": "🎓",
    "type": "GameCompletion",
    "condition": {
      "type": "CompleteCourse",
      "courseId": "any"
    },
    "reward": {
      "experience": 100,
      "coins": 50
    },
    "isActive": true,
    "displayOrder": 1
  }'

echo ""

# 成就 2: 速度達人
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "速度達人",
    "description": "達到 30 WPM 打字速度",
    "icon": "⚡",
    "type": "SkillMastery",
    "condition": {
      "type": "ReachWpm",
      "minWpm": 30
    },
    "reward": {
      "experience": 200,
      "coins": 100
    },
    "isActive": true,
    "displayOrder": 2
  }'

echo ""

# 成就 3: 準確射手
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "準確射手",
    "description": "達到 95% 準確度",
    "icon": "🎯",
    "type": "SkillMastery",
    "condition": {
      "type": "ReachAccuracy",
      "minAccuracy": 95
    },
    "reward": {
      "experience": 150,
      "coins": 75
    },
    "isActive": true,
    "displayOrder": 3
  }'

echo ""

# 成就 4: 完美主義
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "完美主義",
    "description": "連續 5 次完美通關",
    "icon": "💎",
    "type": "WinStreak",
    "condition": {
      "type": "ConsecutivePerfect",
      "consecutivePerfect": 5
    },
    "reward": {
      "experience": 300,
      "coins": 150
    },
    "isActive": true,
    "displayOrder": 4
  }'

echo ""

# 成就 5: 勤奮學習
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "勤奮學習",
    "description": "累計遊玩 10 次",
    "icon": "📚",
    "type": "Milestone",
    "condition": {
      "type": "TotalGamesPlayed",
      "totalGames": 10
    },
    "reward": {
      "experience": 250,
      "coins": 125
    },
    "isActive": true,
    "displayOrder": 5
  }'

echo ""

# 成就 6: 星星收集家
curl -X POST "$API_URL/api/game-admin/achievements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "星星收集家",
    "description": "累積獲得 50 顆星星",
    "icon": "⭐",
    "type": "StarCollection",
    "condition": {
      "type": "TotalStarsCollected",
      "totalStars": 50
    },
    "reward": {
      "experience": 500,
      "coins": 250
    },
    "isActive": true,
    "displayOrder": 6
  }'

echo ""
echo "✅ 測試資料插入完成！"
echo ""
echo "📍 查看成就："
echo "   管理介面: http://localhost:3001/game-admin/achievements"
echo "   會員介面: http://localhost:3001/dashboard/achievements"
