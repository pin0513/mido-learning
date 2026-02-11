/**
 * 關於技能村頁面（公開頁面）
 * - 介紹技能村系統
 * - 提供註冊/登入入口
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/skill-village/ui/Button';

export default function AboutSkillVillagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              🏰 歡迎來到技能村
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              透過遊戲化學習，讓每一次練習都充滿成就感！<br />
              升級你的角色，解鎖新技能，獲得獎勵！
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register/simple">
                <Button variant="primary" size="lg" className="min-w-[200px]">
                  🎮 快速註冊
                </Button>
              </Link>
              <Link href="/skill-village-login">
                <Button variant="secondary" size="lg" className="min-w-[200px]">
                  🔑 登入
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              已經有帳號？
              <Link href="/skill-village-login" className="text-blue-600 hover:text-blue-700 ml-1">
                立即登入
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            為什麼選擇技能村？
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                清晰的進度追蹤
              </h3>
              <p className="text-gray-600">
                每次練習都有經驗值累積，升級過程一目了然，讓學習成果可見！
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                實質獎勵機制
              </h3>
              <p className="text-gray-600">
                持續練習可獲得虛擬貨幣，兌換實體獎品，讓學習更有動力！
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                多元技能訓練
              </h3>
              <p className="text-gray-600">
                從英打練習到數學運算，多種技能等你來挑戰，持續擴展中！
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Preview Section */}
      <div className="py-16 bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            技能訓練場
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skill Preview 1 */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-6xl mb-4">⌨️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">英打練習</h3>
              <p className="text-gray-600 text-sm mb-4">
                提升打字速度與準確度，從初級到高級循序漸進
              </p>
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                ✅ 可用
              </div>
            </div>

            {/* Skill Preview 2 */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center opacity-60">
              <div className="text-6xl mb-4">🔢</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">數學運算</h3>
              <p className="text-gray-600 text-sm mb-4">
                訓練心算能力，提升運算速度與準確度
              </p>
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                🚧 即將推出
              </div>
            </div>

            {/* Skill Preview 3 */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center opacity-60">
              <div className="text-6xl mb-4">🧠</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">記憶遊戲</h3>
              <p className="text-gray-600 text-sm mb-4">
                挑戰記憶力極限，訓練專注力與觀察力
              </p>
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                🚧 即將推出
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            準備好開始你的學習冒險了嗎？
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            立即註冊，開始累積經驗、解鎖技能、獲得獎勵！
          </p>

          <Link href="/register/simple">
            <Button variant="success" size="lg" className="min-w-[250px]">
              🚀 立即開始
            </Button>
          </Link>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              💡 提示：遊戲註冊只需使用者名稱與密碼，快速又方便！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
