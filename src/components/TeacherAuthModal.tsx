import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Key, School, BookOpen, UserPlus, LogIn, CheckCircle } from 'lucide-react';
import { TeacherAccount } from '../types';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: TeacherAccount) => void;
}

export default function TeacherAuthModal({ isOpen, onClose, onLoginSuccess }: TeacherAuthModalProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regSubject, setRegSubject] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset states on change view
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
  }, [isLoginView]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់ឱ្យបានត្រឹមត្រូវ។');
      return;
    }

    const savedAccountsRaw = localStorage.getItem('teacher_accounts_list');
    const accounts: TeacherAccount[] = savedAccountsRaw ? JSON.parse(savedAccountsRaw) : [];

    const found = accounts.find(
      (a) => a.username.toLowerCase() === loginUsername.trim().toLowerCase() && a.password === loginPassword
    );

    if (found) {
      localStorage.setItem('logged_in_teacher', JSON.stringify(found));
      onLoginSuccess(found);
      setSuccessMsg('ការចូលប្រើប្រាស់ជោគជ័យ!');
      setTimeout(() => {
        onClose();
        // Clear forms
        setLoginUsername('');
        setLoginPassword('');
      }, 1000);
    } else {
      setErrorMsg('ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ។ សូមព្យាយាមម្ដងទៀត!');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!regName.trim() || !regSchool.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('សូមបំពេញព័ត៌មានកាតព្វកិច្ច (*) ទាំងអស់ឱ្យបានត្រឹមត្រូវ។');
      return;
    }

    const savedAccountsRaw = localStorage.getItem('teacher_accounts_list');
    const accounts: TeacherAccount[] = savedAccountsRaw ? JSON.parse(savedAccountsRaw) : [];

    // Check pre-existing username
    const usernameExists = accounts.some(
      (a) => a.username.toLowerCase() === regUsername.trim().toLowerCase()
    );

    if (usernameExists) {
      setErrorMsg('ឈ្មោះគណនីនេះមានរួចហើយ។ សូមជ្រើសរើសឈ្មោះគណនីផ្សេង!');
      return;
    }

    const newTeacher: TeacherAccount = {
      id: `t-${Date.now()}`,
      name: regName.trim(),
      schoolName: regSchool.trim(),
      subjects: regSubject.trim(),
      username: regUsername.trim(),
      password: regPassword
    };

    const updated = [...accounts, newTeacher];
    localStorage.setItem('teacher_accounts_list', JSON.stringify(updated));
    localStorage.setItem('logged_in_teacher', JSON.stringify(newTeacher));
    
    onLoginSuccess(newTeacher);
    setSuccessMsg('បង្កើតគណនេយ្យគ្រូបង្រៀនបានជោគជ័យ និងចូលប្រើប្រាស់រួចរាល់!');
    
    setTimeout(() => {
      onClose();
      // Clear forms
      setRegName('');
      setRegSchool('');
      setRegSubject('');
      setRegUsername('');
      setRegPassword('');
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative bg-white text-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 z-10 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  {isLoginView ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isLoginView ? 'ចូលប្រើប្រាស់គណនីគ្រូ' : 'បង្កើតគណនេយ្យគ្រូបង្រៀន'}
                  </h2>
                  <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold">
                    Khmer Teacher Pro Auth
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg text-indigo-100 hover:text-white transition-colors"
                id="close-auth-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Container */}
            <div className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse">
                  <span className="shrink-0 text-red-500">⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <CheckCircle className="shrink-0 text-emerald-500 w-4 h-4" />
                  <p>{successMsg}</p>
                </div>
              )}

              {isLoginView ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      ឈ្មោះគណនីប្រើប្រាស់ *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="ឧ. som_nang123"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      លេខសម្ងាត់ *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    ចូលប្រើប្រាស់ឥឡូវនេះ
                  </button>

                  <div className="text-center mt-6">
                    <p className="text-xs text-slate-500">
                      មិនទាន់មានគណនីមែនទេ?{' '}
                      <button
                        type="button"
                        onClick={() => setIsLoginView(false)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                      >
                        បង្កើតគណនីគ្រូថ្មីនៅទីនេះ
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegister} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      ឈ្មោះគ្រូបង្រៀន *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="ឧ. លោកគ្រូ សុខ ជា"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      ឈ្មោះសាលារៀន *
                    </label>
                    <div className="relative">
                      <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={regSchool}
                        onChange={(e) => setRegSchool(e.target.value)}
                        placeholder="ឧ. វិទ្យាល័យ ហ៊ុន សែន ភ្នំពេញ"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        មុខវិជ្ជា/ឯកទេស
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={regSubject}
                          onChange={(e) => setRegSubject(e.target.value)}
                          placeholder="ឧ. រូបវិទ្យា"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        ឈ្មោះគណនីប្រើប្រាស់ *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="ឧ. sok_cheaS"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      លេខសម្ងាត់សម្រាប់ឡុកអ៊ីន *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="យ៉ាងតិច ៤ តួអក្សរ"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 mt-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    ចុះឈ្មោះគ្រូ និងចូលប្រើ
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-xs text-slate-500">
                      មានគណនីរួចហើយ?{' '}
                      <button
                        type="button"
                        onClick={() => setIsLoginView(true)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                      >
                        ចូលប្រើប្រាស់គណនីដែលមានស្រាប់
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
              រក្សាទុកដោយមានសុវត្ថិភាពខ្ពស់ក្នុងកម្មវិធីរុករករបស់អ្នក (Local Storage)
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
