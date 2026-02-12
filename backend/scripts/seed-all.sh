#!/bin/bash

# 一鍵插入所有測試資料

API_URL="http://localhost:5000"
TOKEN="${ADMIN_TOKEN:-YOUR_ADMIN_TOKEN_HERE}"

echo "🚀 一鍵插入所有測試資料"
echo "================================"
echo ""

# 檢查 TOKEN
if [ "$TOKEN" = "YOUR_ADMIN_TOKEN_HERE" ]; then
    echo "❌ 請設定 ADMIN_TOKEN 環境變數"
    echo ""
    echo "📖 使用方式："
    echo "   1. 登入 admin 帳號: http://localhost:3001/login"
    echo "   2. 開啟開發者工具 (F12)，在 Console 執行:"
    echo "      localStorage.getItem('token')"
    echo "   3. 複製 token，然後執行:"
    echo "      ADMIN_TOKEN='你的token' ./seed-all.sh"
    echo ""
    exit 1
fi

# 插入教材
echo "📚 步驟 1/2: 插入教材資料..."
echo "--------------------------------"
./seed-components.sh
echo ""

# 插入成就
echo "🏆 步驟 2/2: 插入成就資料..."
echo "--------------------------------"
./seed-test-data.sh
echo ""

echo "================================"
echo "✨ 所有測試資料插入完成！"
echo ""
echo "📍 立即查看："
echo "   🏠 首頁（公開教材）: http://localhost:3001"
echo "   🎮 技能村: http://localhost:3001/games"
echo "   🏆 成就系統: http://localhost:3001/dashboard/achievements"
echo "   ⚙️  管理介面: http://localhost:3001/admin/components"
echo ""
