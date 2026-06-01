/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, LayoutGrid, RotateCcw, User, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check, Cloud, Loader2 } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount, QuizRoom, QuizChapter } from './types';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import StudentPlayView from './components/StudentPlayView';
import StudentLobby from './components/StudentLobby';

const EMOJIS = ["🥰", "😂", "😩", "🥳", "🥺", "😇", "😎", "🤩", "🤔", "🤗", "🤭", "🫠", "😤", "😮💨", "🫡", "😬", "🙄", "🤒", "😵💫", "😳", "🤪", "😜", "🤫", "🫣", "☹️", "😕"];

const DEFAULT_CLASSES: ClassInfo[] = [
  { id: 'class-7a', name: 'ថ្នាក់ទី៧ក' },
  { id: 'class-8a', name: 'ថ្នាក់ទី៨ក' },
  { id: 'class-9a', name: 'ថ្នាក់ទី៩ក' }
];

export default function App() {
  const [studentMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'student';
  });

  if (studentMode) {
    return <StudentPlayView />;
  }

  const [activeTab, setActiveTab] = useState<'wheel' | 'quiz' | 'groups' | 'students' | 'student-lobby'>('wheel');
  const [showWheelBulk, setShowWheelBulk] = useState(false);
  const [loadingCloudData, setLoadingCloudData] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('khmer_teacher_dark_mode');
    return saved === 'true';
  });

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('khmer_teacher_classes');
    return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const saved = localStorage.getItem('khmer_teacher_active_class_id');
    return saved || 'class-7a';
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    const saved = localStorage.getItem(`students_class_${activeId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cards, setCards] = useState<QuizCard[]>(() => {
    const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    const saved = localStorage.getItem(`quiz_cards_class_${activeId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [pickedIds, setPickedIds] = useState<string[]>(() => {
    const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    const saved = localStorage.getItem(`picked_students_class_${activeId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [chapters, setChapters] = useState<QuizChapter[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardState, setActiveCardState] = useState<'answering' | 'revealed'>('answering');

  useEffect(() => {
    setActiveCardState('answering');
  }, [activeCardId]);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [teacher, setTeacher] = useState<TeacherAccount | null>(() => {
    const saved = localStorage.getItem('logged_in_teacher');
    return saved ? JSON.parse(saved) : null;
  });

  // Dark mode Sync effect
  useEffect(() => {
    localStorage.setItem('khmer_teacher_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load teacher classes from Cloud when logged in
  useEffect(() => {
    if (!teacher) {
      const savedClasses = localStorage.getItem('khmer_teacher_classes');
      setClasses(savedClasses ? JSON.parse(savedClasses) : DEFAULT_CLASSES);
      
      const savedActiveId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
      setActiveClassId(savedActiveId);
      return;
    }

    const loadTeacherClasses = async () => {
      try {
        setLoadingCloudData(true);
        const classesCollRef = collection(db, 'teachers', teacher.id, 'classes');
        const classesSnap = await getDocs(classesCollRef);
        
        let fetchedClasses: ClassInfo[] = [];
        classesSnap.forEach(docSnap => {
          fetchedClasses.push(docSnap.data() as ClassInfo);
        });

        if (fetchedClasses.length === 0) {
          // Newly registered teacher. Seed with DEFAULT_CLASSES in Firestore
          for (const cls of DEFAULT_CLASSES) {
            await setDoc(doc(db, 'teachers', teacher.id, 'classes', cls.id), {
              id: cls.id,
              name: cls.name,
              pickedIds: [],
              cards: [],
              createdAt: new Date().toISOString()
            });
            fetchedClasses.push(cls);
          }
        }
        
        setClasses(fetchedClasses);
        
        const lastActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacher.id}`) || fetchedClasses[0]?.id;
        const exists = fetchedClasses.some(c => c.id === lastActiveId);
        setActiveClassId(exists ? lastActiveId : fetchedClasses[0]?.id);
      } catch (err) {
        console.error('Failed to load classes from cloud Firestore:', err);
      } finally {
        setLoadingCloudData(false);
      }
    };

    loadTeacherClasses();
  }, [teacher]);

  // Load students, cards, and picked status when activeClassId shifts
  useEffect(() => {
    if (!activeClassId) return;
    
    if (teacher) {
      localStorage.setItem(`khmer_teacher_active_class_id_${teacher.id}`, activeClassId);
    } else {
      localStorage.setItem('khmer_teacher_active_class_id', activeClassId);
    }

    if (!teacher) {
      // Local fallback
      const loadedStudents = localStorage.getItem(`students_class_${activeClassId}`);
      setStudents(loadedStudents ? JSON.parse(loadedStudents) : []);

      const loadedChaptersStr = localStorage.getItem(`chapters_class_${activeClassId}`);
      let loadedChapters: QuizChapter[] = [];
      let loadedActiveRoomId: string | null = null;

      if (loadedChaptersStr) {
        loadedChapters = JSON.parse(loadedChaptersStr);
        loadedActiveRoomId = localStorage.getItem(`active_room_id_${activeClassId}`);
        // Ensure accurate active roomId
        if (!loadedActiveRoomId && loadedChapters.length > 0) {
          loadedActiveRoomId = loadedChapters[0].rooms[0]?.id || null;
        }
      } else {
        // Try migrating from legacy rooms
        const loadedRoomsStr = localStorage.getItem(`rooms_class_${activeClassId}`);
        if (loadedRoomsStr) {
          const loadedRooms: QuizRoom[] = JSON.parse(loadedRoomsStr);
          const defaultChapter: QuizChapter = {
            id: `chapter-default-${Date.now()}`,
            name: 'ជំពូកទី១',
            rooms: loadedRooms,
            createdAt: Date.now()
          };
          loadedChapters = [defaultChapter];
          loadedActiveRoomId = localStorage.getItem(`active_room_id_${activeClassId}`) || loadedRooms[0]?.id;
        } else {
          // Migration of legacy cards data
          const legacyCardsStr = localStorage.getItem(`quiz_cards_class_${activeClassId}`);
          const legacyPickedStr = localStorage.getItem(`picked_students_class_${activeClassId}`);
          const legacyCards = legacyCardsStr ? JSON.parse(legacyCardsStr) : [];
          const legacyPicked = legacyPickedStr ? JSON.parse(legacyPickedStr) : [];

          const defaultRoom: QuizRoom = {
            id: `room-default-${Date.now()}`,
            name: 'មេរៀនទី១',
            cards: legacyCards,
            pickedIds: legacyPicked,
            createdAt: Date.now()
          };
          const defaultChapter: QuizChapter = {
            id: `chapter-default-${Date.now()}`,
            name: 'ជំពូកទី១',
            rooms: [defaultRoom],
            createdAt: Date.now()
          };
          loadedChapters = [defaultChapter];
          loadedActiveRoomId = defaultRoom.id;
        }
        
        // Save initial migrated chapters
        localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(loadedChapters));
        if (loadedActiveRoomId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, loadedActiveRoomId);
        }
      }

      setChapters(loadedChapters);
      setActiveRoomId(loadedActiveRoomId);

      // Find the active room in any chapter
      let activeRoom: QuizRoom | undefined;
      for (const ch of loadedChapters) {
        activeRoom = ch.rooms.find(r => r.id === loadedActiveRoomId);
        if (activeRoom) break;
      }
      if (!activeRoom && loadedChapters.length > 0) {
        activeRoom = loadedChapters[0].rooms[0];
      }

      setCards(activeRoom?.cards || []);
      setPickedIds(activeRoom?.pickedIds || []);
      return;
    }

    const loadClassDetails = async () => {
      try {
        setLoadingCloudData(true);
        
        // 1. Fetch class doc
        const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
        const classSnap = await getDoc(classDocRef);
        
        let loadedChapters: QuizChapter[] = [];
        let loadedActiveRoomId: string | null = null;

        if (classSnap.exists()) {
          const classData = classSnap.data();
          if (classData.chapters && classData.chapters.length > 0) {
            loadedChapters = classData.chapters;
            loadedActiveRoomId = classData.activeRoomId || loadedChapters[0].rooms[0]?.id || null;
          } else if (classData.rooms && classData.rooms.length > 0) {
            // Migrating legacy rooms representation
            const defaultChapter: QuizChapter = {
              id: `chapter-default-${Date.now()}`,
              name: 'ជំពូកទី១',
              rooms: classData.rooms,
              createdAt: Date.now()
            };
            loadedChapters = [defaultChapter];
            loadedActiveRoomId = classData.activeRoomId || classData.rooms[0].id;
          } else {
            // Migrating legacy struct
            const legacyCards = classData.cards || [];
            const legacyPicked = classData.pickedIds || [];
            const defaultRoom: QuizRoom = {
              id: `room-default-${Date.now()}`,
              name: 'មេរៀនទី១',
              cards: legacyCards,
              pickedIds: legacyPicked,
              createdAt: Date.now()
            };
            const defaultChapter: QuizChapter = {
              id: `chapter-default-${Date.now()}`,
              name: 'ជំពូកទី១',
              rooms: [defaultRoom],
              createdAt: Date.now()
            };
            loadedChapters = [defaultChapter];
            loadedActiveRoomId = defaultRoom.id;
          }
        } else {
          // Empty or new class
          const defaultRoom: QuizRoom = {
            id: `room-default-${Date.now()}`,
            name: 'មេរៀនទី១',
            cards: [],
            pickedIds: [],
            createdAt: Date.now()
          };
          const defaultChapter: QuizChapter = {
            id: `chapter-default-${Date.now()}`,
            name: 'ជំពូកទី១',
            rooms: [defaultRoom],
            createdAt: Date.now()
          };
          loadedChapters = [defaultChapter];
          loadedActiveRoomId = defaultRoom.id;
        }

        setChapters(loadedChapters);
        setActiveRoomId(loadedActiveRoomId);

        let activeRoom: QuizRoom | undefined;
        for (const ch of loadedChapters) {
          activeRoom = ch.rooms.find(r => r.id === loadedActiveRoomId);
          if (activeRoom) break;
        }
        if (!activeRoom && loadedChapters.length > 0) {
          activeRoom = loadedChapters[0].rooms[0];
        }

        setCards(activeRoom?.cards || []);
        setPickedIds(activeRoom?.pickedIds || []);

        // 2. Fetch students
        const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
        const studentsSnap = await getDocs(studentsCollRef);
        
        let loadedStudents: Student[] = [];
        studentsSnap.forEach(docSnap => {
          loadedStudents.push(docSnap.data() as Student);
        });
        setStudents(loadedStudents);
      } catch (err) {
        console.error('Failed to load class details from Firestore:', err);
      } finally {
        setLoadingCloudData(false);
      }
    };

    loadClassDetails();
  }, [activeClassId, teacher]);

  // Real-time Student Synchronization for cloud sessions
  useEffect(() => {
    if (!teacher || !activeClassId) return;

    const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
    const unsubscribe = onSnapshot(studentsCollRef, (snapshot) => {
      let loadedStudents: Student[] = [];
      snapshot.forEach(docSnap => {
        loadedStudents.push(docSnap.data() as Student);
      });
      setStudents(loadedStudents);
    }, (err) => {
      console.error("Real-time snapshot error for students collection:", err);
    });

    return () => unsubscribe();
  }, [activeClassId, teacher]);

  // Sync active quiz state to Class document in Firestore for student phones
  useEffect(() => {
    if (!teacher || !activeClassId) return;

    const syncClassInfo = async () => {
      try {
        const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: activeCardId,
          activeRoomId: activeRoomId,
          activeTab: activeTab,
          activeCardState: activeCardState
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync active state to Firestore:", err);
      }
    };

    syncClassInfo();
  }, [activeClassId, activeCardId, activeRoomId, activeTab, activeCardState, teacher]);

  // Save changes to localStorage on states update as fallback for offline use
  useEffect(() => {
    if (!teacher) {
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(classes));
    }
  }, [classes, teacher]);

  useEffect(() => {
    if (activeClassId && !teacher) {
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(students));
    }
  }, [students, activeClassId, teacher]);

  useEffect(() => {
    if (activeClassId && !teacher) {
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(cards));
    }
  }, [cards, activeClassId, teacher]);

  useEffect(() => {
    if (activeClassId && !teacher) {
      localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(pickedIds));
    }
  }, [pickedIds, activeClassId, teacher]);

  // Helper to save class-level states to Firestore
  const saveClassMetadata = useCallback(async (updatedCards: QuizCard[], updatedPickedIds: string[]) => {
    if (!activeRoomId) return;

    const updatedChapters = chapters.map(ch => {
      const updatedRooms = ch.rooms.map(r => {
        if (r.id === activeRoomId) {
          return {
            ...r,
            cards: updatedCards,
            pickedIds: updatedPickedIds
          };
        }
        return r;
      });
      return { ...ch, rooms: updatedRooms };
    });

    setChapters(updatedChapters);

    if (teacher && activeClassId) {
      try {
        await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
          chapters: updatedChapters,
          activeRoomId: activeRoomId
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save class metadata to cloud:', err);
      }
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
    }
  }, [teacher, activeClassId, activeRoomId, chapters]);

  // Helper to save student score updates to Firestore
  const saveStudentScore = useCallback(async (studentId: string, newScore: number) => {
    if (teacher && activeClassId) {
      try {
        await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', studentId), {
          score: newScore
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update student score on cloud:', err);
      }
    }
  }, [teacher, activeClassId]);

  const handleSelectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    let selectedRoom: QuizRoom | undefined;
    for (const ch of chapters) {
      selectedRoom = ch.rooms.find(r => r.id === roomId);
      if (selectedRoom) break;
    }

    if (selectedRoom) {
      setCards(selectedRoom.cards || []);
      setPickedIds(selectedRoom.pickedIds || []);
      if (!teacher && activeClassId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, roomId);
      } else if (teacher && activeClassId) {
        setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
          activeRoomId: roomId
        }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
      }
    }
  }, [chapters, teacher, activeClassId]);

  const handleCreateRoom = useCallback((chapterId: string, roomName: string) => {
    const newRoom: QuizRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      cards: [],
      pickedIds: [],
      createdAt: Date.now()
    };
    
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          rooms: [...ch.rooms, newRoom]
        };
      }
      return ch;
    });

    setChapters(updatedChapters);
    setActiveRoomId(newRoom.id);
    setCards([]);
    setPickedIds([]);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters,
        activeRoomId: newRoom.id
      }, { merge: true }).catch(err => console.error('Failed to save new room to cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      localStorage.setItem(`active_room_id_${activeClassId}`, newRoom.id);
    }
  }, [chapters, teacher, activeClassId]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    const totalRooms = chapters.reduce((total, ch) => total + ch.rooms.length, 0);
    if (totalRooms <= 1) {
      alert('មិនអាចលុបបន្ទប់ទាំងអស់គ្រាប់បានទេ! ត្រូវតែមានយ៉ាងហោចណាស់បន្ទប់មួយនៅក្នុងជំពូកណាមួយ។');
      return;
    }
    if (!window.confirm('តើអ្នកពិតជាចង់លុបបន្ទប់ក្ដារសំណួរនេះមែនទេ?​​ រាល់សំណួរនៅក្នុងបន្ទប់នេះនឹងត្រូវបាត់បង់ទាំងអស់។')) {
      return;
    }

    const updatedChapters = chapters.map(ch => {
      return {
        ...ch,
        rooms: ch.rooms.filter(r => r.id !== roomId)
      };
    });

    let nextActiveId = activeRoomId;
    if (activeRoomId === roomId) {
      let foundRoom = false;
      for (const ch of updatedChapters) {
        if (ch.rooms.length > 0) {
          nextActiveId = ch.rooms[0].id;
          setCards(ch.rooms[0].cards || []);
          setPickedIds(ch.rooms[0].pickedIds || []);
          foundRoom = true;
          break;
        }
      }
      if (!foundRoom) {
        nextActiveId = null;
        setCards([]);
        setPickedIds([]);
      }
    }

    setChapters(updatedChapters);
    setActiveRoomId(nextActiveId);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters,
        activeRoomId: nextActiveId
      }, { merge: true }).catch(err => console.error('Failed to sync room deletion to cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      if (nextActiveId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveId);
      } else {
        localStorage.removeItem(`active_room_id_${activeClassId}`);
      }
    }
  }, [chapters, activeRoomId, teacher, activeClassId]);

  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    const updatedChapters = chapters.map(ch => {
      const updatedRooms = ch.rooms.map(r => {
        if (r.id === roomId) {
          return { ...r, name: newName };
        }
        return r;
      });
      return { ...ch, rooms: updatedRooms };
    });

    setChapters(updatedChapters);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename room in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, teacher, activeClassId]);

  const handleCreateChapter = useCallback((chapterName: string) => {
    const newChapter: QuizChapter = {
      id: `chapter-${Date.now()}`,
      name: chapterName,
      rooms: [],
      createdAt: Date.now()
    };
    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to create chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, teacher, activeClassId]);

  const handleRenameChapter = useCallback((chapterId: string, newName: string) => {
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return { ...ch, name: newName };
      }
      return ch;
    });
    setChapters(updatedChapters);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, teacher, activeClassId]);

  const handleDeleteChapter = useCallback((chapterId: string) => {
    if (chapters.length <= 1) {
      alert('មិនអាចលុបជំពូកទាំងអស់បានទេ! ត្រូវតែមានយ៉ាងហោចណាស់ជំពូកមួយ។');
      return;
    }
    if (!window.confirm('តើអ្នកពិតជាចង់លុបជំពូកនេះមែនទេ? រាល់បន្ទប់ និងសំណួរទាំងអស់នៅក្នុងជំពូកនេះនឹងត្រូវបាត់បង់ទាំងស្រុងពីប្រព័ន្ធ។')) {
      return;
    }

    const updatedChapters = chapters.filter(ch => ch.id !== chapterId);
    setChapters(updatedChapters);

    // If active room was in deleted chapter, reset active room id
    let isDeletedActive = false;
    const deletedChapter = chapters.find(ch => ch.id === chapterId);
    if (deletedChapter && activeRoomId) {
      isDeletedActive = deletedChapter.rooms.some(r => r.id === activeRoomId);
    }

    let nextActiveRoomId = activeRoomId;
    if (isDeletedActive) {
      let foundRoom = false;
      for (const ch of updatedChapters) {
        if (ch.rooms.length > 0) {
          nextActiveRoomId = ch.rooms[0].id;
          setCards(ch.rooms[0].cards || []);
          setPickedIds(ch.rooms[0].pickedIds || []);
          foundRoom = true;
          break;
        }
      }
      if (!foundRoom) {
        nextActiveRoomId = null;
        setCards([]);
        setPickedIds([]);
      }
    }

    setActiveRoomId(nextActiveRoomId);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        chapters: updatedChapters,
        activeRoomId: nextActiveRoomId
      }, { merge: true }).catch(err => console.error('Failed to delete chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      if (nextActiveRoomId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
      } else {
        localStorage.removeItem(`active_room_id_${activeClassId}`);
      }
    }
  }, [chapters, activeRoomId, teacher, activeClassId]);

  // Handler for switching class
  const handleSwitchClass = (classId: string) => {
    setActiveClassId(classId);
    setSelectedStudentId(null);
    setActiveCardId(null);
  };

  const handleAddClass = async () => {
    const className = window.prompt('សូមបញ្ចូលឈ្មោះថ្នាក់រៀនថ្មី៖', 'ថ្នាក់ទី១០ក');
    if (className && className.trim()) {
      const newClassId = `class-${Date.now()}`;
      const newClass = { id: newClassId, name: className.trim() };
      
      if (teacher) {
        try {
          await setDoc(doc(db, 'teachers', teacher.id, 'classes', newClassId), {
            id: newClassId,
            name: className.trim(),
            pickedIds: [],
            cards: [],
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${newClassId}`);
        }
      }
      
      setClasses(prev => [...prev, newClass]);
      handleSwitchClass(newClassId);
    }
  };

  const handleRemoveClass = async (e: React.MouseEvent, classId: string, className: string) => {
    e.stopPropagation(); // prevent switching to it
    if (classes.length <= 1) {
      alert('ត្រូវតែមានថ្នាក់រៀនយ៉ាងហោចណាស់មួយ!');
      return;
    }
    if (window.confirm(`តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបថ្នាក់ទី «${className}» នេះចោលមែនទេ?`)) {
      const updatedClasses = classes.filter(c => c.id !== classId);
      
      if (teacher) {
        try {
          await deleteDoc(doc(db, 'teachers', teacher.id, 'classes', classId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `teachers/${teacher.id}/classes/${classId}`);
        }
      }
      
      setClasses(updatedClasses);
      localStorage.removeItem(`students_class_${classId}`);
      localStorage.removeItem(`quiz_cards_class_${classId}`);
      localStorage.removeItem(`picked_students_class_${classId}`);
      
      if (activeClassId === classId) {
        handleSwitchClass(updatedClasses[0].id);
      }
    }
  };

  const addStudent = useCallback(async (name: string) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudent: Student = {
      id: `s-${Date.now()}-${Math.random()}`,
      name,
      score: 0,
      emoji: randomEmoji,
      gender: 'ប្រុស',
      status: 'សកម្ម',
      classId: activeClassId
    };

    if (teacher) {
      try {
        await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', newStudent.id), newStudent);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${activeClassId}/students/${newStudent.id}`);
      }
    }

    setStudents(prev => [...prev, newStudent]);
  }, [activeClassId, teacher]);

  const addStudentDetail = useCallback(async (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const newStudent: Student = {
      id: `s-${Date.now()}-${Math.random()}`,
      name: fields.name,
      score: 0,
      emoji: randomEmoji,
      gender: fields.gender,
      status: fields.status,
      classId: fields.classId
    };
    
    if (fields.classId === activeClassId) {
      if (teacher) {
        try {
          await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', newStudent.id), newStudent);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${activeClassId}/students/${newStudent.id}`);
        }
      }
      setStudents(prev => [...prev, newStudent]);
    } else {
      if (teacher) {
        try {
          await setDoc(doc(db, 'teachers', teacher.id, 'classes', fields.classId, 'students', newStudent.id), newStudent);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${fields.classId}/students/${newStudent.id}`);
        }
      } else {
        const savedKey = `students_class_${fields.classId}`;
        const savedRaw = localStorage.getItem(savedKey);
        const savedList = savedRaw ? JSON.parse(savedRaw) : [];
        savedList.push(newStudent);
        localStorage.setItem(savedKey, JSON.stringify(savedList));
      }
      alert(`បានរក្សាទុកសិស្ស «${fields.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
    }
  }, [activeClassId, teacher]);

  const updateStudentDetail = useCallback(async (id: string, fields: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    
    setStudents(prev => {
      const studentToUpdate = prev.find(s => s.id === id);
      if (!studentToUpdate) return prev;
      
      const newClassId = fields.classId || studentToUpdate.classId || activeClassId;
      const oldClassId = studentToUpdate.classId || activeClassId;
      
      updatedStudent = { ...studentToUpdate, ...fields, classId: newClassId };

      if (newClassId !== oldClassId) {
        // Move to another class
        const filtered = prev.filter(s => s.id !== id);
        
        if (teacher) {
          (async () => {
            try {
              await deleteDoc(doc(db, 'teachers', teacher.id, 'classes', oldClassId, 'students', id));
              await setDoc(doc(db, 'teachers', teacher.id, 'classes', newClassId, 'students', id), updatedStudent!);
            } catch (err) {
              console.error(err);
            }
          })();
        } else {
          const targetKey = `students_class_${newClassId}`;
          const targetRaw = localStorage.getItem(targetKey);
          const targetList = targetRaw ? JSON.parse(targetRaw) : [];
          
          const cleanedList = targetList.filter((s: any) => s.id !== id);
          cleanedList.push(updatedStudent);
          localStorage.setItem(targetKey, JSON.stringify(cleanedList));
        }
        
        alert(`បានផ្លាស់ប្ដូរថ្នាក់សិស្ស «${fields.name || studentToUpdate.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
        return filtered;
      } else {
        if (teacher) {
          (async () => {
            try {
              await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', id), updatedStudent!);
            } catch (err) {
              console.error(err);
            }
          })();
        }
        return prev.map(s => s.id === id ? { ...s, ...fields } : s);
      }
    });
  }, [activeClassId, teacher]);

  const removeStudent = useCallback(async (id: string) => {
    if (teacher) {
      try {
        await deleteDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `teachers/${teacher.id}/classes/${activeClassId}/students/${id}`);
      }
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudentId === id) setSelectedStudentId(null);
  }, [selectedStudentId, teacher, activeClassId]);

  const clearStudents = useCallback(async () => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះសិស្សទាំងអស់មែនទេ?')) {
      if (teacher) {
        try {
          for (const s of students) {
            await deleteDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', s.id));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `teachers/${teacher.id}/classes/${activeClassId}/students`);
        }
      }
      setStudents([]);
      setSelectedStudentId(null);
      setPickedIds([]);
    }
  }, [students, teacher, activeClassId]);

  const handleQuestionsGenerated = useCallback((questions: Question[]) => {
    const newCards: QuizCard[] = questions.map((q, i) => ({
      id: `c-${i}-${Date.now()}`,
      number: i + 1,
      question: q,
      isRevealed: false,
      status: 'idle'
    }));
    setCards(newCards);
    saveClassMetadata(newCards, pickedIds);
  }, [pickedIds, saveClassMetadata]);

  const handleUpdateCards = useCallback((updatedCards: QuizCard[]) => {
    setCards(updatedCards);
    saveClassMetadata(updatedCards, pickedIds);
  }, [pickedIds, saveClassMetadata]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!activeCardId || !selectedStudentId) return;

    // Update student score
    let targetScore = 0;
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentId) {
        targetScore = s.score + (correct ? 3 : 0);
        saveStudentScore(selectedStudentId, targetScore);
        return { ...s, score: targetScore };
      }
      return s;
    }));

    // Update card status
    const updatedCards = cards.map(c => {
      if (c.id === activeCardId) {
        return { ...c, isRevealed: true, status: correct ? 'correct' : 'wrong' as any };
      }
      return c;
    });
    setCards(updatedCards);

    // Add student to picked list so they are not picked again
    const updatedPickedIds = pickedIds.includes(selectedStudentId)
      ? pickedIds
      : [...pickedIds, selectedStudentId];
    setPickedIds(updatedPickedIds);

    saveClassMetadata(updatedCards, updatedPickedIds);
    setActiveCardId(null);
  }, [activeCardId, selectedStudentId, cards, pickedIds, saveClassMetadata, saveStudentScore]);

  const resetMatch = useCallback(async () => {
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់ពិន្ទុ និងការបើកសន្លឹកប័ណ្ណឡើងវិញមែនទេ?')) {
      if (teacher && activeClassId) {
        try {
          for (const s of students) {
            await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', s.id), {
              score: 0
            }, { merge: true });
          }
        } catch (err) {
          console.error(err);
        }
      }
      
      setStudents(prev => prev.map(s => ({ ...s, score: 0 })));
      
      const resetCards = cards.map(c => ({ ...c, isRevealed: false, status: 'idle' as any }));
      setCards(resetCards);
      setSelectedStudentId(null);
      setPickedIds([]);
      setActiveCardId(null);
      
      saveClassMetadata(resetCards, []);
    }
  }, [students, cards, teacher, activeClassId, saveClassMetadata]);

  const resetAll = useCallback(() => {
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់កម្មវិធីឡើងវិញទាំងស្រុងមែនទេ?')) {
      localStorage.clear();
      setStudents([]);
      setCards([]);
      setSelectedStudentId(null);
      setPickedIds([]);
      setActiveCardId(null);
      setTeacher(null);
      setClasses(DEFAULT_CLASSES);
      setActiveClassId('class-7a');
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់ចាកចេញពីគណនីមែនទេ? (រាល់ទិន្នន័យដែលបានរក្សាទុកក្នុង Cloud នឹងមិនបាត់បង់ទេ ហើយទំព័រនេះនឹងត្រូវលាងសម្អាតឡើងវិញជាទម្រង់ថ្មី)')) {
      // Clear logged in teacher token
      localStorage.removeItem('logged_in_teacher');
      
      // Also clear active teacher's selected class ID in memory & offline caches
      if (teacher) {
        localStorage.removeItem(`khmer_teacher_active_class_id_${teacher.id}`);
      }
      localStorage.removeItem('khmer_teacher_active_class_id');
      localStorage.removeItem('khmer_teacher_classes');

      // Clear all cached students/cards/pickedIds in localstorage for a clean slate
      const keysToClear = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('students_class_') || key.startsWith('quiz_cards_class_') || key.startsWith('picked_students_class_'))) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach(k => localStorage.removeItem(k));

      // Reset application states back to fresh template
      setTeacher(null);
      setClasses(DEFAULT_CLASSES);
      setActiveClassId('class-7a');
      setStudents([]);
      setCards([]);
      setPickedIds([]);
      setSelectedStudentId(null);
      setActiveCardId(null);
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;
  const activeCard = cards.find(c => c.id === activeCardId) || null;
  const activeClass = classes.find(c => c.id === activeClassId) || null;

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#0f172a] text-slate-100 dark' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Header */}
      <header className={`h-20 flex items-center justify-between px-8 shrink-0 z-20 border-b ${
        isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">Teacher EduSpin</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-full">Edu_Pro</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2 flex-wrap">
              <span>{teacher ? `សាលារៀន៖ ${teacher.schoolName}` : 'ប្រព័ន្ធសិក្សាអន្តរកម្មសម្រាប់គ្រូបង្រៀន'}</span>
              {loadingCloudData && (
                <span className="inline-flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 animate-pulse font-black text-[9px] uppercase ml-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>កំពុង Sync Cloud...</span>
                </span>
              )}
              {teacher && !loadingCloudData && (
                <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-black text-[9px] uppercase ml-1.5">
                  <Cloud className="w-3 h-3" />
                  <span>Cloud Active</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Dynamic Center Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'wheel'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>បង្វិលឈ្មោះ</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'groups'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>បែងចែកក្រុម</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>គ្រប់គ្រងសិស្ស</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'quiz'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>ក្ដារសំណួរ</span>
          </button>

          <button
            onClick={() => setActiveTab('student-lobby')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none relative overflow-hidden ${
              activeTab === 'student-lobby'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/15'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300 animate-pulse" />
            <span>បន្ទប់សិស្ស (QR & ពាន)</span>
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Teacher Profile Area */}
          {teacher ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left pr-1">
                <p className="text-xs font-black truncate max-w-[120px]">
                  {teacher.name}
                </p>
                {teacher.subjects && (
                  <p className="text-[9px] text-slate-400 leading-none mt-0.5">{teacher.subjects}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="ចាកចេញ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all border border-indigo-100 dark:border-indigo-900/40"
            >
              <LogIn className="w-4 h-4" />
              <span>ចូលប្រើប្រាស់គណនីគ្រូ</span>
            </button>
          )}

          <div className={`h-6 w-[1px] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} mx-1`} />

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl transition-all ${
              isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-150'
            }`}
            title={isDarkMode ? 'ប្ដូរទៅមុខងារពន្លឺ' : 'ប្ដូរទៅមុខងារងងឹត'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Reset All */}
          <button
            onClick={resetAll}
            className={`p-2.5 rounded-xl transition-all ${
              isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
            title="កំណត់ឡើងវិញទាំងស្រុង"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Create Questions Button */}
          <button
            onClick={() => setIsLessonModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 group active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
            <span>បង្កើតសំណួរ</span>
          </button>
        </div>
      </header>

      {/* Class/Grade switcher sub-bar */}
      <div className={`py-3 px-8 flex items-center gap-3 shrink-0 overflow-x-auto border-b ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
      }`}>
        <GraduationCap className="w-5 h-5 text-indigo-500 shrink-0" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2 shrink-0">ថ្នាក់រៀនសកម្ម៖</span>
        <div className="flex items-center gap-2">
          {classes.map((cls) => (
            <div 
              key={cls.id}
              onClick={() => handleSwitchClass(cls.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all select-none border ${
                activeClassId === cls.id 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10 scale-102' 
                  : isDarkMode 
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <span>{cls.name}</span>
              {classes.length > 1 && (
                <button
                  onClick={(e) => handleRemoveClass(e, cls.id, cls.name)}
                  className="p-0.5 hover:bg-red-500/20 hover:text-red-500 rounded-md transition-colors"
                  title="លុបថ្នាក់"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddClass}
            className={`px-3 py-1 bg-transparent border-2 border-dashed rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              isDarkMode 
                ? 'border-slate-700 hover:border-indigo-500 hover:text-indigo-400 text-slate-500' 
                : 'border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-slate-400'
            }`}
            title="បន្ថែមថ្នាក់ថ្មី"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>បន្ថែមថ្នាក់</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'wheel' && (
          <>
            <section className="flex-1 md:basis-3/5 h-full overflow-y-auto flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
              <SpinningWheel
                students={students}
                pickedIds={pickedIds}
                onSetPickedIds={setPickedIds}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                onAddStudent={addStudent}
                showBulkInput={showWheelBulk}
                setShowBulkInput={setShowWheelBulk}
                isDarkMode={isDarkMode}
              />
            </section>
            
            <aside className="hidden md:block md:basis-2/5 h-full shrink-0 border-l border-slate-200 dark:border-slate-800">
              <StudentPanel
                students={students}
                pickedIds={pickedIds}
                onSetPickedIds={setPickedIds}
                onAddStudent={addStudent}
                onRemoveStudent={removeStudent}
                onClearStudents={clearStudents}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                isDarkMode={isDarkMode}
              />
            </aside>
          </>
        )}

        {activeTab === 'quiz' && (
          <>
            <aside className="basis-2/5 h-full shrink-0 hidden md:block">
              <StudentPanel
                students={students}
                pickedIds={pickedIds}
                onSetPickedIds={setPickedIds}
                onAddStudent={addStudent}
                onRemoveStudent={removeStudent}
                onClearStudents={clearStudents}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                isDarkMode={isDarkMode}
              />
            </aside>

            {/* Bright Orange line separator between student list and question board */}
            <div className="w-[3px] bg-[#f97316] h-full hidden md:block shrink-0" />

            <section className={`flex-1 md:basis-3/5 h-full overflow-hidden flex flex-col ${
              isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50'
            }`}>
              <QuizPanel
                cards={cards}
                onCardClick={(c) => setActiveCardId(c.id)}
                onAnswer={handleAnswer}
                onReset={resetMatch}
                activeCard={activeCard}
                selectedStudent={selectedStudent}
                chapters={chapters}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectRoom}
                onCreateRoom={handleCreateRoom}
                onDeleteRoom={handleDeleteRoom}
                onRenameRoom={handleRenameRoom}
                onCreateChapter={handleCreateChapter}
                onRenameChapter={handleRenameChapter}
                onDeleteChapter={handleDeleteChapter}
                isDarkMode={isDarkMode}
                onUpdateCards={handleUpdateCards}
              />
            </section>
          </>
        )}

        {activeTab === 'groups' && (
          <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f19]">
            <GroupDivider
              students={students}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              activeClassId={activeClassId || ''}
              teacher={teacher}
            />
          </div>
        )}

        {activeTab === 'students' && (
          <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f19]">
            <StudentManager
              students={students}
              classes={classes}
              activeClassId={activeClassId}
              onAddStudentDetail={addStudentDetail}
              onRemoveStudent={removeStudent}
              onUpdateStudentDetail={updateStudentDetail}
              onBulkAddStudents={async (list) => {
                const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
                const newStudents: Student[] = list.map(item => ({
                  id: `s-${Date.now()}-${Math.random()}`,
                  name: item.name,
                  score: 0,
                  emoji: randomEmoji(),
                  gender: item.gender,
                  status: item.status,
                  classId: activeClassId
                }));

                if (teacher) {
                  try {
                    // Upload all raw students to Firestore for this class
                    await Promise.all(
                      newStudents.map(student => 
                        setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', student.id), student)
                      )
                    );
                  } catch (err) {
                    handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${activeClassId}/students`);
                  }
                }

                setStudents(prev => [...prev, ...newStudents]);
              }}
            />
          </div>
        )}

        {activeTab === 'student-lobby' && (
          <StudentLobby
            activeClassId={activeClassId}
            className={activeClass?.name || 'ថ្នាក់រៀន'}
            teacher={teacher}
            activeRoomId={activeRoomId}
            students={students}
            cards={cards}
            activeCardId={activeCardId}
            isDarkMode={isDarkMode}
            setActiveCardId={setActiveCardId}
            activeCardState={activeCardState}
            setActiveCardState={setActiveCardState}
          />
        )}
      </main>

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onQuestionsGenerated={handleQuestionsGenerated}
      />

      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(acc) => setTeacher(acc)}
      />
    </div>
  );
}


