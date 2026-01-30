'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  QueryConstraint,
  UpdateData,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as T) : null;
}

export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const db = getFirebaseDb();
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as T));
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: UpdateData<DocumentData>
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

export { where, collection, doc };
