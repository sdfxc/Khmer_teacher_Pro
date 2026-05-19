/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { Student } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operation: OperationType, path: string) {
  console.error(`Firestore Error [${operation}] at [${path}]:`, error);
  // Optional: throw specialized error for the system to catch
}

export function useFirestoreSync(userId: string | undefined) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const path = `teachers/${userId}/students`;
    const q = collection(db, path);

    // Initial connection test
    const testPath = 'test/connection';
    getDocFromServer(doc(db, testPath)).catch((e) => {
      // Ignored - common test from skill
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Student[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const addStudent = async (student: Student) => {
    if (!userId) return;
    const { id, ...data } = student;
    const path = `teachers/${userId}/students/${id}`;
    try {
      await setDoc(doc(db, path), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const addStudentsBulk = async (newStudents: Student[]) => {
    if (!userId) return;
    const batch = writeBatch(db);
    newStudents.forEach((student) => {
      const { id, ...data } = student;
      const ref = doc(db, `teachers/${userId}/students`, id);
      batch.set(ref, data);
    });
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `teachers/${userId}/students`);
    }
  };

  const updateStudent = async (student: Student) => {
    if (!userId) return;
    const { id, ...data } = student;
    const path = `teachers/${userId}/students/${id}`;
    try {
      await setDoc(doc(db, path), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!userId) return;
    const path = `teachers/${userId}/students/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  return { 
    students, 
    loading, 
    addStudent, 
    addStudentsBulk, 
    updateStudent, 
    deleteStudent 
  };
}
