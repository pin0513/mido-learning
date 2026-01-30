'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firebaseDb: Firestore | undefined;
let firebaseStorage: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}

export function getFirebaseDb(): Firestore {
  if (!firebaseDb) {
    firebaseDb = getFirestore(getFirebaseApp());
  }
  return firebaseDb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!firebaseStorage) {
    firebaseStorage = getStorage(getFirebaseApp());
  }
  return firebaseStorage;
}

export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : (undefined as unknown as Auth);
export const db = typeof window !== 'undefined' ? getFirebaseDb() : (undefined as unknown as Firestore);
export const storage = typeof window !== 'undefined' ? getFirebaseStorage() : (undefined as unknown as FirebaseStorage);
export default firebaseApp;
