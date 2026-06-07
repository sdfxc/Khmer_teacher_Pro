/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Sparkles, Trophy, Flame, Award, Play, ChevronRight, User, Settings, Volume2, VolumeX, LogIn, Dumbbell, Sun, Moon, School, BookOpen, Key, UserPlus, Eye, EyeOff, Lock, Landmark } from 'lucide-react';
import { BLOOKS, getLevelFromXP, DAILY_CHALLENGES } from '../utils/gamification';
import { gameAudio } from '../utils/audio';
import AvatarLibrary from './AvatarLibrary';
import AnimalAvatar from './AnimalAvatar';

export default function LandingPage() {
  const navigate = useNavigate();
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

  const { gameCode: urlGameCode } = useParams<{ gameCode?: string }>();
  const [searchParams] = useSearchParams();
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Student Local Stats
  const [studentXp, setStudentXp] = useState(0);
  const [studentStreak, setStudentStreak] = useState(0);
  const [studentBlook, setStudentBlook] = useState('turtle');
  const [studentName, setStudentName] = useState('');
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(gameAudio.isSoundEnabled());

  // Teacher Authentication State
  const [user, setUser] = useState<any>(() => {
    const local = localStorage.getItem('studyplay_teacher_session');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return auth.currentUser;
  });

  // Teacher Custom Authentication Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authSchoolName, setAuthSchoolName] = useState('');
  const [authSubject, setAuthSubject] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const encodeUsernameToId = (username: string): string => {
    const clean = username.trim().toLowerCase();
    const encoder = new TextEncoder();
    const bytes = encoder.encode(clean);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  };

  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    gameAudio.playTick();
    setAuthError('');
    if (!authUsername.trim() || !authPassword) {
      setAuthError('សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់ឱ្យបានត្រឹមត្រូវ!');
      return;
    }
    setAuthLoading(true);
    try {
      const cleanUname = authUsername.trim();
      let uNameKey = encodeUsernameToId(cleanUname);
      let teacherDocRef = doc(db, 'teachers', uNameKey);
      let docSnap = await getDoc(teacherDocRef);
      
      if (!docSnap.exists()) {
        // Fallback for older literal lowercase usernames
        const legacyKey = cleanUname.toLowerCase();
        if (/^[a-zA-Z0-9_\-]+$/.test(legacyKey)) {
          const legacyDocRef = doc(db, 'teachers', legacyKey);
          const legacySnap = await getDoc(legacyDocRef);
          if (legacySnap.exists()) {
            uNameKey = legacyKey;
            teacherDocRef = legacyDocRef;
            docSnap = legacySnap;
          } else {
            setAuthError('រកមិនឃើញគណនីប្រើប្រាស់នេះឡើយ!');
            setAuthLoading(false);
            return;
          }
        } else {
          setAuthError('រកមិនឃើញគណនីប្រើប្រាស់នេះឡើយ!');
          setAuthLoading(false);
          return;
        }
      }
      
      const data = docSnap.data();
      if (data.password !== authPassword) {
        setAuthError('លេខសម្ងាត់របស់អ្នកមិនត្រឹមត្រូវឡើយ!');
        setAuthLoading(false);
        return;
      }
      const session = {
        uid: uNameKey,
        displayName: data.name,
        schoolName: data.schoolName || '',
        subject: data.subject || '',
        isCustom: true
      };
      localStorage.setItem('studyplay_teacher_session', JSON.stringify(session));
      setUser(session);
      setShowAuthModal(false);
      navigate('/teacher');
    } catch (err: any) {
      console.error(err);
      setAuthError('កំហុស៖ ' + (err.message || 'មានបញ្ហាក្នុងការតភ្ជាប់ទិន្នន័យ។'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLocalSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    gameAudio.playTick();
    setAuthError('');
    if (!authUsername.trim() || !authPassword || !authName.trim() || !authSchoolName.trim()) {
      setAuthError('សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់!');
      return;
    }
    if (authPassword.length < 4) {
      setAuthError('លេខសម្ងាត់ត្រូវមានយ៉ាងតិច 4 អក្សរ!');
      return;
    }
    setAuthLoading(true);
    try {
      const uNameKey = encodeUsernameToId(authUsername);
      
      const teacherDocRef = doc(db, 'teachers', uNameKey);
      const docSnap = await getDoc(teacherDocRef);
      if (docSnap.exists()) {
        setAuthError('ឈ្មោះគណនីប្រើប្រាស់នេះត្រូវបានចុះឈ្មោះរួចហើយ!');
        setAuthLoading(false);
        return;
      }

      // Create custom teacher user credentials
      const docData = {
        username: authUsername.trim(),
        password: authPassword,
        name: authName.trim(),
        schoolName: authSchoolName.trim(),
        subject: authSubject.trim(),
        createdAt: new Date().toISOString()
      };
      await setDoc(teacherDocRef, docData);

      // Create a compatible document under 'users' collection too
      const userDocRef = doc(db, 'users', uNameKey);
      await setDoc(userDocRef, {
        name: authName.trim(),
        gender: '',
        schoolName: authSchoolName.trim(),
        subject: authSubject.trim()
      });

      const session = {
        uid: uNameKey,
        displayName: authName.trim(),
        schoolName: authSchoolName.trim(),
        subject: authSubject.trim(),
        isCustom: true
      };
      localStorage.setItem('studyplay_teacher_session', JSON.stringify(session));
      setUser(session);
      setShowAuthModal(false);
      navigate('/teacher');
    } catch (err: any) {
      console.error(err);
      setAuthError('កំហុសចុះឈ្មោះ៖ ' + (err.message || 'មានបញ្ហាចុះឈ្មោះគណនេយ្យថ្មី'));
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // Listen for Auth changes
    const unsub = auth.onAuthStateChanged((usr) => {
      if (usr) {
        setUser(usr);
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
      }
    });

    // Load Student Stats from LocalStorage
    const localXp = localStorage.getItem('studyplay_xp');
    if (localXp) setStudentXp(parseInt(localXp, 10));

    const localStreak = localStorage.getItem('studyplay_streak');
    if (localStreak) setStudentStreak(parseInt(localStreak, 10));

    const localBlook = localStorage.getItem('studyplay_blook');
    if (localBlook) setStudentBlook(localBlook);

    const localName = localStorage.getItem('studyplay_student_name');
    if (localName) {
      setStudentName(localName);
      setNickname(localName);
    }

    const localBadges = localStorage.getItem('studyplay_badges');
    if (localBadges) setUnlockedBadges(JSON.parse(localBadges));

    const handleStorageChange = () => {
      const b = localStorage.getItem('studyplay_blook');
      if (b) setStudentBlook(b);
      const xp = localStorage.getItem('studyplay_xp');
      if (xp) setStudentXp(parseInt(xp, 10));
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const code = urlGameCode || searchParams.get('code');
    if (code) {
      setGameCode(code.toUpperCase());
    }
  }, [urlGameCode, searchParams]);

  const handleToggleSound = () => {
    const nextVal = gameAudio.toggleSound();
    setAudioEnabled(nextVal);
    gameAudio.playTick();
  };

  const handleTeacherLogin = async () => {
    gameAudio.playTick();
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      navigate('/teacher');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('បរាជ័យក្នុងការចូលប្រព័ន្ធជាមួយ Google');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    gameAudio.playTick();
    setErrorMsg('');
    
    if (!gameCode.trim()) {
      setErrorMsg('សូមបញ្ចូលលេខកូដហ្គេម!');
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះហៅក្រៅរបស់អ្នក!');
      return;
    }

    setLoading(true);
    try {
      // Find active game room with matching gameCode
      const roomsRef = collection(db, 'games');
      const q = query(roomsRef, where('gameCode', '==', gameCode.trim().toUpperCase()), where('status', '==', 'lobby'), limit(1));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        // Try searching playing room in case game started
        const qPlaying = query(roomsRef, where('gameCode', '==', gameCode.trim().toUpperCase()), limit(1));
        const playingSnap = await getDocs(qPlaying);
        if (playingSnap.empty) {
          setErrorMsg('រកមិនឃើញបន្ទប់លេងជាមួយកូដនេះ ឬហ្គេមត្រូវបានបញ្ចប់!');
          setLoading(false);
          return;
        } else {
          setErrorMsg('ហ្គេមបានចាប់ផ្តើមរួចហើយ មិនអាចចូលរួមពេលកំពុងលេងបានទេ!');
          setLoading(false);
          return;
        }
      }

      const gameDoc = querySnap.docs[0];
      const gameData = gameDoc.data();

      // Store nickname locally for quick load
      localStorage.setItem('studyplay_student_name', nickname.trim());
      localStorage.setItem('studyplay_blook', studentBlook);

      // Navigate to student play lobby
      navigate(`/game/${gameDoc.id}?role=student&name=${encodeURIComponent(nickname.trim())}&blook=${studentBlook}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('មានបញ្ហាក្នុងការភ្ជាប់ទៅហ្គេម');
    } finally {
      setLoading(false);
    }
  };

  // Gamification stats
  const { level, currentLevelXp, nextLevelXp, progress } = getLevelFromXP(studentXp);
  const currentBlook = BLOOKS.find(b => b.id === studentBlook) || BLOOKS[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold shadow-indigo-500/20 shadow-lg">
            🎮
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
            StudyPlay
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sound Toggle */}
          <button 
            onClick={handleToggleSound}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition duration-150 cursor-pointer"
            title="បិទ/បើកសម្លេង"
            id="sound-toggle-btn"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => {
              gameAudio.playTick();
              setIsLightMode(!isLightMode);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition duration-150 cursor-pointer text-indigo-400"
            title={isLightMode ? "ប្តូរទៅរបៀបងងឹត (Dark Mode)" : "ប្តូរទៅរបៀបភ្លឺ (Light Mode)"}
            id="theme-toggle-btn-landing"
          >
            {isLightMode ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-yellow-450" />}
          </button>

          {user ? (
            <button
              onClick={() => navigate('/teacher')}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 font-bold px-4 py-2 rounded-xl transition text-sm cursor-pointer"
              id="dashboard-nav-btn"
            >
              <span>បន្ទះគ្រប់គ្រង</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                gameAudio.playTick();
                setAuthError('');
                setShowAuthModal(true);
              }}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 font-bold px-4 py-2 rounded-xl transition text-sm cursor-pointer"
              id="teacher-login-btn"
            >
              <LogIn className="w-4 h-4" />
              <span>គ្រូបង្រៀន ចូលប្រព័ន្ធ</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        
        {/* Left Column: Hero & Intro */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ល្បែងសិក្សាកម្សាន្តឥតកំណត់</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black leading-tight text-white font-sans tracking-tight">
            រៀនបណ្តើរ លេងបណ្តើរ <br />
            បង្កើតភាព <span className="bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">អស្ចារ្យតាមថ្នាក់រៀន!</span>
          </h1>

          <p className="text-slate-400 leading-relaxed text-sm md:text-base max-w-lg">
            ស្វាគមន៍មកកាន់ <strong className="text-white">StudyPlay</strong>! វេទិកាបង្កើត និងលេងល្បែងឆ្លើយសំណួរអប់រំដ៏សប្បាយរីករាយ។ ល្បឿនលឿន ប្រកួតប្រជែងគ្នា និងទទួលបានពិន្ទុភ្លាមៗ ជាមួយរូបតំណាងសត្វទេវកថាខ្មែរ (Blooks) ដ៏គួរឱ្យស្រលាញ់។
          </p>

          {/* Student Profile Card (LocalStorage Powered) */}
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 max-w-lg shadow-xl shadow-slate-950/20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-slate-900 border border-slate-700/65 rounded-xl flex items-center justify-center shadow-lg p-1 shrink-0 overflow-hidden">
                <AnimalAvatar id={studentBlook} size={48} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">
                    {studentName || 'យុទ្ធជន StudyPlay'} (កម្រិត {level})
                  </span>
                  <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-amber-400 flex items-center space-x-1 font-mono">
                    <Flame className="w-3 h-3 text-red-500" />
                    <span>{studentStreak} ថ្ងៃ</span>
                  </span>
                </div>
                {/* Level Progress */}
                <div className="mt-2">
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-2xs text-slate-500 mt-1 font-mono">
                    <span>{studentXp} XP </span>
                    <span>ជំហានបន្ទាប់៖ {nextLevelXp} XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar Selector */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <span className="text-2xs text-slate-400 block mb-2">ជ្រើសរើសតំណាងសត្វចាប់ផ្តើម (Starter Blooks)៖</span>
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                {['turtle', 'chicken', 'duck', 'cow', 'hamster', 'cat', 'dog', 'rabbit', 'frog'].map((bid) => (
                  <button
                    key={bid}
                    onClick={() => {
                      gameAudio.playTick();
                      setStudentBlook(bid);
                      localStorage.setItem('studyplay_blook', bid);
                    }}
                    className={`flex-shrink-0 w-10 h-10 bg-slate-900 border rounded-xl flex items-center justify-center p-1 transition-all duration-100 cursor-pointer ${
                      studentBlook === bid ? 'scale-110 border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-750 opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <AnimalAvatar id={bid} size={28} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Student Join Box */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <div className="bg-gradient-to-b from-indigo-900/40 to-slate-800/80 border border-indigo-500/20 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <h2 className="text-2xl font-black text-white text-center mb-6 flex items-center justify-center space-x-2">
              <span>🎮 លេងភ្លាមៗ</span>
            </h2>

            {errorMsg && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-center text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1.5">🔑 លេខកូដហ្គេម (PIN)</label>
                <input
                  type="text"
                  placeholder="ឧ. AB1234"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-white text-center font-bold text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1.5">👤 ឈ្មោះហៅក្រៅ (Nickname)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="បញ្ចូលឈ្មោះលេងរបស់អ្នក"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 py-3.5 px-4 rounded-xl text-white text-center font-bold text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-900/30 font-sans tracking-wide text-center uppercase transition duration-150 flex items-center justify-center space-x-2 cursor-pointer"
                id="student-join-submit-btn"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>ចូលរួមលេងឥឡូវនេះ</span>
                  </>
                )}
              </button>
            </form>

            {/* Daily Challenges */}
            <div className="mt-6 pt-5 border-t border-slate-700/60">
              <h3 className="text-xs font-black text-amber-400 tracking-wider flex items-center space-x-2.5 mb-3">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>បេសកកម្មប្រចាំថ្ងៃ (Daily Challenge)</span>
              </h3>
              <div className="space-y-2">
                {DAILY_CHALLENGES.map((challenge, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-slate-900/50 p-2 rounded-xl text-2xs border border-slate-800/80">
                    <span className="text-sm">{challenge.icon}</span>
                    <span className="text-slate-300 flex-1">{challenge.task}</span>
                    <span className="text-emerald-400 font-mono font-bold">+{challenge.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Avatar Encyclopedia Library Section */}
      <section className="bg-slate-950/60 border-t border-slate-850 py-12 px-6 max-w-7xl mx-auto w-full rounded-t-[2.5rem] shadow-inner mt-6">
        <AvatarLibrary />
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>&copy; 2026 StudyPlay. បង្កើតឡើងជាពិសេសសម្រាប់ភាសាខ្មែរ ប្រើប្រាស់ពុម្ពអក្សរបាត់ដំបង។</p>
      </footer>

      {/* TEACHER CUSTOM CREDENTIAL AUTHENTICATION FLOW MODAL (100% 1:1 MATCHING USER CAPTURES) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden transition-all duration-300 max-h-[92vh] flex flex-col">
            
            {/* Header Block with Solid Blue Color Accents */}
            <div className="bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between text-white relative">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl shadow-inner">
                  {authTab === 'login' ? (
                    <LogIn className="w-6 h-6 text-white" />
                  ) : (
                    <UserPlus className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-base md:text-lg font-black tracking-wide text-white font-sans">
                    {authTab === 'login' ? 'ចូលប្រើប្រាស់គណនីគ្រូ' : 'បង្កើតគណនេយ្យគ្រូបង្រៀន'}
                  </h3>
                  <p className="text-[10px] md:text-2xs font-extrabold tracking-widest text-indigo-200/90 uppercase font-sans">
                    TEACHER EDUSPIN AUTH
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  gameAudio.playTick();
                  setShowAuthModal(false);
                  setAuthError('');
                }}
                className="text-white/80 hover:text-white transition cursor-pointer p-1.5 hover:bg-white/10 rounded-full"
                title="បិទ"
              >
                <LogIn className="w-5 h-5 rotate-180" />
              </button>
            </div>

            {/* Modal Body Container with Light Slate White Backings */}
            <div className="bg-white p-6 md:p-8 space-y-5 overflow-y-auto flex-1 text-slate-700">
              {/* Authenticator Error Banner Component */}
              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs text-center font-bold animate-pulse duration-1000">
                  ⚠️ {authError}
                </div>
              )}

              <form
                onSubmit={authTab === 'login' ? handleLocalSignIn : handleLocalSignUp}
                className="space-y-4"
              >
                {authTab === 'register' ? (
                  <>
                    {/* TEACHER NAME FIELD */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-bold block ml-1">
                        ឈ្មោះគ្រូបង្រៀន *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                        <input
                          type="text"
                          placeholder="ឧ.លោកគ្រូ ស្ទីវ ចប"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150"
                        />
                      </div>
                    </div>

                    {/* SCHOOL NAME FIELD */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-bold block ml-1">
                        ឈ្មោះសាលារៀន *
                      </label>
                      <div className="relative">
                        <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                        <input
                          type="text"
                          placeholder="ឧ. សាលារៀនសុវណ្ណភូមិ សាខាផ្សារដីហុយ"
                          value={authSchoolName}
                          onChange={(e) => setAuthSchoolName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150"
                        />
                      </div>
                    </div>

                    {/* TWO COLUMN ROW FOR SPECIALTY AND USERNAME */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SPECIALTY / SUBJECT */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600 font-bold block ml-1">
                          មុខវិជ្ជា/ឯកទេស
                        </label>
                        <div className="relative">
                          <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                          <input
                            type="text"
                            placeholder="ឧ. រូបវិទ្យា"
                            value={authSubject}
                            onChange={(e) => setAuthSubject(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150"
                          />
                        </div>
                      </div>

                      {/* USERNAME */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600 font-bold block ml-1">
                          ឈ្មោះគណនីប្រើប្រាស់ *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                          <input
                            type="text"
                            placeholder="ឧ. steve_123"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-bold block ml-1">
                        លេខសម្ងាត់សម្រាប់ឡុកអុីន *
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="យ៉ាងតិច 4 អក្សរ"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-12 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            gameAudio.playTick();
                            setShowPassword(!showPassword);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl select-none cursor-pointer focus:outline-none p-1"
                        >
                          {showPassword ? '🙊' : '🙈'}
                        </button>
                      </div>
                    </div>

                    {/* REGISTRATION ACTION SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-4 mt-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {authLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <span>👤+</span>
                          <span>ចុះឈ្មោះគ្រូ និងចូលប្រើ</span>
                        </span>
                      )}
                    </button>
                    
                    {/* Alternate Link to switch to login */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          gameAudio.playTick();
                          setAuthTab('login');
                          setAuthError('');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition font-sans"
                      >
                        មានគណនីរួចហើយ? <span className="underline">ចូលប្រើប្រាស់គណនីដែលមានស្រាប់</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* USERNAME */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-bold block ml-1 font-sans">
                        ឈ្មោះគណនីប្រើប្រាស់ *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                        <input
                          type="text"
                          placeholder="ឧ. steve_123"
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150"
                        />
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-bold block ml-1 font-sans">
                        លេខសម្ងាត់ *
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-3.5 pl-11 pr-12 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition duration-150 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            gameAudio.playTick();
                            setShowPassword(!showPassword);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl select-none cursor-pointer focus:outline-none p-1"
                        >
                          {showPassword ? '🙊' : '🙈'}
                        </button>
                      </div>
                    </div>

                    {/* LOGIN ACTION SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-4 mt-2.5 bg-blue-600 hover:bg-indigo-650 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/20 hover:shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {authLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <span>➡</span>
                          <span>ចូលប្រើប្រាស់ឥឡូវនេះ</span>
                        </span>
                      )}
                    </button>

                    {/* Alternate Link to switch to register */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          gameAudio.playTick();
                          setAuthTab('register');
                          setAuthError('');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition font-sans"
                      >
                        មិនទាន់មានគណនីមែនទេ? <span className="underline font-extrabold text-indigo-700 font-sans">បង្កើតគណនីគ្រូថ្មីនៅទីនេះ</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Bottom Gray Safe Banner matching layout specification */}
            <div className="bg-slate-50 border-t border-slate-100 py-3.5 px-4 text-center text-slate-400 select-none">
              <p className="text-[10px] md:text-3xs font-bold leading-normal tracking-wide">
                រក្សាទុកដោយមានសុវត្ថិភាពខ្ពស់នៅលើ Cloud Internet សម្រាប់គ្រប់ឧបករណ៍ទាំងអស់
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
