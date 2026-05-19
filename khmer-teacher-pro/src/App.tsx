/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentClassName } from './types';
import { CLASSES } from './constants';
import StudentManager from './components/StudentManager';
import LuckyWheel from './components/LuckyWheel';
import SmartGroup from './components/SmartGroup';
import LoginModal from './components/LoginModal';
import OfflineIndicator from './components/OfflineIndicator';
import ReloadPrompt from './components/ReloadPrompt';
import { useAuth } from './components/AuthContext';
import { useFirestoreSync } from './lib/useFirestoreSync';
import { usePWAInstall } from './lib/usePWAInstall';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Compass, Users, UserCog, Moon, Sun, LogIn, LogOut, Download as InstallIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'spin' | 'group' | 'students';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [localStudents, setLocalStudents] = useState<Student[]>([]);
  const { 
    students: cloudStudents, 
    loading: firestoreLoading,
    addStudent: cloudAdd,
    addStudentsBulk: cloudAddBulk,
    updateStudent: cloudUpdate,
    deleteStudent: cloudDelete
  } = useFirestoreSync(user?.uid);

  const [activeTab, setActiveTab] = useState<Tab>('spin');
  const [currentClass, setCurrentClass] = useState<StudentClassName>(CLASSES[0]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { canInstall, install } = usePWAInstall();

  const students = user ? cloudStudents : localStudents;

  // Load from localStorage (Local mode)
  useEffect(() => {
    if (user) return;
    const saved = localStorage.getItem('khmer_teacher_students');
    if (saved) {
      try {
        setLocalStudents(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load students", e);
      }
    } else {
      // Default sample data
      setLocalStudents([
        { id: '1', name: 'សុខ វិបុល', gender: 'ប្រុស', level: 'ឆ្នើម', className: 'ថ្នាក់ទី៧ក' },
        { id: '2', name: 'ចាន់ថា ស្រីលីន', gender: 'ស្រី', level: 'សកម្ម', className: 'ថ្នាក់ទី៧ក' },
        { id: '3', name: 'កែវ មករា', gender: 'ប្រុស', level: 'អភិវឌ្ឍ', className: 'ថ្នាក់ទី៧ក' },
        { id: '4', name: 'លី ម៉ារីណា', gender: 'ស្រី', level: 'កំពុងរីកចម្រើន', className: 'ថ្នាក់ទី៧ក' },
        { id: '5', name: 'ថុល បញ្ញា', gender: 'ប្រុស', level: 'ឆ្នើម', className: 'ថ្នាក់ទី៧ក' },
        { id: '6', name: 'ម៉ៅ សុភ័ក្ត្រ', gender: 'ស្រី', level: 'សកម្ម', className: 'ថ្នាក់ទី៧ក' },
      ]);
    }
  }, [user]);

  // Save to localStorage (Local mode)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('khmer_teacher_students', JSON.stringify(localStudents));
    }
  }, [localStudents, user]);

  const addStudent = (student: Student) => {
    if (user) cloudAdd(student);
    else setLocalStudents(prev => [...prev, student]);
  };

  const addStudents = (newStudents: Student[]) => {
    if (user) cloudAddBulk(newStudents);
    else setLocalStudents(prev => [...prev, ...newStudents]);
  };

  const updateStudent = (updated: Student) => {
    if (user) cloudUpdate(updated);
    else setLocalStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteStudent = (id: string) => {
    if (user) cloudDelete(id);
    else setLocalStudents(prev => prev.filter(s => s.id !== id));
  };

  const importStudents = (imported: Student[]) => {
    if (user) cloudAddBulk(imported);
    else setLocalStudents(imported);
  };

  const studentsInClass = students.filter(s => s.className === currentClass);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <Compass className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-display hidden sm:block">Khmer Teacher Pro</h1>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <TabButton 
              active={activeTab === 'spin'} 
              onClick={() => setActiveTab('spin')} 
              icon={<Compass className="w-5 h-5" />} 
              label="បង្វិលឈ្មោះ"
              darkMode={isDarkMode}
            />
            <TabButton 
              active={activeTab === 'group'} 
              onClick={() => setActiveTab('group')} 
              icon={<Users className="w-5 h-5" />} 
              label="បែងចែកក្រុម"
              darkMode={isDarkMode}
            />
            <TabButton 
              active={activeTab === 'students'} 
              onClick={() => setActiveTab('students')} 
              icon={<UserCog className="w-5 h-5" />} 
              label="គ្រប់គ្រងសិស្ស"
              darkMode={isDarkMode}
            />
          </nav>

          <div className="flex items-center gap-3">
            {canInstall && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-sm font-bold shadow-lg shadow-emerald-200"
              >
                <InstallIcon className="w-4 h-4" />
                <span className="khmer-text">ដំឡើង App</span>
              </button>
            )}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">សួស្តីគ្រូ</p>
                  <p className="text-xs font-bold text-primary max-w-[100px] truncate">{user.displayName || 'គ្រូបង្រៀន'}</p>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-200"
              >
                <LogIn className="w-4 h-4" />
                <span className="khmer-text hidden md:inline">ចូលប្រើប្រាស់</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Class Selector Bar */}
        {(activeTab === 'spin' || activeTab === 'group') && (
          <div className="flex items-center justify-center gap-2 mb-8 bg-white/40 p-2 rounded-2xl w-fit mx-auto border border-slate-200/50 print:hidden">
            {CLASSES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentClass(c)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentClass === c 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showAuthModal && <LoginModal onClose={() => setShowAuthModal(false)} />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'spin' && (
              <LuckyWheel students={students} currentClass={currentClass} />
            )}

            {activeTab === 'group' && (
              <SmartGroup students={students} currentClass={currentClass} />
            )}

            {activeTab === 'students' && (
              <StudentManager 
                students={students}
                onAddStudent={addStudent}
                onAddStudents={addStudents}
                onUpdateStudent={updateStudent}
                onDeleteStudent={deleteStudent}
                onImport={importStudents}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick Stats Dashboard (Optional, shown in Manage Students too) */}
        {activeTab === 'students' && students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-200">
             <StatCard label="សិស្សសរុប" value={students.length} icon={<Users className="text-primary"/>} />
             <StatCard label="សិស្សស្រី" value={students.filter(s => s.gender === 'ស្រី').length} icon={<Users className="text-pink-400"/>} />
             <StatCard label="ថ្នាក់ទី៧ក" value={students.filter(s => s.className === 'ថ្នាក់ទី៧ក').length} icon={<LayoutDashboard className="text-emerald-400"/>} />
             <StatCard label="ឆ្នើម" value={students.filter(s => s.level === 'ឆ្នើម').length} icon={<LayoutDashboard className="text-amber-400"/>} />
          </div>
        )}
      </main>

      <footer className="py-12 text-center text-slate-400 text-sm print:hidden">
        <p className="khmer-text">Khmer Teacher Pro © 2026 - រចនាឡើងសម្រាប់គ្រូបង្រៀនកម្ពុជា</p>
      </footer>

      <OfflineIndicator />
      <ReloadPrompt />
    </div>
  );
}

function TabButton({ active, onClick, icon, label, darkMode }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; darkMode: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
        active 
          ? (darkMode ? 'bg-slate-800 text-white shadow-lg' : 'bg-primary text-white shadow-lg shadow-primary/20') 
          : (darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-primary hover:bg-primary/5')
      }`}
    >
      {icon}
      <span className="hidden md:inline font-medium khmer-text">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
