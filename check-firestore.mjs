import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(await readFile('./credentials/firebase-admin-key.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

// Check courses
const coursesSnap = await db.collection('courses').get();
console.log(`\n✅ Found ${coursesSnap.size} courses in Firestore:`);
coursesSnap.forEach(doc => {
  const data = doc.data();
  console.log(`  - ${doc.id}: ${data.title}`);
  console.log(`    Type: ${data.type}, Status: ${data.status}`);
  console.log(`    Level: ${data.gameConfig?.level}, Questions: ${data.gameConfig?.questions?.length}`);
});
