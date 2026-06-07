/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Build environment-resilient configuration
const metaEnv = (import.meta as any).env || {};
const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;

const envConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`,
};

const app = initializeApp(envConfig);

// Initialize Firestore with specific database ID if provided, otherwise default
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Connectivity check based on the Firebase integration skill's directives
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("បណ្តាញអ៊ីនធឺណិតមិនដំណើរការ៖ សូមពិនិត្យមើលការភ្ជាប់ Firebase របស់អ្នក។");
    }
  }
}

testConnection();

export interface FirestoreErrorInfo {
  error_code: string;
  operation: string;
  collection: string;
  document_id?: string;
  user_id?: string;
  timestamp: string;
}

export function handleFirestoreError(error: any, operation: string, collection: string, docId?: string): never {
  console.error("កំហុស Firestore (Error):", error);
  const isPermissionError = error?.code === 'permission-denied' || 
                            error?.message?.includes('permission-denied') ||
                            error?.message?.includes('Missing or insufficient permissions');

  if (isPermissionError) {
    const errorInfo: FirestoreErrorInfo = {
      error_code: "PERMISSION_DENIED",
      operation,
      collection,
      document_id: docId,
      user_id: auth.currentUser?.uid,
      timestamp: new Date().toISOString()
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

export default app;
