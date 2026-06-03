import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc as firestoreDoc, 
  getDoc as firestoreGetDoc, 
  setDoc as firestoreSetDoc, 
  getDocs as firestoreGetDocs, 
  collection as firestoreCollection, 
  deleteDoc as firestoreDeleteDoc, 
  onSnapshot as firestoreOnSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Support Vercel/GitHub deployments with Vite environment variables
const loadFirebaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  if (
    metaEnv.VITE_FIREBASE_API_KEY &&
    metaEnv.VITE_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
      firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId || '(default)',
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
    };
  }
  return defaultFirebaseConfig;
};

const firebaseConfig = loadFirebaseConfig();
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if we are operating using placeholder credentials (unprovisioned remixed applet)
export const isFirebasePlaceholder = 
  !firebaseConfig.projectId || 
  firebaseConfig.projectId.includes('remixed-') || 
  firebaseConfig.projectId.includes('placeholder') || 
  firebaseConfig.apiKey === 'remixed-api-key';

// Mock/LocalStorage database implementation to enable instant lag-free local preview matching real multi-tab connections
const getLocalDB = (): Record<string, any> => {
  try {
    const data = localStorage.getItem('mock_firestore_db');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveLocalDB = (dbState: Record<string, any>) => {
  try {
    localStorage.setItem('mock_firestore_db', JSON.stringify(dbState));
    window.dispatchEvent(new Event('mock_db_update'));
  } catch (err) {
    console.error("Local Storage Sync failed:", err);
  }
};

// Mock reference classes mimicking Firebase SDK interfaces
export class MockDocRef {
  constructor(public id: string, public path: string) {}
}

export class MockCollectionRef {
  constructor(public id: string, public path: string) {}
}

export class MockDocSnapshot {
  constructor(public id: string, private _exists: boolean, private _data: any) {}
  exists() { return this._exists; }
  data() { return this._data; }
}

export class MockQuerySnapshot {
  docs: MockDocSnapshot[] = [];
  constructor(docs: MockDocSnapshot[]) {
    this.docs = docs;
  }
  get empty() { return this.docs.length === 0; }
  forEach(callback: (doc: MockDocSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

function buildPath(...segments: any[]): string {
  const parts: string[] = [];
  for (const seg of segments) {
    if (!seg) continue;
    if (Array.isArray(seg)) {
      for (const item of seg) {
        if (!item) continue;
        if (typeof item === 'string') {
          parts.push(item);
        } else if (item.path) {
          parts.push(item.path);
        }
      }
    } else if (typeof seg === 'string') {
      parts.push(seg);
    } else if (seg.path) {
      parts.push(seg.path);
    }
  }
  return parts.join('/').replace(/\/+/g, '/');
}

// Dynamic switch controlling whether we run fallback database operations
export let useMockDb = isFirebasePlaceholder;

// Proxied exports for Firebase API calls
export const doc = (dbRef: any, ...args: any[]): any => {
  if (useMockDb) {
    const pathParts = args.filter(a => typeof a === 'string' || (a && a.path));
    const fullPath = buildPath(dbRef, pathParts);
    const segments = fullPath.split('/').filter(Boolean);
    const docId = segments[segments.length - 1] || 'default';
    return new MockDocRef(docId, fullPath);
  }
  try {
    return (firestoreDoc as any)(dbRef, ...args);
  } catch (err) {
    console.warn("Real Firestore doc creation failed, enabling express fallback database:", err);
    useMockDb = true;
    const pathParts = args.filter(a => typeof a === 'string' || (a && a.path));
    const fullPath = buildPath(dbRef, pathParts);
    const segments = fullPath.split('/').filter(Boolean);
    const docId = segments[segments.length - 1] || 'default';
    return new MockDocRef(docId, fullPath);
  }
};

export const collection = (dbRef: any, ...args: any[]): any => {
  if (useMockDb) {
    const pathParts = args.filter(a => typeof a === 'string' || (a && a.path));
    const fullPath = buildPath(dbRef, pathParts);
    const segments = fullPath.split('/').filter(Boolean);
    const colId = segments[segments.length - 1] || 'default';
    return new MockCollectionRef(colId, fullPath);
  }
  try {
    return (firestoreCollection as any)(dbRef, ...args);
  } catch (err) {
    console.warn("Real Firestore collection creation failed, enabling express fallback database:", err);
    useMockDb = true;
    const pathParts = args.filter(a => typeof a === 'string' || (a && a.path));
    const fullPath = buildPath(dbRef, pathParts);
    const segments = fullPath.split('/').filter(Boolean);
    const colId = segments[segments.length - 1] || 'default';
    return new MockCollectionRef(colId, fullPath);
  }
};

export const getDoc = async (ref: any): Promise<any> => {
  if (useMockDb) {
    if (ref instanceof MockDocRef) {
      try {
        const res = await fetch(`/api/db-get?path=${encodeURIComponent(ref.path)}&type=doc`);
        if (res.ok) {
          const body = await res.json();
          // Keep a local copy in localStorage for backup/cache
          const dbState = getLocalDB();
          if (body.exists) {
            dbState[ref.path] = body.data;
          } else {
            delete dbState[ref.path];
          }
          localStorage.setItem('mock_firestore_db', JSON.stringify(dbState));
          
          return new MockDocSnapshot(ref.id, body.exists, body.data);
        }
      } catch (err) {
        console.warn("Express DB Sync fallback to localStorage:", err);
      }
      
      const dbState = getLocalDB();
      const data = dbState[ref.path];
      return new MockDocSnapshot(ref.id, !!data, data);
    }
    // If somehow we got a real Ref, convert it to MockDocRef
    const path = ref.path || '';
    return getDoc(new MockDocRef(path.split('/').pop() || '', path));
  }
  try {
    // Implement a 3-second timeout for the real Firestore getDoc call
    const docPromise = firestoreGetDoc(ref);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Real Firestore operation timed out")), 3000);
    });
    return await Promise.race([docPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Real Firestore getDoc failed/timed out, enabling express fallback database:", err);
    useMockDb = true;
    const path = ref.path || '';
    return getDoc(new MockDocRef(path.split('/').pop() || '', path));
  }
};

export const getDocs = async (ref: any): Promise<any> => {
  if (useMockDb) {
    if (ref instanceof MockCollectionRef) {
      try {
        const res = await fetch(`/api/db-get?path=${encodeURIComponent(ref.path)}&type=collection`);
        if (res.ok) {
          const body = await res.json();
          const docs = (body.docs || []).map((d: any) => new MockDocSnapshot(d.id, true, d.data));
          
          // Sync local storage cache for backup
          const dbState = getLocalDB();
          // Remove anything matching current prefix, replaced by current server states
          const prefix = ref.path + '/';
          for (const key of Object.keys(dbState)) {
            if (key.startsWith(prefix) && !key.substring(prefix.length).includes('/')) {
              delete dbState[key];
            }
          }
          for (const d of body.docs || []) {
            dbState[prefix + d.id] = d.data;
          }
          localStorage.setItem('mock_firestore_db', JSON.stringify(dbState));

          return new MockQuerySnapshot(docs);
        }
      } catch (err) {
        console.warn("Express DB Sync fallback to localStorage:", err);
      }

      const dbState = getLocalDB();
      const docs: MockDocSnapshot[] = [];
      const prefix = ref.path + '/';
      for (const [key, value] of Object.entries(dbState)) {
        if (key.startsWith(prefix)) {
          const subPath = key.substring(prefix.length);
          if (!subPath.includes('/')) {
            docs.push(new MockDocSnapshot(subPath, true, value));
          }
        }
      }
      return new MockQuerySnapshot(docs);
    }
    // Convert to mock collection ref
    const path = ref.path || '';
    return getDocs(new MockCollectionRef(path.split('/').pop() || '', path));
  }
  try {
    const docsPromise = firestoreGetDocs(ref);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Real Firestore operation timed out")), 3000);
    });
    return await Promise.race([docsPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Real Firestore getDocs failed/timed out, enabling express fallback database:", err);
    useMockDb = true;
    const path = ref.path || '';
    return getDocs(new MockCollectionRef(path.split('/').pop() || '', path));
  }
};

export const setDoc = async (ref: any, data: any, options?: any): Promise<any> => {
  if (useMockDb) {
    if (ref instanceof MockDocRef) {
      const merge = !!(options && options.merge);
      
      // Update local storage first for snappy responsive UI
      const dbState = getLocalDB();
      const existingDoc = dbState[ref.path] || {};
      if (merge) {
        dbState[ref.path] = { ...existingDoc, ...data };
      } else {
        dbState[ref.path] = data;
      }
      saveLocalDB(dbState);

      // Tell Express backend
      try {
        await fetch('/api/db-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: ref.path, data, merge })
        });
      } catch (err) {
        console.error("Express DB Sync setDoc failed:", err);
      }
      return;
    }
    const path = ref.path || '';
    return setDoc(new MockDocRef(path.split('/').pop() || '', path), data, options);
  }
  try {
    const writePromise = firestoreSetDoc(ref, data, options);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Real Firestore operation timed out")), 3000);
    });
    return await Promise.race([writePromise, timeoutPromise]);
  } catch (err) {
    console.warn("Real Firestore setDoc failed/timed out, enabling express fallback database:", err);
    useMockDb = true;
    const path = ref.path || '';
    return setDoc(new MockDocRef(path.split('/').pop() || '', path), data, options);
  }
};

export const deleteDoc = async (ref: any): Promise<any> => {
  if (useMockDb) {
    if (ref instanceof MockDocRef) {
      const dbState = getLocalDB();
      delete dbState[ref.path];
      saveLocalDB(dbState);

      try {
        await fetch('/api/db-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: ref.path })
        });
      } catch (err) {
        console.error("Express DB Sync deleteDoc failed:", err);
      }
      return;
    }
    const path = ref.path || '';
    return deleteDoc(new MockDocRef(path.split('/').pop() || '', path));
  }
  try {
    const deletePromise = firestoreDeleteDoc(ref);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Real Firestore operation timed out")), 3000);
    });
    return await Promise.race([deletePromise, timeoutPromise]);
  } catch (err) {
    console.warn("Real Firestore deleteDoc failed/timed out, enabling express fallback database:", err);
    useMockDb = true;
    const path = ref.path || '';
    return deleteDoc(new MockDocRef(path.split('/').pop() || '', path));
  }
};

export const onSnapshot = (ref: any, callback: any, errorCallback?: any): any => {
  if (useMockDb) {
    let active = true;
    let previousJSON = '';

    const convertedRef = (ref instanceof MockDocRef || ref instanceof MockCollectionRef)
      ? ref
      : (() => {
          const path = ref.path || '';
          const isDoc = path.split('/').filter(Boolean).length % 2 === 0;
          return isDoc 
            ? new MockDocRef(path.split('/').pop() || '', path) 
            : new MockCollectionRef(path.split('/').pop() || '', path);
        })();

    const runCallback = async () => {
      if (!active) return;
      try {
        if (convertedRef instanceof MockDocRef) {
          const snap = await getDoc(convertedRef);
          if (!active) return;
          const currentJSON = JSON.stringify(snap.data() || null);
          if (currentJSON !== previousJSON) {
            previousJSON = currentJSON;
            callback(snap);
          }
        } else if (convertedRef instanceof MockCollectionRef) {
          const snap = await getDocs(convertedRef);
          if (!active) return;
          const currentJSON = JSON.stringify((snap.docs || []).map((d: any) => d.data()));
          if (currentJSON !== previousJSON) {
            previousJSON = currentJSON;
            callback(snap);
          }
        }
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
    };

    runCallback();

    // Poll Express backend every 1200ms for fast responsive updates across separate devices
    const intervalRef = setInterval(runCallback, 1200);

    const handler = () => {
      runCallback();
    };
    window.addEventListener('mock_db_update', handler);

    return () => {
      active = false;
      clearInterval(intervalRef);
      window.removeEventListener('mock_db_update', handler);
    };
  }
  
  try {
    return firestoreOnSnapshot(ref, callback, (err) => {
      console.warn("Real Firestore onSnapshot error, fallback to mock DB active:", err);
      useMockDb = true;
      if (errorCallback) errorCallback(err);
    });
  } catch (err) {
    console.warn("Real Firestore onSnapshot subscribe error, fallback to mock DB active:", err);
    useMockDb = true;
    const path = ref.path || '';
    const isDoc = path.split('/').filter(Boolean).length % 2 === 0;
    const convertedRef = isDoc 
      ? new MockDocRef(path.split('/').pop() || '', path) 
      : new MockCollectionRef(path.split('/').pop() || '', path);
    return onSnapshot(convertedRef, callback, errorCallback);
  }
};

// Validate Connection to Firestore on startup
export async function testConnection() {
  if (isFirebasePlaceholder) {
    useMockDb = true;
    console.info('Firestore operates in instant local mock mode.');
    return;
  }
  setTimeout(async () => {
    try {
      const testPromise = getDocFromServer(firestoreDoc(db, 'test', 'connection'));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase test connection timed out")), 2000);
      });
      await Promise.race([testPromise, timeoutPromise]);
      console.log('Firebase connection test completed successfully.');
    } catch (error) {
      console.warn('Real Firestore is unreachable, disabled or timed out. Falling back to Express database.', error);
      useMockDb = true;
    }
  }, 500);
}

testConnection();

