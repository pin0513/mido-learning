#!/bin/bash

# 教材測試資料插入腳本

API_URL="http://localhost:5000"
TOKEN="${ADMIN_TOKEN:-YOUR_ADMIN_TOKEN_HERE}"

echo "🌱 開始插入教材測試資料..."
echo ""

# 檢查 TOKEN
if [ "$TOKEN" = "YOUR_ADMIN_TOKEN_HERE" ]; then
    echo "❌ 請設定 ADMIN_TOKEN 環境變數"
    echo "   使用方式: ADMIN_TOKEN='your_token' ./seed-components.sh"
    exit 1
fi

echo "📚 插入教材資料..."

# 教材 1: 打字練習 - 注音符號
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "注音符號練習",
    "subject": "基礎打字",
    "description": "透過遊戲學習注音符號的打字技巧，適合初學者。包含 ㄅㄆㄇㄈ 等基本注音符號的練習。",
    "category": "typing",
    "visibility": "published",
    "tags": ["打字", "注音", "初學者", "基礎"],
    "questions": []
  }'

echo ""

# 教材 2: 英文打字
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "英文字母練習",
    "subject": "英文打字訓練",
    "description": "學習英文鍵盤配置，從 ABC 開始練習，逐步提升打字速度與準確度。",
    "category": "typing",
    "visibility": "published",
    "tags": ["打字", "英文", "鍵盤", "速度"],
    "questions": []
  }'

echo ""

# 教材 3: 數學遊戲
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "加法大冒險",
    "subject": "基礎數學",
    "description": "透過遊戲學習加法運算，適合國小學生。從簡單的個位數加法開始，逐步提升難度。",
    "category": "math",
    "visibility": "published",
    "tags": ["數學", "加法", "國小", "遊戲"],
    "questions": []
  }'

echo ""

# 教材 4: 乘法練習
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "九九乘法表",
    "subject": "乘法運算",
    "description": "熟練九九乘法表，建立數學基礎。包含互動式練習和記憶技巧。",
    "category": "math",
    "visibility": "published",
    "tags": ["數學", "乘法", "九九乘法表", "記憶"],
    "questions": []
  }'

echo ""

# 教材 5: 程式設計入門
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "程式設計第一課",
    "subject": "程式語言基礎",
    "description": "什麼是程式？如何寫出第一個程式？透過簡單的範例了解程式設計的基本概念。",
    "category": "programming",
    "visibility": "published",
    "tags": ["程式設計", "入門", "基礎", "初學者"],
    "questions": []
  }'

echo ""

# 教材 6: 科學實驗
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "水的三態變化",
    "subject": "自然科學",
    "description": "觀察水的固態、液態、氣態三種狀態，了解物質變化的原理。包含簡單的家庭實驗。",
    "category": "science",
    "visibility": "published",
    "tags": ["科學", "物質", "實驗", "自然"],
    "questions": []
  }'

echo ""

# 教材 7: 英語會話
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "日常英語對話",
    "subject": "英語會話",
    "description": "學習日常生活中常用的英語對話，包含問候、購物、點餐等情境。",
    "category": "language",
    "visibility": "published",
    "tags": ["英語", "會話", "日常", "實用"],
    "questions": []
  }'

echo ""

# 教材 8: 歷史故事
curl -X POST "$API_URL/api/components" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "台灣歷史小故事",
    "subject": "台灣歷史",
    "description": "透過有趣的故事認識台灣的歷史，從史前時代到現代。適合親子共讀。",
    "category": "history",
    "visibility": "published",
    "tags": ["歷史", "台灣", "故事", "文化"],
    "questions": []
  }'

echo ""

echo "✅ 教材測試資料插入完成！"
echo ""
echo "📍 查看教材："
echo "   首頁: http://localhost:3001"
echo "   教材列表: http://localhost:3001/components"
echo "   管理介面: http://localhost:3001/admin/components"
