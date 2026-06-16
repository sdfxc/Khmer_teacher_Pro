/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, LayoutGrid, RotateCcw, User, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check, Cloud, Loader2, Pencil } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount, QuizRoom, QuizChapter, QuizSubject } from './types';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import StudentPlayView from './components/StudentPlayView';
import StudentLobby from './components/StudentLobby';

const SovannaphumiLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg viewBox="0 0 120 120" className={`${className} pointer-events-none select-none`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="curve-top-header" d="M 24,60 A 36,36 0 0,1 96,60" fill="none" />
        <path id="curve-bottom-header" d="M 96,60 A 36,36 0 0,1 24,60" fill="none" />
      </defs>
      
      {/* 8-petal blue scalloped border */}
      {/* Draw gold background to act as outline */}
      {angles.map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 60 + 22 * Math.cos(rad);
        const cy = 60 + 22 * Math.sin(rad);
        return <circle key={`gold-${idx}`} cx={cx} cy={cy} r={24.5} fill="#f59e0b" />;
      })}
      
      {/* Draw blue petals inside */}
      {angles.map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 60 + 22 * Math.cos(rad);
        const cy = 60 + 22 * Math.sin(rad);
        return <circle key={`blue-${idx}`} cx={cx} cy={cy} r={23} fill="#0ea5e9" />;
      })}

      {/* Outer separator line of blue band */}
      <circle cx="60" cy="60" r="41" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
      
      {/* Decorative golden diamonds on left/right */}
      <polygon points="17,60 20,57 23,60 20,63" fill="#f59e0b" />
      <polygon points="103,60 100,57 97,60 100,63" fill="#f59e0b" />

      {/* Inner circle border */}
      <circle cx="60" cy="60" r="31.5" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
      
      {/* Inner Red circular background */}
      <circle cx="60" cy="60" r="30" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
      
      {/* Altar / sacred pedestal */}
      {/* Pedestal Base */}
      <path d="M 45,74 L 75,74 L 71,78 L 49,78 Z" fill="#eab308" stroke="#d97706" strokeWidth="0.5" />
      <path d="M 49,74 L 71,74 L 67,66 L 53,66 Z" fill="#eab308" stroke="#d97706" strokeWidth="0.5" />
      {/* Pedestal Bowl */}
      <path d="M 44,65 C 44,65 50,71 60,71 C 70,71 76,65 76,65 Z" fill="#eab308" stroke="#d97706" strokeWidth="0.5" />
      
      {/* Sacred Book on pedestal */}
      <path d="M 44,65 C 51,63 58,63 60,66 C 62,63 69,63 76,65 L 73,61 C 68,59 62,59 60,62 C 58,59 52,59 47,61 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="0.5" />
      {/* Bookmark Ribbon */}
      <path d="M 60,65 L 60,70" stroke="#dc2626" strokeWidth="1" />
      
      {/* Golden crown / Angkor symbol inside the cup */}
      <path d="M 52,59 L 54,49 L 57,52 L 60,43 L 63,52 L 66,49 L 68,59 Z" fill="#eab308" stroke="#d97706" strokeWidth="0.5" />
      
      {/* Laurel Wreath surrounding bottom of red circle */}
      <path d="M 40,68 C 42,76 50,79 60,79 C 70,79 78,76 80,68 C 76,73 70,75 60,75 C 50,75 44,73 40,68 Z" fill="#eab308" />

      {/* Abbreviation Text inside crown/vase */}
      <text x="60" y="57" fontSize="3.2" fontWeight="bold" fill="#dc2626" textAnchor="middle" fontFamily="sans-serif">S.P.S</text>

      {/* SVG Curved Text inside the blue band using textPath */}
      <text fill="#ffffff" fontSize="4.5" fontWeight="black" fontFamily="'Khmer OS Siemreap', 'Siemreap', sans-serif">
        <textPath href="#curve-top-header" startOffset="50%" textAnchor="middle">
          សាលារៀនសុវណ្ណភូមិ
        </textPath>
      </text>
      
      <text fill="#ffffff" fontSize="4.2" fontWeight="black" fontFamily="sans-serif">
        <textPath href="#curve-bottom-header" startOffset="50%" textAnchor="middle">
          SOVANNAPHUMI SCHOOL
        </textPath>
      </text>
    </svg>
  );
};

const EMOJIS = ["🥰", "😂", "😩", "🥳", "🥺", "😇", "😎", "🤩", "🤔", "🤗", "🤭", "🫠", "😤", "😮💨", "🫡", "😬", "🙄", "🤒", "😵💫", "😳", "🤪", "😜", "🤫", "🫣", "☹️", "😕"];

function getMigratedSubjects(loadedChapters: QuizChapter[]): { subjects: QuizSubject[], activeSubjectId: string } {
  const chaptersToUse = loadedChapters.length > 0 ? loadedChapters : [
    {
      id: `chapter-default-${Date.now()}`,
      name: 'ជំពូកទី១',
      rooms: [
        {
          id: `room-default-${Date.now()}`,
          name: 'មេរៀនទី១',
          cards: [],
          pickedIds: [],
          createdAt: Date.now()
        }
      ],
      createdAt: Date.now()
    }
  ];

  const defaultSubjects: QuizSubject[] = [
    {
      id: 'subj-physics',
      name: 'រូបវិទ្យា',
      chapters: chaptersToUse,
      createdAt: Date.now()
    },
    {
      id: 'subj-chemistry',
      name: 'គីមីវិទ្យា',
      chapters: [
        {
          id: `chapter-chem-${Date.now()}`,
          name: 'ជំពូកទី១',
          rooms: [
            {
              id: `room-chem-${Date.now()}`,
              name: 'មេរៀនទី១',
              cards: [],
              pickedIds: [],
              createdAt: Date.now()
            }
          ],
          createdAt: Date.now()
        }
      ],
      createdAt: Date.now()
    }
  ];
  return { subjects: defaultSubjects, activeSubjectId: 'subj-physics' };
}

const SAMPLE_STUDENTS: Record<string, Student[]> = {
  'class-7a': [
    { id: 's-1', name: 'សុខ ម៉េង', score: 120, emoji: '😎', gender: 'ប្រុស', status: 'ឆ្នើម', classId: 'class-7a' },
    { id: 's-2', name: 'ចាន់ ធារ៉ា', score: 95, emoji: '🥰', gender: 'ស្រី', status: 'សកម្ម', classId: 'class-7a' },
    { id: 's-3', name: 'កុសល សីហា', score: 110, emoji: '🤩', gender: 'ប្រុស', status: 'សកម្ម', classId: 'class-7a' },
    { id: 's-4', name: 'លីដា ណាវិក', score: 80, emoji: '🥳', gender: 'ស្រី', status: 'សកម្ម', classId: 'class-7a' },
    { id: 's-5', name: 'រដ្ឋា ចាន់ឌី', score: 70, emoji: '🤪', gender: 'ប្រុស', status: 'កំពុងរីកចម្រើន', classId: 'class-7a' },
    { id: 's-6', name: 'កញ្ញា ពិសី', score: 130, emoji: '😇', gender: 'ស្រី', status: 'ឆ្នើម', classId: 'class-7a' },
  ],
  'class-8a': [
    { id: 's-11', name: 'មករា ចន្ទ', score: 105, emoji: '😎', gender: 'ប្រុស', status: 'សកម្ម', classId: 'class-8a' },
    { id: 's-12', name: 'ធីតា រតនា', score: 115, emoji: '🥰', gender: 'ស្រី', status: 'ឆ្នើម', classId: 'class-8a' },
    { id: 's-13', name: 'សម្បត្ដិ វណ្ណា', score: 90, emoji: '🤩', gender: 'ប្រុស', status: 'សកម្ម', classId: 'class-8a' },
    { id: 's-14', name: 'សុភា លីន', score: 65, emoji: '🥺', gender: 'ស្រី', status: 'គួរឲ្យបារម្ភ', classId: 'class-8a' },
    { id: 's-15', name: 'វិបុល ទេវី', score: 85, emoji: '🤪', gender: 'ប្រុស', status: 'សកម្ម', classId: 'class-8a' },
  ],
  'class-9a': [
    { id: 's-21', name: 'ណារ៉ុង ចាន់', score: 140, emoji: '😎', gender: 'ប្រុស', status: 'ឆ្នើម', classId: 'class-9a' },
    { id: 's-22', name: 'មន្នី ផល្លា', score: 100, emoji: '🥰', gender: 'ស្រី', status: 'សកម្ម', classId: 'class-9a' },
    { id: 's-23', name: 'វិចិត្រ សាវី', score: 125, emoji: '🤩', gender: 'ប្រុស', status: 'ឆ្នើម', classId: 'class-9a' },
    { id: 's-24', name: 'បុប្ផា រី', score: 75, emoji: '🥺', gender: 'ស្រី', status: 'កំពុងរីកចម្រើន', classId: 'class-9a' },
  ]
};

const DEFAULT_CLASSES: ClassInfo[] = [
  { id: 'class-7a', name: 'ថ្នាក់ទី៧ក' },
  { id: 'class-8a', name: 'ថ្នាក់ទី៨ក' },
  { id: 'class-9a', name: 'ថ្នាក់ទី៩ក' }
];

const PINNED_CLASS_NAMES = ['ថ្នាក់ទី៧ក', 'ថ្នាក់ទី៨ក', 'ថ្នាក់ទី៩ក'];
const isPinnedClass = (classId: string, className: string): boolean => {
  const name = className ? className.trim() : '';
  return ['class-7a', 'class-8a', 'class-9a'].includes(classId) || PINNED_CLASS_NAMES.includes(name);
};

const sortClasses = (classList: ClassInfo[]): ClassInfo[] => {
  const clean = classList.filter(c => c && c.name && c.name.trim() !== '');
  const uniqueIds = new Set<string>();
  const uniqueNames = new Set<string>();
  const filtered = clean.filter(c => {
    const trimmedName = c.name.trim();
    if (uniqueIds.has(c.id) || uniqueNames.has(trimmedName)) return false;
    uniqueIds.add(c.id);
    uniqueNames.add(trimmedName);
    return true;
  });

  const pinned = filtered.filter(c => isPinnedClass(c.id, c.name));
  const others = filtered.filter(c => !isPinnedClass(c.id, c.name));
  return [...pinned, ...others];
};

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
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    let rawClasses: ClassInfo[] = [];
    if (savedTeacherObj === null) {
      const saved = localStorage.getItem('khmer_teacher_classes');
      rawClasses = saved ? JSON.parse(saved) as ClassInfo[] : DEFAULT_CLASSES;
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        const saved = localStorage.getItem(`khmer_teacher_classes_${teacherObj.id}`);
        rawClasses = saved ? JSON.parse(saved) as ClassInfo[] : DEFAULT_CLASSES;
      } catch (e) {
        rawClasses = DEFAULT_CLASSES;
      }
    }

    const merged = [...rawClasses];
    DEFAULT_CLASSES.forEach(pc => {
      if (!merged.some(m => m.id === pc.id || m.name.trim() === pc.name.trim())) {
        merged.push(pc);
      }
    });

    return sortClasses(merged);
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (savedTeacherObj === null) {
      const saved = localStorage.getItem('khmer_teacher_active_class_id');
      return saved || 'class-7a';
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        const savedActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`);
        
        let availableClasses: ClassInfo[] = [];
        const savedClasses = localStorage.getItem(`khmer_teacher_classes_${teacherObj.id}`);
        if (savedClasses) {
          const parsed = JSON.parse(savedClasses) as ClassInfo[];
          const clean = parsed.filter(c => c && c.name && c.name.trim() !== '');
          availableClasses = clean;
        } else {
          availableClasses = DEFAULT_CLASSES;
        }
        
        const merged = [...availableClasses];
        DEFAULT_CLASSES.forEach(pc => {
          if (!merged.some(m => m.id === pc.id || m.name.trim() === pc.name.trim())) {
            merged.push(pc);
          }
        });

        const uniqueIds = new Set<string>();
        const uniqueNames = new Set<string>();
        const cleanAvailable = merged.filter(c => {
          if (!c || !c.name) return false;
          const trimmedName = c.name.trim();
          if (uniqueIds.has(c.id) || uniqueNames.has(trimmedName)) return false;
          uniqueIds.add(c.id);
          uniqueNames.add(trimmedName);
          return true;
        });

        if (savedActiveId && cleanAvailable.some(c => c.id === savedActiveId)) {
          return savedActiveId;
        }
        if (cleanAvailable.length > 0) return cleanAvailable[0].id;
        return 'class-7a';
      } catch (e) {
        return 'class-7a';
      }
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (savedTeacherObj === null) {
      const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
      const saved = localStorage.getItem(`students_class_${activeId}`);
      return saved ? JSON.parse(saved) : (SAMPLE_STUDENTS[activeId] || []);
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
        if (!activeId) return [];
        const saved = localStorage.getItem(`students_class_${activeId}`);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
  });
  
  const [cards, setCards] = useState<QuizCard[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (savedTeacherObj === null) {
      const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
      const saved = localStorage.getItem(`quiz_cards_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
        if (!activeId) return [];
        const saved = localStorage.getItem(`quiz_cards_class_${activeId}`);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
  });

  const [pickedIds, setPickedIds] = useState<string[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    if (savedTeacherObj === null) {
      const activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
      const saved = localStorage.getItem(`picked_students_class_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        const activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || '';
        if (!activeId) return [];
        const saved = localStorage.getItem(`picked_students_class_${activeId}`);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
  });

  const [subjects, setSubjects] = useState<QuizSubject[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    let activeId = 'class-7a';
    if (savedTeacherObj === null) {
      activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || 'class-7a';
      } catch (e) {}
    }
    const saved = localStorage.getItem(`subjects_class_${activeId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    let activeId = 'class-7a';
    if (savedTeacherObj === null) {
      activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || 'class-7a';
      } catch (e) {}
    }
    return localStorage.getItem(`active_subject_id_${activeId}`);
  });

  const [chapters, setChapters] = useState<QuizChapter[]>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    let activeId = 'class-7a';
    if (savedTeacherObj === null) {
      activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || 'class-7a';
      } catch (e) {}
    }
    const saved = localStorage.getItem(`chapters_class_${activeId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const savedTeacherObj = localStorage.getItem('logged_in_teacher');
    let activeId = 'class-7a';
    if (savedTeacherObj === null) {
      activeId = localStorage.getItem('khmer_teacher_active_class_id') || 'class-7a';
    } else {
      try {
        const teacherObj = JSON.parse(savedTeacherObj);
        activeId = localStorage.getItem(`khmer_teacher_active_class_id_${teacherObj.id}`) || 'class-7a';
      } catch (e) {}
    }
    return localStorage.getItem(`active_room_id_${activeId}`);
  });

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
      setClasses(sortClasses(savedClasses ? JSON.parse(savedClasses) : DEFAULT_CLASSES));
      
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
         let classesToDelete: string[] = [];
         let found7a = false;
         
         classesSnap.forEach(docSnap => {
           const clsData = docSnap.data() as ClassInfo;
           if (clsData && clsData.name && clsData.name.trim() !== '') {
             if (clsData.name.trim() === 'ថ្នាក់ទី៧ក') {
               if (found7a) {
                 classesToDelete.push(docSnap.id);
                 return;
               }
               found7a = true;
             }
             fetchedClasses.push(clsData);
           } else {
             classesToDelete.push(docSnap.id);
           }
         });
 
         // Clean up empty or duplicate classes right away in Firestore
         for (const classId of classesToDelete) {
           try {
             await deleteDoc(doc(db, 'teachers', teacher.id, 'classes', classId));
           } catch (deleteErr) {
             console.error(`Failed to delete nameless or duplicate class ${classId}:`, deleteErr);
           }
         }

         // If the cloud account has 0 classes, migrate local classes that the user added previously to their cloud account
         if (true) {
           const localClassesStr = localStorage.getItem(`khmer_teacher_classes_${teacher.id}`) || localStorage.getItem('khmer_teacher_classes');
           if (localClassesStr) {
             try {
               const localClasses = JSON.parse(localClassesStr) as ClassInfo[];
               const validLocalClasses = localClasses.filter(c => c && c.name && c.name.trim() !== '');
               
               if (validLocalClasses.length > 0) {
                 for (const lc of validLocalClasses) {
                    if (fetchedClasses.some(fc => fc.id === lc.id)) {
                      continue;
                    }
                   // 1. Load subjects, activeSubjectId, activeRoomId
                   const localSubjectsStr = localStorage.getItem(`subjects_class_${lc.id}`);
                   let finalSubjects: QuizSubject[] = [];
                   let finalActiveSubjectId: string | null = null;
                   let finalActiveRoomId: string | null = null;
                   
                   if (localSubjectsStr) {
                     finalSubjects = JSON.parse(localSubjectsStr);
                     finalActiveSubjectId = localStorage.getItem(`active_subject_id_${lc.id}`) || (finalSubjects[0]?.id || null);
                     finalActiveRoomId = localStorage.getItem(`active_room_id_${lc.id}`);
                   } else {
                     // Fallback migration of chapters
                     const localChaptersStr = localStorage.getItem(`chapters_class_${lc.id}`);
                     let tempChapters: QuizChapter[] = [];
                     if (localChaptersStr) {
                       tempChapters = JSON.parse(localChaptersStr);
                     } else {
                       const localCardsStr = localStorage.getItem(`quiz_cards_class_${lc.id}`);
                       const localPickedStr = localStorage.getItem(`picked_students_class_${lc.id}`);
                       const localCards = localCardsStr ? JSON.parse(localCardsStr) : [];
                       const localPicked = localPickedStr ? JSON.parse(localPickedStr) : [];
                       const defaultRoom: QuizRoom = {
                         id: `room-default-${Date.now()}`,
                         name: 'មេរៀនទី១',
                         cards: localCards,
                         pickedIds: localPicked,
                         createdAt: Date.now()
                       };
                       tempChapters = [{
                         id: `chapter-default-${Date.now()}`,
                         name: 'ជំពូកទី១',
                         rooms: [defaultRoom],
                         createdAt: Date.now()
                       }];
                     }
                     const migrationObj = getMigratedSubjects(tempChapters);
                     finalSubjects = migrationObj.subjects;
                     finalActiveSubjectId = migrationObj.activeSubjectId;
                   }
                   
                   // Write Class Metadata to Cloud
                   await setDoc(doc(db, 'teachers', teacher.id, 'classes', lc.id), {
                     id: lc.id,
                     name: lc.name.trim(),
                     subjects: finalSubjects,
                     activeSubjectId: finalActiveSubjectId,
                     activeRoomId: finalActiveRoomId,
                     createdAt: new Date().toISOString()
                   });
                   
                   // 2. Load and write students
                   const localStudentsStr = localStorage.getItem(`students_class_${lc.id}`);
                   if (localStudentsStr) {
                     const localStudents = JSON.parse(localStudentsStr) as Student[];
                     for (const std of localStudents) {
                       if (std && std.id) {
                         await setDoc(doc(db, 'teachers', teacher.id, 'classes', lc.id, 'students', std.id), std);
                       }
                     }
                   }
                   
                   fetchedClasses.push(lc);
                 }
               }
             } catch (syncErr) {
               console.error('Failed to migrate local classes directly to cloud account:', syncErr);
             }
           }
         }

        // Do not seed or pin DEFAULT_CLASSES when registering/logging in! Let newly registered accounts be clean.
        const merged = [...fetchedClasses];
        DEFAULT_CLASSES.forEach(pc => {
          if (!merged.some(m => m.id === pc.id || m.name.trim() === pc.name.trim())) {
            merged.push(pc);
          }
        });
        const sortedCloudClasses = sortClasses(merged);
        setClasses(sortedCloudClasses);
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedCloudClasses));
        
        const lastActiveId = localStorage.getItem(`khmer_teacher_active_class_id_${teacher.id}`) || (fetchedClasses[0]?.id || '');
        const exists = fetchedClasses.some(c => c.id === lastActiveId);
        setActiveClassId(exists ? lastActiveId : (fetchedClasses[0]?.id || ''));
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
      setStudents(loadedStudents ? JSON.parse(loadedStudents) : (SAMPLE_STUDENTS[activeClassId] || []));

      const loadedSubjectsStr = localStorage.getItem(`subjects_class_${activeClassId}`);
      let loadedSubjects: QuizSubject[] = [];
      let loadedActiveSubjectId: string | null = null;
      let loadedChapters: QuizChapter[] = [];
      let loadedActiveRoomId: string | null = null;

      if (loadedSubjectsStr) {
        loadedSubjects = JSON.parse(loadedSubjectsStr);
        loadedActiveSubjectId = localStorage.getItem(`active_subject_id_${activeClassId}`) || (loadedSubjects[0]?.id || null);
      }

      if (loadedSubjects.length === 0) {
        // Try migrating from chapters
        const loadedChaptersStr = localStorage.getItem(`chapters_class_${activeClassId}`);
        let tempChapters: QuizChapter[] = [];
        if (loadedChaptersStr) {
          tempChapters = JSON.parse(loadedChaptersStr);
        } else {
          // Try migrating from legacy rooms
          const loadedRoomsStr = localStorage.getItem(`rooms_class_${activeClassId}`);
          if (loadedRoomsStr) {
            const loadedRooms: QuizRoom[] = JSON.parse(loadedRoomsStr);
            tempChapters = [{
              id: `chapter-default-${Date.now()}`,
              name: 'ជំពូកទី១',
              rooms: loadedRooms,
              createdAt: Date.now()
            }];
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
            tempChapters = [{
              id: `chapter-default-${Date.now()}`,
              name: 'ជំពូកទី១',
              rooms: [defaultRoom],
              createdAt: Date.now()
            }];
          }
        }

        const migration = getMigratedSubjects(tempChapters);
        loadedSubjects = migration.subjects;
        loadedActiveSubjectId = migration.activeSubjectId;

        localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(loadedSubjects));
        localStorage.setItem(`active_subject_id_${activeClassId}`, loadedActiveSubjectId);
      }

      // Find chapters of currently active subject
      const activeSub = loadedSubjects.find(s => s.id === loadedActiveSubjectId) || loadedSubjects[0];
      loadedChapters = activeSub?.chapters || [];

      // Determine active roomId
      loadedActiveRoomId = localStorage.getItem(`active_room_id_${activeClassId}`);
      let activeRoom: QuizRoom | undefined;
      for (const ch of loadedChapters) {
        activeRoom = ch.rooms.find(r => r.id === loadedActiveRoomId);
        if (activeRoom) break;
      }
      if (!activeRoom && loadedChapters.length > 0) {
        activeRoom = loadedChapters[0].rooms[0];
        loadedActiveRoomId = activeRoom?.id || null;
      }

      setSubjects(loadedSubjects);
      setActiveSubjectId(loadedActiveSubjectId);
      setChapters(loadedChapters);
      setActiveRoomId(loadedActiveRoomId);

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
        
        let loadedSubjects: QuizSubject[] = [];
        let loadedActiveSubjectId: string | null = null;
        let loadedChapters: QuizChapter[] = [];
        let loadedActiveRoomId: string | null = null;

        if (classSnap.exists()) {
          const classData = classSnap.data();
          if (classData.subjects && classData.subjects.length > 0) {
            loadedSubjects = classData.subjects;
            loadedActiveSubjectId = classData.activeSubjectId || (loadedSubjects[0]?.id || null);
          } else {
            // First migrate chapters/rooms/legacy content
            let tempChapters: QuizChapter[] = [];
            if (classData.chapters && classData.chapters.length > 0) {
              tempChapters = classData.chapters;
            } else if (classData.rooms && classData.rooms.length > 0) {
              tempChapters = [{
                id: `chapter-default-${Date.now()}`,
                name: 'ជំពូកទី១',
                rooms: classData.rooms,
                createdAt: Date.now()
              }];
            } else {
              const legacyCards = classData.cards || [];
              const legacyPicked = classData.pickedIds || [];
              const defaultRoom: QuizRoom = {
                id: `room-default-${Date.now()}`,
                name: 'មេរៀនទី១',
                cards: legacyCards,
                pickedIds: legacyPicked,
                createdAt: Date.now()
              };
              tempChapters = [{
                id: `chapter-default-${Date.now()}`,
                name: 'ជំពូកទី១',
                rooms: [defaultRoom],
                createdAt: Date.now()
              }];
            }
            
            const migration = getMigratedSubjects(tempChapters);
            loadedSubjects = migration.subjects;
            loadedActiveSubjectId = migration.activeSubjectId;
            
            // Sync the migrated subjects back to cloud!
            await setDoc(classDocRef, {
              subjects: loadedSubjects,
              activeSubjectId: loadedActiveSubjectId
            }, { merge: true });
          }
          loadedActiveRoomId = classData.activeRoomId || null;
        } else {
          // Empty or new class in cloud – check local storage fallback first to prevent overwriting local guest data
          const localSubjectsStr = localStorage.getItem(`subjects_class_${activeClassId}`);
          if (localSubjectsStr) {
            try {
              loadedSubjects = JSON.parse(localSubjectsStr);
              loadedActiveSubjectId = localStorage.getItem(`active_subject_id_${activeClassId}`) || (loadedSubjects[0]?.id || null);
              loadedActiveRoomId = localStorage.getItem(`active_room_id_${activeClassId}`);
            } catch (err) {
              console.error('Failed to parse local subjects fallback:', err);
              const migration = getMigratedSubjects([]);
              loadedSubjects = migration.subjects;
              loadedActiveSubjectId = migration.activeSubjectId;
            }
          } else {
            const migration = getMigratedSubjects([]);
            loadedSubjects = migration.subjects;
            loadedActiveSubjectId = migration.activeSubjectId;
          }
          
          const localClassObj = classes.find(c => c.id === activeClassId);
          const classNameToSave = localClassObj?.name || 'ថ្នាក់ថ្មី';
          
          await setDoc(classDocRef, {
            id: activeClassId,
            name: classNameToSave,
            subjects: loadedSubjects,
            activeSubjectId: loadedActiveSubjectId,
            activeRoomId: loadedActiveRoomId,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const activeSub = loadedSubjects.find(s => s.id === loadedActiveSubjectId) || loadedSubjects[0];
        loadedChapters = activeSub?.chapters || [];

        // Determine active roomId
        let activeRoom: QuizRoom | undefined;
        for (const ch of loadedChapters) {
          activeRoom = ch.rooms.find(r => r.id === loadedActiveRoomId);
          if (activeRoom) break;
        }
        if (!activeRoom && loadedChapters.length > 0) {
          activeRoom = loadedChapters[0].rooms[0];
          loadedActiveRoomId = activeRoom?.id || null;
        }

        setSubjects(loadedSubjects);
        setActiveSubjectId(loadedActiveSubjectId);
        setChapters(loadedChapters);
        setActiveRoomId(loadedActiveRoomId);

        setCards(activeRoom?.cards || []);
        setPickedIds(activeRoom?.pickedIds || []);

        // 2. Fetch students
        const studentsCollRef = collection(db, 'teachers', teacher.id, 'classes', activeClassId, 'students');
        const studentsSnap = await getDocs(studentsCollRef);
        
        let loadedStudents: Student[] = [];
        studentsSnap.forEach(docSnap => {
          loadedStudents.push(docSnap.data() as Student);
        });
        
        // Fallback to local guest data if cloud has 0 students to prevent overwriting newly added local students
        if (loadedStudents.length === 0) {
          const localStudentsStr = localStorage.getItem(`students_class_${activeClassId}`);
          if (localStudentsStr) {
            try {
              const localStudents = JSON.parse(localStudentsStr) as Student[];
              if (localStudents.length > 0) {
                loadedStudents = localStudents;
                // Upload local students to cloud Firestore so they persist on cloud too
                for (const std of localStudents) {
                  if (std && std.id) {
                    await setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', std.id), std);
                  }
                }
              }
            } catch (err) {
              console.error('Failed to parse local students fallback:', err);
            }
          }
        }
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
    if (!activeClassId) return;
    const currentTeacherId = teacher?.id || 'local';

    const studentsCollRef = collection(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students');
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
    if (!activeClassId) return;
    const currentTeacherId = teacher?.id || 'local';

    const syncClassInfo = async () => {
      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        const currentActiveCard = cards.find(c => c.id === activeCardId) || null;
        
        await setDoc(classDocRef, {
          activeCardId: activeCardId,
          activeRoomId: activeRoomId,
          activeTab: activeTab,
          activeCardState: activeCardState,
          activeCard: currentActiveCard
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync active state to Firestore:", err);
      }
    };

    syncClassInfo();
  }, [activeClassId, activeCardId, activeRoomId, activeTab, activeCardState, teacher, cards]);

  // Save changes to localStorage on states update as fallback for offline use and fast initial load
  useEffect(() => {
    if (teacher) {
      localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(classes));
    } else {
      localStorage.setItem('khmer_teacher_classes', JSON.stringify(classes));
    }
  }, [classes, teacher]);

  useEffect(() => {
    if (activeClassId) {
      localStorage.setItem(`students_class_${activeClassId}`, JSON.stringify(students));
    }
  }, [students, activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      localStorage.setItem(`quiz_cards_class_${activeClassId}`, JSON.stringify(cards));
    }
  }, [cards, activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      localStorage.setItem(`picked_students_class_${activeClassId}`, JSON.stringify(pickedIds));
    }
  }, [pickedIds, activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(subjects));
    }
  }, [subjects, activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(chapters));
    }
  }, [chapters, activeClassId]);

  useEffect(() => {
    if (activeClassId && activeSubjectId) {
      localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubjectId);
    }
  }, [activeSubjectId, activeClassId]);

  useEffect(() => {
    if (activeClassId && activeRoomId) {
      localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
    } else if (activeClassId && activeRoomId === null) {
      localStorage.removeItem(`active_room_id_${activeClassId}`);
    }
  }, [activeRoomId, activeClassId]);

  // Helper to save class-level states to Firestore
  const saveClassMetadata = useCallback(async (updatedCards: QuizCard[], updatedPickedIds: string[]) => {
    if (!activeRoomId || !activeSubjectId) return;

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

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });

    setSubjects(updatedSubjects);

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      try {
        await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
          subjects: updatedSubjects,
          chapters: updatedChapters, // backward compatibility
          activeRoomId: activeRoomId,
          activeSubjectId: activeSubjectId
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save class metadata to cloud:', err);
      }
    }
    if (!teacher && activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters)); // backward compatibility
      localStorage.setItem(`active_subject_id_${activeClassId}`, activeSubjectId);
      localStorage.setItem(`active_room_id_${activeClassId}`, activeRoomId);
    }
  }, [teacher, activeClassId, activeRoomId, chapters, subjects, activeSubjectId]);

  // Helper to save student score updates to Firestore
  const saveStudentScore = useCallback(async (studentId: string, newScore: number) => {
    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      try {
        await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId), {
          score: newScore
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update student score on cloud:', err);
      }
    }
  }, [teacher, activeClassId]);

  // Helper to save pickedIds updates to Firestore immediately when wheel or panel changes it
  const handleSetPickedIds = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setPickedIds(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      
      const currentTeacherId = teacher?.id || 'local';
      if (activeClassId && activeRoomId && activeSubjectId) {
        const updatedChapters = chapters.map(ch => {
          const updatedRooms = ch.rooms.map(r => {
            if (r.id === activeRoomId) {
              return {
                ...r,
                pickedIds: next
              };
            }
            return r;
          });
          return { ...ch, rooms: updatedRooms };
        });

        const updatedSubjects = subjects.map(sub => {
          if (sub.id === activeSubjectId) {
            return {
              ...sub,
              chapters: updatedChapters
            };
          }
          return sub;
        });

        setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
          subjects: updatedSubjects,
          chapters: updatedChapters,
          activeRoomId: activeRoomId,
          activeSubjectId: activeSubjectId,
          pickedIds: next
        }, { merge: true }).catch(err => {
          console.error('Failed to sync pickedIds on updates in cloud:', err);
        });
      }
      return next;
    });
  }, [teacher, activeClassId, activeRoomId, activeSubjectId, chapters, subjects]);

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

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters,
        activeRoomId: newRoom.id
      }, { merge: true }).catch(err => console.error('Failed to save new room to cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      localStorage.setItem(`active_room_id_${activeClassId}`, newRoom.id);
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

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

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters,
        activeRoomId: nextActiveId
      }, { merge: true }).catch(err => console.error('Failed to sync room deletion to cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      if (nextActiveId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveId);
      } else {
        localStorage.removeItem(`active_room_id_${activeClassId}`);
      }
    }
  }, [chapters, subjects, activeSubjectId, activeRoomId, teacher, activeClassId]);

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

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename room in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleCreateChapter = useCallback((chapterName: string) => {
    const newChapter: QuizChapter = {
      id: `chapter-${Date.now()}`,
      name: chapterName,
      rooms: [],
      createdAt: Date.now()
    };
    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to create chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

  const handleRenameChapter = useCallback((chapterId: string, newName: string) => {
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return { ...ch, name: newName };
      }
      return ch;
    });
    setChapters(updatedChapters);

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters
      }, { merge: true }).catch(err => console.error('Failed to rename chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
    }
  }, [chapters, subjects, activeSubjectId, teacher, activeClassId]);

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

    const updatedSubjects = subjects.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: updatedChapters
        };
      }
      return sub;
    });
    setSubjects(updatedSubjects);

    if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        subjects: updatedSubjects,
        chapters: updatedChapters,
        activeRoomId: nextActiveRoomId
      }, { merge: true }).catch(err => console.error('Failed to delete chapter in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(updatedChapters));
      if (nextActiveRoomId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
      } else {
        localStorage.removeItem(`active_room_id_${activeClassId}`);
      }
    }
  }, [chapters, subjects, activeSubjectId, activeRoomId, teacher, activeClassId]);

  const handleSelectSubject = useCallback((subjectId: string) => {
    setActiveSubjectId(subjectId);
    if (!teacher && activeClassId) {
      localStorage.setItem(`active_subject_id_${activeClassId}`, subjectId);
    } else if (teacher && activeClassId) {
      setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
        activeSubjectId: subjectId
      }, { merge: true }).catch(err => console.error('Failed to sync activeSubjectId:', err));
    }

    const sub = subjects.find(s => s.id === subjectId);
    if (sub) {
      setChapters(sub.chapters);
      if (sub.chapters.length > 0 && sub.chapters[0].rooms.length > 0) {
        const firstRoom = sub.chapters[0].rooms[0];
        setActiveRoomId(firstRoom.id);
        setCards(firstRoom.cards || []);
        setPickedIds(firstRoom.pickedIds || []);
        if (!teacher && activeClassId) {
          localStorage.setItem(`active_room_id_${activeClassId}`, firstRoom.id);
        } else if (teacher && activeClassId) {
          setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
            activeRoomId: firstRoom.id
          }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
        }
      } else {
        setActiveRoomId(null);
        setCards([]);
        setPickedIds([]);
        if (!teacher && activeClassId) {
          localStorage.removeItem(`active_room_id_${activeClassId}`);
        } else if (teacher && activeClassId) {
          setDoc(doc(db, 'teachers', teacher.id, 'classes', activeClassId), {
            activeRoomId: null
          }, { merge: true }).catch(err => console.error('Failed to sync activeRoomId:', err));
        }
      }
    }
  }, [subjects, teacher, activeClassId]);

  const handleCreateSubject = useCallback((subjectName: string) => {
    const newSubject: QuizSubject = {
      id: `subject-${Date.now()}`,
      name: subjectName,
      chapters: [
        {
          id: `chapter-subj-${Date.now()}`,
          name: 'ជំពូកទី១',
          rooms: [
            {
              id: `room-subj-${Date.now()}`,
              name: 'មេរៀនទី១',
              cards: [],
              pickedIds: [],
              createdAt: Date.now()
            }
          ],
          createdAt: Date.now()
        }
      ],
      createdAt: Date.now()
    };
    const updatedSubjects = [...subjects, newSubject];
    setSubjects(updatedSubjects);

    setActiveSubjectId(newSubject.id);
    setChapters(newSubject.chapters);
    const defaultRoom = newSubject.chapters[0].rooms[0];
    setActiveRoomId(defaultRoom.id);
    setCards([]);
    setPickedIds([]);

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        activeSubjectId: newSubject.id,
        activeRoomId: defaultRoom.id,
        chapters: newSubject.chapters
      }, { merge: true }).catch(err => console.error('Failed to create subject in cloud:', err));
    }
    if (!teacher && activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      localStorage.setItem(`active_subject_id_${activeClassId}`, newSubject.id);
      localStorage.setItem(`active_room_id_${activeClassId}`, defaultRoom.id);
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(newSubject.chapters));
    }
  }, [subjects, teacher, activeClassId]);

  const handleRenameSubject = useCallback((subjectId: string, newName: string) => {
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, name: newName };
      }
      return s;
    });
    setSubjects(updatedSubjects);

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects
      }, { merge: true }).catch(err => console.error('Failed to rename subject in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
    }
  }, [subjects, teacher, activeClassId]);

  const handleDeleteSubject = useCallback((subjectId: string) => {
    if (subjects.length <= 1) {
      alert('មិនអាចលុបមុខវិជ្ជាទាំងអស់បានទេ! ត្រូវតែមានយ៉ាងហោចណាស់មុខវិជ្ជាសកម្មមួយ។');
      return;
    }
    if (!window.confirm('តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះមែនទេ?​ ជំពូក មេរៀន និងគំនូសសកម្មភាពទាំងអស់នឹងត្រូវបាត់បង់ទាំងអស់។')) {
      return;
    }

    const updatedSubjects = subjects.filter(s => s.id !== subjectId);
    setSubjects(updatedSubjects);

    let nextSubjectId = activeSubjectId;
    let nextChapters = chapters;
    let nextActiveRoomId = activeRoomId;

    if (activeSubjectId === subjectId) {
      const fallbackSubject = updatedSubjects[0];
      nextSubjectId = fallbackSubject.id;
      nextChapters = fallbackSubject.chapters;
      
      const activeRoom = nextChapters.length > 0 && nextChapters[0].rooms.length > 0 ? nextChapters[0].rooms[0] : null;
      nextActiveRoomId = activeRoom ? activeRoom.id : null;
      setChapters(nextChapters);
      setActiveRoomId(nextActiveRoomId);
      setCards(activeRoom ? activeRoom.cards || [] : []);
      setPickedIds(activeRoom ? activeRoom.pickedIds || [] : []);
    }

    setActiveSubjectId(nextSubjectId);

    const currentTeacherId = teacher?.id || 'local';
    if (activeClassId) {
      setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId), {
        subjects: updatedSubjects,
        activeSubjectId: nextSubjectId,
        activeRoomId: nextActiveRoomId,
        chapters: nextChapters
      }, { merge: true }).catch(err => console.error('Failed to delete subject in cloud:', err));
    } else if (activeClassId) {
      localStorage.setItem(`subjects_class_${activeClassId}`, JSON.stringify(updatedSubjects));
      if (nextSubjectId) {
        localStorage.setItem(`active_subject_id_${activeClassId}`, nextSubjectId);
      }
      if (nextActiveRoomId) {
        localStorage.setItem(`active_room_id_${activeClassId}`, nextActiveRoomId);
      }
      localStorage.setItem(`chapters_class_${activeClassId}`, JSON.stringify(nextChapters));
    }
  }, [subjects, activeSubjectId, chapters, activeRoomId, teacher, activeClassId]);

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
      
      const { subjects: defaultSubjects, activeSubjectId: defaultActiveSubjectId } = getMigratedSubjects([]);
      const defaultActiveRoomId = defaultSubjects[0]?.chapters[0]?.rooms[0]?.id || null;

      if (teacher) {
        try {
          await setDoc(doc(db, 'teachers', teacher.id, 'classes', newClassId), {
            id: newClassId,
            name: className.trim(),
            subjects: defaultSubjects,
            activeSubjectId: defaultActiveSubjectId,
            activeRoomId: defaultActiveRoomId,
            pickedIds: [],
            cards: [],
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}/classes/${newClassId}`);
        }
      } else {
        localStorage.setItem(`subjects_class_${newClassId}`, JSON.stringify(defaultSubjects));
        localStorage.setItem(`active_subject_id_${newClassId}`, defaultActiveSubjectId || '');
        if (defaultActiveRoomId) {
          localStorage.setItem(`active_room_id_${newClassId}`, defaultActiveRoomId);
        }
      }
      
      const sortedClasses = sortClasses([...classes, newClass]);
      setClasses(sortedClasses);
      if (teacher) {
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
      }
      
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
      
      const currentTeacherId = teacher?.id || 'local';
      try {
        await deleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', classId));
      } catch (err) {
        console.error(err);
      }
      
      const sortedClasses = sortClasses(updatedClasses);
      setClasses(sortedClasses);
      if (teacher) {
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
      }

      localStorage.removeItem(`students_class_${classId}`);
      localStorage.removeItem(`quiz_cards_class_${classId}`);
      localStorage.removeItem(`picked_students_class_${classId}`);
      
      if (activeClassId === classId) {
        handleSwitchClass(updatedClasses[0].id);
      }
    }
  };

  const handleRenameClass = async (e: React.MouseEvent, classId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt('សូមបញ្ចូលឈ្មោះថ្នាក់រៀនថ្មី៖', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const trimmedName = newName.trim();
      const updatedClasses = classes.map(c => c.id === classId ? { ...c, name: trimmedName } : c);
      const sortedClasses = sortClasses(updatedClasses);
      setClasses(sortedClasses);
      
      if (teacher) {
        localStorage.setItem(`khmer_teacher_classes_${teacher.id}`, JSON.stringify(sortedClasses));
      } else {
        localStorage.setItem('khmer_teacher_classes', JSON.stringify(sortedClasses));
      }
      
      const currentTeacherId = teacher?.id || 'local';
      try {
        await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', classId), {
          id: classId,
          name: trimmedName
        }, { merge: true });
      } catch (err) {
        console.error("Failed to rename class in Cloud:", err);
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

    const currentTeacherId = teacher?.id || 'local';
    try {
      await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', newStudent.id), newStudent);
    } catch (err) {
      console.error(err);
    }

    setStudents(prev => {
      if (prev.some(s => s.id === newStudent.id)) return prev;
      return [...prev, newStudent];
    });
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
    
    const currentTeacherId = teacher?.id || 'local';
    if (fields.classId === activeClassId) {
      try {
        await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', newStudent.id), newStudent);
      } catch (err) {
        console.error(err);
      }
      setStudents(prev => {
        if (prev.some(s => s.id === newStudent.id)) return prev;
        return [...prev, newStudent];
      });
    } else {
      try {
        await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', fields.classId, 'students', newStudent.id), newStudent);
      } catch (err) {
        console.error(err);
      }
      const savedKey = `students_class_${fields.classId}`;
      const savedRaw = localStorage.getItem(savedKey);
      const savedList = savedRaw ? JSON.parse(savedRaw) : [];
      savedList.push(newStudent);
      localStorage.setItem(savedKey, JSON.stringify(savedList));
      alert(`បានរក្សាទុកសិស្ស «${fields.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
    }
  }, [activeClassId, teacher]);

  const handleBulkAddStudents = useCallback(async (list: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[]) => {
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

    const currentTeacherId = teacher?.id || 'local';
    try {
      await Promise.all(
        newStudents.map(student => 
          setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', student.id), student)
        )
      );
    } catch (err) {
      console.error(err);
    }

    setStudents(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const uniqueNew = newStudents.filter(s => !existingIds.has(s.id));
      if (uniqueNew.length === 0) return prev;
      return [...prev, ...uniqueNew];
    });
  }, [activeClassId, teacher]);

  const updateStudentDetail = useCallback(async (id: string, fields: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    const currentTeacherId = teacher?.id || 'local';
    
    setStudents(prev => {
      const studentToUpdate = prev.find(s => s.id === id);
      if (!studentToUpdate) return prev;
      
      const newClassId = fields.classId || studentToUpdate.classId || activeClassId;
      const oldClassId = studentToUpdate.classId || activeClassId;
      
      updatedStudent = { ...studentToUpdate, ...fields, classId: newClassId };

      if (newClassId !== oldClassId) {
        // Move to another class
        const filtered = prev.filter(s => s.id !== id);
        
        (async () => {
          try {
            await deleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', oldClassId, 'students', id));
            await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', newClassId, 'students', id), updatedStudent!);
          } catch (err) {
            console.error(err);
          }
        })();
        
        const targetKey = `students_class_${newClassId}`;
        const targetRaw = localStorage.getItem(targetKey);
        const targetList = targetRaw ? JSON.parse(targetRaw) : [];
        
        const cleanedList = targetList.filter((s: any) => s.id !== id);
        cleanedList.push(updatedStudent);
        localStorage.setItem(targetKey, JSON.stringify(cleanedList));
        
        alert(`បានផ្លាស់ប្ដូរថ្នាក់សិស្ស «${fields.name || studentToUpdate.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
        return filtered;
      } else {
        (async () => {
          try {
            await setDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', id), updatedStudent!);
          } catch (err) {
            console.error(err);
          }
        })();
        return prev.map(s => s.id === id ? { ...s, ...fields } : s);
      }
    });
  }, [activeClassId, teacher]);

  const removeStudent = useCallback(async (id: string) => {
    const currentTeacherId = teacher?.id || 'local';
    try {
      await deleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', id));
    } catch (err) {
      console.error(err);
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudentId === id) setSelectedStudentId(null);
  }, [selectedStudentId, teacher, activeClassId]);

  const clearStudents = useCallback(async () => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះសិស្សទាំងអស់មែនទេ?')) {
      const currentTeacherId = teacher?.id || 'local';
      try {
        for (const s of students) {
          await deleteDoc(doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', s.id));
        }
      } catch (err) {
        console.error(err);
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
        <div 
          onClick={() => setActiveTab('wheel')}
          className="flex items-center gap-4 cursor-pointer hover:opacity-90 active:scale-98 transition-all select-none"
          title="ត្រឡប់ទៅទំព័រដើម (Home)"
        >
          <div className="w-12 h-12 flex items-center justify-center relative">
            <SovannaphumiLogo className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">Teacher EduSpin</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-full">Edu_Pro</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2 flex-wrap">
              <span>សាលារៀន៖ {teacher ? teacher.schoolName : 'សាលាសុវណ្ណភូមិ សាខាផ្សារដីហុយ'}</span>
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
            <span>បន្ទប់ហ្គេមសិស្ស (Game & QR)</span>
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
            className="px-5 py-2.5 btn-orange-gemini text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 group cursor-pointer select-none"
          >
            <Sparkles className="w-4 h-4 text-orange-100 group-hover:rotate-12 transition-transform" />
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
          {classes.map((cls, idx) => (
            <div 
              key={cls.id ? `class-${cls.id}-${idx}` : `class-idx-${idx}`}
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => handleRenameClass(e, cls.id, cls.name)}
                  className={`p-0.5 rounded-md transition-colors ${
                    activeClassId === cls.id 
                      ? 'hover:bg-white/20 text-white hover:text-indigo-200' 
                      : 'hover:text-indigo-500 hover:bg-slate-500/10 text-slate-400 dark:text-slate-400'
                  }`}
                  title="កែឈ្មោះថ្នាក់"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                {classes.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveClass(e, cls.id, cls.name)}
                    className={`p-0.5 rounded-md transition-colors ${
                      activeClassId === cls.id
                        ? 'hover:bg-red-500/40 text-red-200 hover:text-red-100'
                        : 'hover:bg-red-500/20 hover:text-red-500 text-slate-400 dark:text-slate-400'
                    }`}
                    title="លុបថ្នាក់"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={handleAddClass}
            className={`px-3 py-1 bg-transparent border-2 border-dashed rounded-xl text-xs font-bold flex items-center gap-1 btn-add-class-gemini ${
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
                onSetPickedIds={handleSetPickedIds}
                onSelectStudent={(s) => setSelectedStudentId(s.id)}
                selectedStudent={selectedStudent}
                onAddStudent={addStudent}
                onBulkAddStudents={handleBulkAddStudents}
                showBulkInput={showWheelBulk}
                setShowBulkInput={setShowWheelBulk}
                isDarkMode={isDarkMode}
              />
            </section>
            
            <aside className="hidden md:block md:basis-2/5 h-full shrink-0 border-l border-slate-200 dark:border-slate-800">
              <StudentPanel
                students={students}
                pickedIds={pickedIds}
                onSetPickedIds={handleSetPickedIds}
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
                subjects={subjects}
                activeSubjectId={activeSubjectId}
                onSelectSubject={handleSelectSubject}
                onCreateSubject={handleCreateSubject}
                onRenameSubject={handleRenameSubject}
                onDeleteSubject={handleDeleteSubject}
              />
            </section>
          </>
        )}

        {activeTab === 'groups' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <GroupDivider
              students={students}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
              activeClassId={activeClassId || ''}
              teacher={teacher}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {activeTab === 'students' && (
          <div className={`flex-1 h-full overflow-y-auto ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            <StudentManager
              students={students}
              classes={classes}
              activeClassId={activeClassId}
              isDarkMode={isDarkMode}
              onAddStudentDetail={addStudentDetail}
              onRemoveStudent={removeStudent}
              onUpdateStudentDetail={updateStudentDetail}
              onBulkAddStudents={handleBulkAddStudents}
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


