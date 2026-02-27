#!/usr/bin/env node

/**
 * 匯入英打遊戲課程種子資料到 Firestore
 *
 * 執行方式：
 * node spec/seeds/import-courses.mjs
 *
 * 需要先設定 GOOGLE_APPLICATION_CREDENTIALS 環境變數
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 初始化 Firebase Admin
try {
  // 嘗試使用明確的憑證檔案
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin initialized with explicit credentials');
  } else {
    // 使用 Application Default Credentials (gcloud auth)
    initializeApp({
      projectId: 'mido-learning'
    });
    console.log('✅ Firebase Admin initialized with Application Default Credentials');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const db = getFirestore();

async function importCourses() {
  try {
    // 讀取種子資料
    const coursesData = JSON.parse(
      await readFile(join(__dirname, 'typing-game-courses.json'), 'utf8')
    );

    console.log(`📥 Importing ${coursesData.length} courses...`);

    // 匯入每個課程
    for (const course of coursesData) {
      const { id, createdAt, updatedAt, ...courseData } = course;

      // 轉換日期為 Firestore Timestamp
      const data = {
        ...courseData,
        createdAt: Timestamp.fromDate(new Date(createdAt)),
        updatedAt: Timestamp.fromDate(new Date(updatedAt))
      };

      await db.collection('courses').doc(id).set(data, { merge: true });
      console.log(`  ✅ Imported: ${course.title} (${id})`);
    }

    console.log('\n🎉 All courses imported successfully!');
    console.log('\n📋 Imported courses:');
    coursesData.forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.title} (Level ${course.gameConfig.level})`);
      console.log(`     - Target WPM: ${course.gameConfig.targetWPM}`);
      console.log(`     - Time Limit: ${course.gameConfig.timeLimit}s`);
      console.log(`     - Questions: ${course.gameConfig.questions.length}`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// 執行匯入
importCourses();
