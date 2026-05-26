/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, LayoutGrid, RotateCcw, User, LogIn, LogOut, Plus, Moon, Sun, Trash2, GraduationCap, Compass, Users as UsersIcon, UserCog, Check } from 'lucide-react';
import StudentPanel from './components/StudentPanel';
import QuizPanel from './components/QuizPanel';
import LessonModal from './components/LessonModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import SpinningWheel from './components/SpinningWheel';
import GroupDivider from './components/GroupDivider';
import StudentManager from './components/StudentManager';
import { Student, Question, QuizCard, ClassInfo, TeacherAccount } from './types';

const EMOJIS = ["🥰", "😂", "😩", "🥳", "🥺", "😇", "😎", "🤩", "🤔", "🤗", "🤭", "🫠", "😤", "😮💨", "🫡", "😬", "🙄", "🤒", "😵💫", "😳", "🤪", "😜", "🤫", "🫣", "☹️", "😕"];

const DEFAULT_CLASSES: ClassInfo[] = [
  { id: 'class-7a', name: 'ថ្នាក់ទី៧ក' },
  { id: 'class-8a', name: 'ថ្នាក់ទី៨ក' },
  { id: 'class-9a', name: 'ថ្នាក់ទី៩ក' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'wheel' | 'quiz' | 'groups' | 'students'>('wheel');
  const [showWheelBulk, setShowWheelBulk] = useState(false);

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

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
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

  // Save changes to localStorage on states update
  useEffect(() => {
    localStorage.setItem('khmer_teacher_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('khmer_teacher_active_class_id', activeClassId);
  }, [activeClassId]);

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

  // Handler for switching class
  const handleSwitchClass = (classId: string) => {
    setActiveClassId(classId);
    
    const loadedStudents = localStorage.getItem(`students_class_${classId}`);
    setStudents(loadedStudents ? JSON.parse(loadedStudents) : []);

    const loadedCards = localStorage.getItem(`quiz_cards_class_${classId}`);
    setCards(loadedCards ? JSON.parse(loadedCards) : []);

    const loadedPicked = localStorage.getItem(`picked_students_class_${classId}`);
    setPickedIds(loadedPicked ? JSON.parse(loadedPicked) : []);

    setSelectedStudentId(null);
    setActiveCardId(null);
  };

  const handleAddClass = () => {
    const className = window.prompt('សូមបញ្ចូលឈ្មោះថ្នាក់រៀនថ្មី៖', 'ថ្នាក់ទី១០ក');
    if (className && className.trim()) {
      const newClassId = `class-${Date.now()}`;
      const newClass = { id: newClassId, name: className.trim() };
      setClasses(prev => [...prev, newClass]);
      handleSwitchClass(newClassId);
    }
  };

  const handleRemoveClass = (e: React.MouseEvent, classId: string, className: string) => {
    e.stopPropagation(); // prevent switching to it
    if (classes.length <= 1) {
      alert('ត្រូវតែមានថ្នាក់រៀនយ៉ាងហោចណាស់មួយ!');
      return;
    }
    if (window.confirm(`តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបថ្នាក់ទី «${className}» នេះចោលមែនទេ?`)) {
      const updatedClasses = classes.filter(c => c.id !== classId);
      setClasses(updatedClasses);
      localStorage.removeItem(`students_class_${classId}`);
      localStorage.removeItem(`quiz_cards_class_${classId}`);
      localStorage.removeItem(`picked_students_class_${classId}`);
      
      if (activeClassId === classId) {
        handleSwitchClass(updatedClasses[0].id);
      }
    }
  };

  const addStudent = useCallback((name: string) => {
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
    setStudents(prev => [...prev, newStudent]);
  }, [activeClassId]);

  const addStudentDetail = useCallback((fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => {
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
      setStudents(prev => [...prev, newStudent]);
    } else {
      const savedKey = `students_class_${fields.classId}`;
      const savedRaw = localStorage.getItem(savedKey);
      const savedList = savedRaw ? JSON.parse(savedRaw) : [];
      savedList.push(newStudent);
      localStorage.setItem(savedKey, JSON.stringify(savedList));
      alert(`បានរក្សាទុកសិស្ស «${fields.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
    }
  }, [activeClassId]);

  const updateStudentDetail = useCallback((id: string, fields: Partial<Student>) => {
    setStudents(prev => {
      const studentToUpdate = prev.find(s => s.id === id);
      if (!studentToUpdate) return prev;
      
      const newClassId = fields.classId || studentToUpdate.classId || activeClassId;
      const oldClassId = studentToUpdate.classId || activeClassId;
      
      if (newClassId !== oldClassId) {
        // Move to another class
        const filtered = prev.filter(s => s.id !== id);
        const targetKey = `students_class_${newClassId}`;
        const targetRaw = localStorage.getItem(targetKey);
        const targetList = targetRaw ? JSON.parse(targetRaw) : [];
        
        // Remove from target list if already exists (anti-duplication)
        const cleanedList = targetList.filter((s: any) => s.id !== id);
        cleanedList.push({ ...studentToUpdate, ...fields });
        localStorage.setItem(targetKey, JSON.stringify(cleanedList));
        
        alert(`បានផ្លាស់ប្ដូរថ្នាក់សិស្ស «${fields.name || studentToUpdate.name}» ទៅកាន់ថ្នាក់ផ្សេងជោគជ័យ!`);
        return filtered;
      } else {
        return prev.map(s => s.id === id ? { ...s, ...fields } : s);
      }
    });
  }, [activeClassId]);

  const removeStudent = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudentId === id) setSelectedStudentId(null);
  }, [selectedStudentId]);

  const clearStudents = useCallback(() => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះសិស្សទាំងអស់មែនទេ?')) {
      setStudents([]);
      setSelectedStudentId(null);
      setPickedIds([]);
    }
  }, []);

  const handleQuestionsGenerated = useCallback((questions: Question[]) => {
    const newCards: QuizCard[] = questions.map((q, i) => ({
      id: `c-${i}-${Date.now()}`,
      number: i + 1,
      question: q,
      isRevealed: false,
      status: 'idle'
    }));
    setCards(newCards);
  }, []);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!activeCardId || !selectedStudentId) return;

    // Update student score
    setStudents(prev => prev.map(s => {
      if (s.id === selectedStudentId) {
        return { ...s, score: s.score + (correct ? 3 : 0) };
      }
      return s;
    }));

    // Update card status
    setCards(prev => prev.map(c => {
      if (c.id === activeCardId) {
        return { ...c, isRevealed: true, status: correct ? 'correct' : 'wrong' };
      }
      return c;
    }));

    // Add student to picked list so they are not picked again
    setPickedIds(prev => {
      if (prev.includes(selectedStudentId)) return prev;
      return [...prev, selectedStudentId];
    });

    setActiveCardId(null);
  }, [activeCardId, selectedStudentId]);

  const resetMatch = useCallback(() => {
    if (window.confirm('តើអ្នកពិតជាចង់កំណត់ពិន្ទុ និងការបើកសន្លឹកប័ណ្ណឡើងវិញមែនទេ?')) {
      setStudents(prev => prev.map(s => ({ ...s, score: 0 })));
      setCards(prev => prev.map(c => ({ ...c, isRevealed: false, status: 'idle' })));
      setSelectedStudentId(null);
      setPickedIds([]);
      setActiveCardId(null);
    }
  }, []);

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
    if (window.confirm('តើអ្នកពិតជាចង់ចាកចេញពីគណនីគ្រូបង្រៀនមែនទេ?')) {
      localStorage.removeItem('logged_in_teacher');
      setTeacher(null);
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
              <span className="text-indigo-600 dark:text-indigo-400 italic">Khmer Teacher Pro</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-full">EduSpin</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
              {teacher ? `សាលារៀន៖ ${teacher.schoolName}` : 'ប្រព័ន្ធសិក្សាអន្តរកម្មសម្រាប់គ្រូបង្រៀន'}
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
              />
            </aside>

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
              />
            </section>
          </>
        )}

        {activeTab === 'groups' && (
          <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f19]">
            <GroupDivider
              students={students}
              activeClassName={activeClass?.name || 'ថ្នាក់រៀន'}
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
              onBulkAddStudents={(text) => {
                const names = text.split('\n').filter(n => n.trim());
                names.forEach(name => addStudent(name.trim()));
              }}
            />
          </div>
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


