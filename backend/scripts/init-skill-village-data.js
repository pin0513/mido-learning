/**
 * 初始化技能村種子資料
 * 執行方式: node scripts/init-skill-village-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// 初始化 Firebase Admin SDK
const serviceAccount = require(path.resolve(__dirname, '../../credentials/firebase-admin-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mido-learning'
});

const db = admin.firestore();

// 英打練習技能配置
const englishTypingSkill = {
  id: 'english-typing',
  name: '英打練習',
  icon: '⌨️',
  description: '透過打字練習提升英文能力與速度',
  category: 'language',
  status: 'active',

  // 關卡配置
  levels: [
    {
      id: 'beginner',
      name: '初級',
      unlockCondition: { characterLevel: 1 },
      difficulty: 1,
      expMultiplier: 1.0,
      rewardMultiplier: 1.0
    },
    {
      id: 'intermediate',
      name: '中級',
      unlockCondition: { characterLevel: 5 },
      difficulty: 2,
      expMultiplier: 1.5,
      rewardMultiplier: 1.3
    },
    {
      id: 'advanced',
      name: '高級',
      unlockCondition: { characterLevel: 10 },
      difficulty: 3,
      expMultiplier: 2.0,
      rewardMultiplier: 1.5
    }
  ],

  // 遊戲配置
  gameConfig: {
    type: 'typing',
    timeLimit: 60, // 秒

    // 單字庫
    wordSets: {
      beginner: [
        'cat', 'dog', 'apple', 'book', 'tree', 'car', 'sun', 'moon',
        'star', 'fish', 'bird', 'house', 'door', 'window', 'table',
        'chair', 'water', 'fire', 'earth', 'wind', 'hello', 'world',
        'love', 'happy', 'smile', 'friend', 'family', 'school', 'learn',
        'play', 'game', 'music', 'dance', 'sing', 'read', 'write',
        'draw', 'paint', 'color', 'red', 'blue', 'green', 'yellow',
        'black', 'white', 'big', 'small', 'good', 'bad', 'new', 'old'
      ],

      intermediate: [
        'The quick brown fox jumps over the lazy dog',
        'Practice makes perfect in everything you do',
        'Learning to type fast improves your efficiency',
        'Technology changes the way we communicate',
        'Reading books expands your knowledge and imagination',
        'Music brings joy to people around the world',
        'Teamwork makes the dream work successfully',
        'Success comes from hard work and dedication',
        'Knowledge is power that changes your life',
        'Education opens doors to endless possibilities'
      ],

      advanced: [
        'In the digital age, the ability to type quickly and accurately has become an essential skill for productivity and communication.',
        'Mastering touch typing not only increases your typing speed but also reduces the physical strain on your hands and wrists.',
        'Consistent practice and proper finger positioning are the fundamental keys to becoming a proficient typist in the modern workplace.',
        'The journey to typing mastery requires patience, dedication, and a willingness to learn from your mistakes and continuously improve.',
        'As technology continues to evolve, the importance of strong typing skills remains constant across all professional fields and industries.'
      ]
    }
  },

  // 經驗值規則
  expRules: {
    baseExp: 10,
    timeBonus: 2, // 每分鐘
    accuracyBonus: {
      threshold: 0.9, // 90% 以上
      bonus: 5
    },
    streakBonus: {
      threshold: 3, // 連續 3 次
      bonus: 10
    }
  },

  // 獎勵規則
  rewardRules: {
    minPlayTime: 10, // 最少 10 分鐘
    rewardRange: [1, 5], // 隨機 1-5 元
    dailyLimit: 20, // 每日上限 20 元
    cooldown: 10 // 冷卻 10 分鐘
  },

  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

async function initSkills() {
  console.log('🌱 開始初始化技能村種子資料...\n');

  try {
    // 建立英打練習技能
    console.log('📝 建立技能：英打練習');
    await db.collection('skill_village_skills').doc('english-typing').set(englishTypingSkill);
    console.log('✅ 英打練習技能建立成功！');

    // 驗證資料
    const doc = await db.collection('skill_village_skills').doc('english-typing').get();
    if (doc.exists) {
      console.log('\n📊 驗證資料：');
      const data = doc.data();
      console.log(`   - 技能名稱: ${data.name}`);
      console.log(`   - 狀態: ${data.status}`);
      console.log(`   - 關卡數量: ${data.levels.length}`);
      console.log(`   - 初級單字數: ${data.gameConfig.wordSets.beginner.length}`);
      console.log(`   - 中級句子數: ${data.gameConfig.wordSets.intermediate.length}`);
      console.log(`   - 高級段落數: ${data.gameConfig.wordSets.advanced.length}`);
    }

    console.log('\n✅ 所有種子資料建立完成！');
    console.log('🎮 現在可以開始測試遊戲了！');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 執行初始化
initSkills();
