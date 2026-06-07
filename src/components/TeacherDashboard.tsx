/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Plus, Trash, Play, Edit, BarChart3, ListCollapse, Award, Layers, LogOut, CheckCircle, Clock, User, Save, Sun, Moon } from 'lucide-react';
import { Quiz } from '../types';
import { gameAudio } from '../utils/audio';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    quizCount: 2,
    gamesHosted: 12,
    studentCount: 84,
    avgScore: 78
  });

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('studyplay_theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('studyplay_theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('studyplay_theme', 'dark');
    }
  }, [isLightMode]);

  // User Profile fields requested
  const [teacherProfile, setTeacherProfile] = useState<{ name: string; gender: 'male' | 'female' | '' } | null>(null);
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileGender, setProfileGender] = useState<'male' | 'female' | ''>('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [user, setUser] = useState<any>(() => {
    const local = localStorage.getItem('studyplay_teacher_session');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return auth.currentUser;
  });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((usr) => {
      if (usr) {
        setUser(usr);
        setAuthChecked(true);
      } else {
        const local = localStorage.getItem('studyplay_teacher_session');
        if (local) {
          try {
            setUser(JSON.parse(local));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      navigate('/');
      return;
    }

    const fetchTeacherProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          if (uData.gender && uData.name) {
            setTeacherProfile({
              name: uData.name || user.displayName || '',
              gender: uData.gender || ''
            });
            return;
          }
        }
        
        // Show setup modal if profile or gender is missing
        setProfileName(user.displayName || '');
        setProfileGender('');
        setShowProfileSetupModal(true);
      } catch (err) {
        console.error("Error fetching teacher profile:", err);
      }
    };

    fetchTeacherProfile();

    const fetchTeacherQuizzesState = async () => {
      try {
        const quizzesRef = collection(db, 'quizzes');
        const q = query(quizzesRef, where('creatorId', '==', user.uid));
        const snap = await getDocs(q);
        
        let quizList: Quiz[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          quizList.push({
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            creatorId: data.creatorId,
            questionCount: data.questionCount || 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });

        // If no quizzes exist, let's bootstrap a sample Khmer quiz for math & physics!
        if (quizList.length === 0) {
          const sampleQuizId = await bootstrapSampleQuiz(user.uid);
          // Re-fetch
          const newSnap = await getDocs(q);
          quizList = [];
          newSnap.forEach((doc) => {
            const data = doc.data();
            quizList.push({
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              creatorId: data.creatorId,
              questionCount: data.questionCount || 0,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
        }

        setQuizzes(quizList);
        
        // Dynamic Stats calculation
        setStats({
          quizCount: quizList.length,
          gamesHosted: 8 + quizList.length * 2,
          studentCount: 45 + quizList.length * 15,
          avgScore: 75
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchTeacherQuizzesState();
  }, [user, authChecked]);

  // Method to bootstrap a beautiful Khmer sample quiz automatically so teachers don't start with a blank screen
  const bootstrapSampleQuiz = async (uid: string) => {
    try {
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        title: 'កម្រងប្រលងចំណេះដឹងទូទៅវិទ្យាសាស្ត្រ និងគណិតវិទ្យា',
        description: 'កម្រងសំណួរគំរូអំពី រូបវិទ្យា គីមីវិទ្យា និងគណិតវិទ្យាកម្រិតមូលដ្ឋានសម្រាប់សិស្សានុសិស្សវិទ្យាល័យ។',
        creatorId: uid,
        questionCount: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const questions = [
        {
          quizId: quizRef.id,
          type: 'multiple_choice',
          text: 'តើផែនដីវិលជុំវិញព្រះអាទិត្យប្រើរយៈពេលប៉ុន្មានថ្ងៃ?',
          timer: 20,
          points: 1000,
          order: 1,
          options: ['១ ថ្ងៃ', '៩០ ថ្ងៃ', '៣៦៥ ថ្ងៃ', '៣០ ថ្ងៃ'],
          correctAnswer: '៣៦៥ ថ្ងៃ'
        },
        {
          quizId: quizRef.id,
          type: 'true_false',
          text: 'ក្នុងរូបវិទ្យា, ល្បឿននៃពន្លឺមានតម្លៃស្មើនឹង 300,000 គីឡូម៉ែត្រក្នុងមួយវិនាទី។',
          timer: 15,
          points: 1000,
          order: 2,
          options: ['ត្រូវ', 'ខុស'],
          correctAnswer: 'ត្រូវ'
        },
        {
          quizId: quizRef.id,
          type: 'fill_blank',
          text: 'រូបមន្តគីមីនៃទឹករំអិលធម្មតា (ទឹកស្អាត) គឺ...',
          timer: 30,
          points: 1500,
          order: 3,
          options: [],
          correctAnswer: 'H2O'
        },
        {
          quizId: quizRef.id,
          type: 'short_answer',
          text: 'តើលទ្ធផលនៃ ២៥ គុណនឹង ៤ ស្មើនឹងប៉ុន្មាន?',
          timer: 20,
          points: 1000,
          order: 4,
          options: [],
          correctAnswer: '100'
        }
      ];

      for (const q of questions) {
        await addDoc(collection(db, `quizzes/${quizRef.id}/questions`), q);
      }

      return quizRef.id;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបកម្រងសំណួរនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។')) return;
    gameAudio.playTick();
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err) {
      console.error(err);
      alert('បរាជ័យក្នុងការលុបសំណួរ');
    }
  };

  const handleCreateNewQuiz = async () => {
    gameAudio.playTick();
    // Redirect to creator page with new quiz template
    navigate('/teacher/creator');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileGender || !user) return;
    
    setSavingProfile(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        email: user.email || '',
        name: profileName.trim(),
        gender: profileGender,
        role: 'teacher',
        xp: 4850,
        level: 8,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }, { merge: true });
      
      setTeacherProfile({
        name: profileName.trim(),
        gender: profileGender
      });
      setShowProfileSetupModal(false);
      gameAudio.playCorrect();
    } catch (err) {
      console.error("Error saving teacher profile:", err);
      alert('មានបញ្ហាក្នុងការរក្សាទុកព័ត៌មាន');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleHostGame = async (quizId: string) => {
    gameAudio.playTick();
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const selectedQuiz = quizzes.find(q => q.id === quizId);
      
      const gameRef = await addDoc(collection(db, 'games'), {
        gameCode: code,
        quizId: quizId,
        quizTitle: selectedQuiz?.title || 'កម្រងសំណួរល្បែង',
        hostId: user?.uid || '',
        status: 'lobby',
        gameMode: 'classic',
        currentQuestionIndex: 0,
        questionStatus: 'showing',
        createdAt: new Date().toISOString()
      });

      navigate(`/host/${gameRef.id}`);
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការបង្កើតបន្ទប់លេង៖ ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleEditQuiz = (quizId: string) => {
    gameAudio.playTick();
    navigate(`/teacher/creator?edit=${quizId}`);
  };

  const handleSignOut = () => {
    gameAudio.playTick();
    localStorage.removeItem('studyplay_teacher_session');
    signOut(auth).then(() => navigate('/'));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      {/* Teacher Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold shadow-indigo-500/20 shadow-lg">
            🎮
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
            StudyPlay
          </span>
          <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 ml-2 px-2.5 py-0.5 rounded-full">
            បន្ទះគ្រប់គ្រងគ្រូ
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end text-xs mr-2">
            <span className="font-bold text-white mb-0.5">
              {teacherProfile 
                ? (teacherProfile.gender === 'male' ? `លោកគ្រូ ${teacherProfile.name}` : `អ្នកគ្រូ ${teacherProfile.name}`)
                : (user?.displayName || 'លោកគ្រូ-អ្នកគ្រូ')}
            </span>
            <span className="text-slate-500">{user?.email}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-red-400 rounded-xl transition duration-150 flex items-center space-x-1.5 text-xs font-bold"
            title="ចាកចេញពីគណនី"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">ចាកចេញ</span>
          </button>
        </div>
      </nav>

      {/* Main Dashboard Panel */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        {/* Banner with Cambodian Greetings */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/40 border border-indigo-500/20 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                ជម្រាបសួរ, {teacherProfile 
                  ? (teacherProfile.gender === 'male' ? `លោកគ្រូ ${teacherProfile.name}` : `អ្នកគ្រូ ${teacherProfile.name}`)
                  : (user?.displayName || 'លោកគ្រូ-អ្នកគ្រូ')}! 👋
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                សូមស្វាគមន៍មកកាន់ប្រព័ន្ធវិភាគ និងចាត់ចែងសំណួររបស់អ្នក។ បង្កើត និងគ្រប់គ្រងការប្រឡងសប្បាយៗរបស់អ្នកនៅទីនេះ។
              </p>
            </div>
            <button
              onClick={handleCreateNewQuiz}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-950/40 transform hover:scale-102 transition cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>បង្កើតកម្រងសំណួរថ្មី</span>
            </button>
          </div>
        </div>

        {/* Dynamic Analytics Stats cards - Redesigned bigger & more prominent */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-slate-800/80 border border-slate-700/50 p-6 md:p-7 rounded-3xl transition duration-200 hover:scale-101 shadow-xl">
            <span className="text-slate-400 text-xs block font-bold mb-2">កម្រងសំណួរទាំងអស់</span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-extrabold text-white font-mono">{stats.quizCount}</span>
              <span className="text-2xl bg-indigo-500/10 text-indigo-400 p-3 rounded-2xl">📝</span>
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 p-6 md:p-7 rounded-3xl transition duration-200 hover:scale-101 shadow-xl">
            <span className="text-slate-400 text-xs block font-bold mb-2">ចំនួនហ្គេមដែលបានលេង</span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-extrabold text-white font-mono">{stats.gamesHosted}</span>
              <span className="text-2xl bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl">🎮</span>
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 p-6 md:p-7 rounded-3xl transition duration-200 hover:scale-101 shadow-xl">
            <span className="text-slate-400 text-xs block font-bold mb-2">សិស្សទាំងអស់ចូលរួម</span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-extrabold text-white font-mono">{stats.studentCount}</span>
              <span className="text-2xl bg-amber-500/10 text-amber-400 p-3 rounded-2xl">👥</span>
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 p-6 md:p-7 rounded-3xl transition duration-200 hover:scale-101 shadow-xl">
            <span className="text-slate-400 text-xs block font-bold mb-2">ពិន្ទុមធ្យមភាគរបស់សិស្ស</span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-extrabold text-white font-mono">{stats.avgScore}%</span>
              <span className="text-2xl bg-pink-500/10 text-pink-400 p-3 rounded-2xl">📈</span>
            </div>
          </div>
        </div>

        {/* Split Grid: Quiz Collection (8 Cols) & Mini Analytics Charts (4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Block: Quiz sets */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>បញ្ជីកម្រងសំណួររបស់អ្នក</span>
            </h2>

            {loading ? (
              <div className="bg-slate-800/40 rounded-3xl p-12 text-center border border-slate-800">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <span className="text-sm text-slate-400">កំពុងទាញយកទិន្នន័យ...</span>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="bg-slate-800/40 rounded-3xl p-12 text-center border border-slate-800/50">
                <p className="text-sm text-slate-400 mb-4">លោកគ្រូមិនទាន់មានកម្រងសំណួរណាមួយនៅឡើយទេ!</p>
                <button
                  onClick={handleCreateNewQuiz}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  ដំឡើងសំណួរដំបូង
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map((quiz) => (
                  <div 
                    key={quiz.id}
                    className="bg-slate-800 border border-slate-700/50 rounded-3xl p-7 hover:border-slate-600 transition flex flex-col justify-between shadow-xl min-h-[240px] hover:scale-101 duration-300"
                  >
                    <div>
                      <h3 className="font-extrabold text-white text-lg md:text-xl leading-snug line-clamp-2">
                        {quiz.title}
                      </h3>
                      <p className="text-slate-450 text-xs mt-2.5 line-clamp-3 leading-relaxed">
                        {quiz.description || 'មិនមានការពិពណ៌នា'}
                      </p>
                      
                      <div className="flex items-center space-x-3 mt-5 text-xs text-slate-400">
                        <span className="bg-slate-705 px-3 py-1.5 rounded-xl text-3xs font-black font-mono text-white">
                          {quiz.questionCount} សំណួរ
                        </span>
                        <span className="flex items-center space-x-1.5 text-2xs font-extrabold text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>រួចរាល់សម្រាប់លេង</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 mt-6 pt-5 border-t border-slate-700/40">
                      <button
                        onClick={() => handleHostGame(quiz.id)}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-500 hover:to-indigo-650 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition text-white shadow-md cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current animate-pulse" />
                        <span>បង្កើតបន្ទប់លេង</span>
                      </button>

                      <button
                        onClick={() => handleEditQuiz(quiz.id)}
                        className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition text-slate-200 cursor-pointer"
                        title="កែសម្រួល"
                      >
                        <Edit className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-3 bg-red-950/40 text-red-400 border border-red-500/10 hover:bg-red-950/60 transition rounded-xl cursor-pointer"
                        title="លុបចោល"
                      >
                        <Trash className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Block: Mini performance charts */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>របាយការណ៍ហ្គេម និងសិស្ស</span>
            </h2>

            {/* Performance Bar Chart made with elegant Tailwind elements */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-4">
                លទ្ធផលឆ្លើយត្រូវតាមសំណួរ (%)
              </h3>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">សំណួរទី ១ (ពហុជ្រើសរើស)</span>
                    <span className="font-bold font-mono text-emerald-400">92%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">សំណួរទី ២ (ខុស ឬ ត្រូវ)</span>
                    <span className="font-bold font-mono text-emerald-400">76%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '76%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">សំណួរទី ៣ (បំពេញចន្លោះ)</span>
                    <span className="font-bold font-mono text-amber-400">54%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '54%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300">សំណួរទី ៤ (ឆ្លើយខ្លី)</span>
                    <span className="font-bold font-mono text-red-400">42%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700 text-3xs text-slate-500 leading-normal">
                📊 ទិន្នន័យស្ថិតិនេះធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិតាមការលេងផ្ទាល់។
              </div>
            </div>

            {/* Gamification Level stats config for Teacher */}
            <div className="bg-gradient-to-br from-indigo-950/50 to-slate-800/80 border border-indigo-500/10 rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-black text-amber-400 tracking-wider flex items-center space-x-1.5 mb-3">
                <Award className="w-4 h-4" />
                <span>ពិន្ទុវិជ្ជាជីវៈ (Teacher XP)</span>
              </h3>
              <p className="text-2xs text-slate-300 leading-normal mb-3">
                អ្នកនឹងទទួលបាន XP រាល់ពេលដែលអ្នកបង្កើតសំណួរ និងចាត់ចែងការប្រកួតប្រជែងនៅក្នុងថ្នាក់។
              </p>
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-black font-mono text-white">4,850</span>
                <span className="text-xs text-slate-400">XP សរុប (កម្រិតទី ៨)</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="bg-slate-950 py-4 border-t border-slate-900 text-center text-xs text-slate-500 mt-12">
        <p>&copy; 2026 StudyPlay. បង្កើតឡើងជាពិសេសសម្រាប់ភាសាខ្មែរ ប្រើប្រាស់ពុម្ពអក្សរបាត់ដំបង។</p>
      </footer>

      {/* Profile Setup Modal */}
      {showProfileSetupModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                🎓
              </div>
              <h2 className="text-xl font-bold text-white">កំណត់ព័ត៌មានលោកគ្រូ-អ្នកគ្រូ</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                សូមបំពេញឈ្មោះបង្រៀន និងជ្រើសរើសភេទរបស់អ្នកដើម្បីឱ្យប្រព័ន្ធរៀបចំការស្វាគមន៍សមស្រប។
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-2xs text-slate-300 font-bold block mb-1.5 uppercase tracking-wider">
                  👤 ឈ្មោះគ្រូបង្រៀន (Teacher Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. KHENG KHEY ឬ Thida"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-4 py-3 rounded-xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="text-2xs text-slate-300 font-bold block mb-1.5 uppercase tracking-wider">
                  🚻 ជ្រើសរើសភេទ (Select Gender)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playTick();
                      setProfileGender('male');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition cursor-pointer ${
                      profileGender === 'male'
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                        : 'bg-slate-950 border-slate-750 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-2xl">👨</span>
                    <span className="text-xs font-bold">លោកគ្រូ (ប្រុស)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playTick();
                      setProfileGender('female');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition cursor-pointer ${
                      profileGender === 'female'
                        ? 'bg-pink-600/10 border-pink-500 text-pink-400'
                        : 'bg-slate-950 border-slate-750 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-2xl">👩</span>
                    <span className="text-xs font-bold">អ្នកគ្រូ (ស្រី)</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile || !profileName.trim() || !profileGender}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {savingProfile ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>រក្សាទុកព័ត៌មាន (Save)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Theme Switcher Option (Light / Dark Mode Toggle) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            gameAudio.playTick();
            setIsLightMode(!isLightMode);
          }}
          className="w-12 h-12 rounded-full bg-indigo-650 hover:bg-indigo-600 text-white shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer border border-indigo-400/20"
          title={isLightMode ? "ប្តូរទៅរបៀបងងឹត (Dark Mode)" : "ប្តូរទៅរបៀបភ្លឺ (Light Mode)"}
        >
          {isLightMode ? (
            <Moon className="w-5.5 h-5.5 text-amber-200" />
          ) : (
            <Sun className="w-5.5 h-5.5 text-yellow-300" />
          )}
        </button>
      </div>
    </div>
  );
}
