import React, { useState, useEffect } from 'react';
import { 
  Award, Trophy, Smartphone, Sparkles, User, RefreshCw, CheckCircle2, 
  XCircle, Timer, AlertCircle, HelpCircle, ArrowRight, Heart
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, doc, getDoc, setDoc, onSnapshot, collection, getDocs, isFirebasePlaceholder } from '../lib/firebase';
import { Student, QuizCard, Question } from '../types';
import confetti from 'canvas-confetti';
import FormulaRenderer from './FormulaRenderer';

export default function StudentPlayView() {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId') || '';
  const teacherId = urlParams.get('teacherId') || '';

  const [studentId, setStudentId] = useState<string | null>(() => {
    return localStorage.getItem(`my_student_id_${classId}`) || null;
  });

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🧑‍🎓');
  const [joinedStudent, setJoinedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live game/class state
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardState, setActiveCardState] = useState<'answering' | 'revealed'>('answering');
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(100);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  // Local play state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentCard, setCurrentCard] = useState<QuizCard | null>(null);
  const [answeredState, setAnsweredState] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [localTimeLeft, setLocalTimeLeft] = useState(25);

  const emojisList = ["🧑‍🎓", "🦊", "🦁", "🐼", "🐨", "🦄", "👑", "🚀", "⚡", "🔥", "⚽", "⭐", "🎉", "👾", "🦊", "🐻", "🐝", "🐙", "💎", "🎯"];

  // Chime Sound synthesizers
  const playChime = (correct: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (correct) {
        // High melody chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Buzz sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (err) {
      console.warn('Audio blocked');
    }
  };

  // 1. Snapshot Live Class & Active Card metadata
  useEffect(() => {
    if (!classId || !teacherId) return;

    const classDocRef = doc(db, 'teachers', teacherId, 'classes', classId);
    const unsubscribe = onSnapshot(classDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setChapters(data.chapters || []);
        setActiveRoomId(data.activeRoomId || null);
        setActiveCardId(data.activeCardId || null);
        setActiveCardState(data.activeCardState || 'answering');
        if (typeof data.pointsPerQuestion === 'number') {
          setPointsPerQuestion(data.pointsPerQuestion);
        }
      }
    }, (err) => {
      console.error("Live Class snapshot failed:", err);
    });

    return () => unsubscribe();
  }, [classId, teacherId]);

  // 2. Snapshot Live-Connected Student List (to find classroom rankings!)
  useEffect(() => {
    if (!classId || !teacherId) return;

    const studentsCollRef = collection(db, 'teachers', teacherId, 'classes', classId, 'students');
    const unsubscribe = onSnapshot(studentsCollRef, (snapshot) => {
      let roster: Student[] = [];
      snapshot.forEach(docSnap => {
        roster.push(docSnap.data() as Student);
      });
      setAllStudents(roster);
      
      // Sync joined student stats
      if (studentId) {
        const found = roster.find(s => s.id === studentId);
        if (found) {
          setJoinedStudent(found);
        }
      }
    });

    return () => unsubscribe();
  }, [classId, teacherId, studentId]);

  // 3. Sync Active Question and Options
  useEffect(() => {
    if (!activeCardId || chapters.length === 0) {
      setCurrentQuestion(null);
      setCurrentCard(null);
      setAnsweredState(null);
      setSelectedOption(null);
      setPointsEarned(0);
      setLocalTimeLeft(25);
      return;
    }

    // Locate card from active room inside chapters
    let targetCard: QuizCard | null = null;
    for (const ch of chapters) {
      const room = ch.rooms?.find((r: any) => r.id === activeRoomId);
      if (room) {
        const card = room.cards?.find((c: any) => c.id === activeCardId);
        if (card) {
          targetCard = card;
          break;
        }
      }
    }

    if (targetCard && targetCard.question) {
      setCurrentCard(targetCard);
      setCurrentQuestion(targetCard.question);
      
      // Load previous answered status for this card from localStorage to prevent duplicate submissions
      const savedAnswer = localStorage.getItem(`answered_${classId}_${activeCardId}`);
      if (savedAnswer) {
        const parsed = JSON.parse(savedAnswer);
        setAnsweredState(parsed.state);
        setSelectedOption(parsed.option);
        setPointsEarned(parsed.points || 0);
      } else {
        setAnsweredState(null);
        setSelectedOption(null);
        setPointsEarned(0);
        setLocalTimeLeft(25);
      }
    }
  }, [activeCardId, chapters, activeRoomId, classId]);

  // 4. Timer Countdown effect
  useEffect(() => {
    if (!currentQuestion || answeredState !== null) return;

    const timer = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Handle timeout!
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, answeredState]);

  // 5. Watch for teacher-triggered activeCardState === 'revealed' to force timeout/submission
  useEffect(() => {
    if (activeCardState === 'revealed' && answeredState === null && currentQuestion) {
      handleTimeout();
    }
  }, [activeCardState, answeredState, currentQuestion]);

  const handleTimeout = async () => {
    if (answeredState !== null || !studentId || !joinedStudent || !activeCardId) return;
    
    setAnsweredState('timeout');
    playChime(false);

    const answerPayload = {
      state: 'timeout',
      option: null,
      points: 0
    };
    localStorage.setItem(`answered_${classId}_${activeCardId}`, JSON.stringify(answerPayload));
    
    // Set status and answer values on cloud
    try {
      await setDoc(doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId), {
        status: 'កំពុងរីកចម្រើន',
        currentAnswerCardId: activeCardId,
        currentAnswerIndex: -1,
        currentAnswerIsCorrect: false
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOption = async (optIndex: number) => {
    if (!currentQuestion || answeredState !== null || !studentId || !joinedStudent || !activeCardId || activeCardState === 'revealed') return;

    const isCorrect = optIndex === currentQuestion.correctIndex;
    setSelectedOption(optIndex);
    
    let calculatedPoints = 0;
    if (isCorrect) {
      calculatedPoints = pointsPerQuestion;
      setPointsEarned(calculatedPoints);
      setAnsweredState('correct');
      playChime(true);
      
      // Local burst
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 }
      });
    } else {
      setPointsEarned(0);
      setAnsweredState('wrong');
      playChime(false);
    }

    const answerPayload = {
      state: isCorrect ? 'correct' : 'wrong',
      option: optIndex,
      points: calculatedPoints
    };
    localStorage.setItem(`answered_${classId}_${activeCardId}`, JSON.stringify(answerPayload));

    // Update student's score & active answer state in firestore subcollection
    try {
      const nextScore = (joinedStudent.score || 0) + calculatedPoints;
      await setDoc(doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId), {
        score: nextScore,
        status: isCorrect ? 'ឆ្នើម' : 'កំពុងរីកចម្រើន',
        currentAnswerCardId: activeCardId,
        currentAnswerIndex: optIndex,
        currentAnswerIsCorrect: isCorrect
      }, { merge: true });
    } catch (err) {
      console.error("Firestore score update failed:", err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // Check if student with this name already exists in the classroom to load their score!
      const stdColl = collection(db, 'teachers', teacherId, 'classes', classId, 'students');
      const stdSnap = await getDocs(stdColl);
      
      let matchedStudent: Student | null = null;
      stdSnap.forEach(snap => {
        const dat = snap.data() as Student;
        if (dat.name?.trim().toLowerCase() === name.trim().toLowerCase()) {
          matchedStudent = dat;
        }
      });

      if (matchedStudent) {
        // Name already registered - log them in as this existing profile!
        const extId = (matchedStudent as Student).id;
        localStorage.setItem(`my_student_id_${classId}`, extId);
        setStudentId(extId);
        setJoinedStudent(matchedStudent);
      } else {
        // Create a new customized student profile
        const newId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newStud: Student = {
          id: newId,
          name: name.trim(),
          score: 0,
          emoji: selectedEmoji,
          gender: 'ប្រុស',
          status: 'សកម្ម',
          isApproved: false
        };

        const docRef = doc(db, 'teachers', teacherId, 'classes', classId, 'students', newId);
        await setDoc(docRef, newStud);

        localStorage.setItem(`my_student_id_${classId}`, newId);
        setStudentId(newId);
        setJoinedStudent(newStud);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('បរាជ័យក្នុងការចូលរួមបន្ទប់។ (Error joining classroom)');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Rank standing
  const currentRank = [...allStudents]
    .sort((a,b) => b.score - a.score)
    .findIndex(s => s.id === studentId) + 1;

  if (!classId || !teacherId) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
        <Smartphone className="w-16 h-16 text-red-400 mb-4 animate-bounce" />
        <h3 className="text-xl font-black text-white">តំណភ្ជាប់មិនត្រឹមត្រូវ (Invalid Join link)</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 font-semibold">
          សូមទាក់ទងលោកគ្រូ-អ្នកគ្រូរបស់អ្នក ដើម្បីសុំ QR Code ឬ Copy Link សម្រាប់តភ្ជាប់ចូលរួមឆ្លើយសំណួរម្ដងទៀត!
        </p>
      </div>
    );
  }

  // Registration/Sign-up View
  if (!studentId || !joinedStudent) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        <form onSubmit={handleRegister} className="w-full max-w-sm bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border-2 border-indigo-500/30 flex items-center justify-center text-3xl">
              🦁
            </div>
            <h3 className="text-xl font-black text-white">ចុះឈ្មោះចូលបន្ទប់ live</h3>
            <p className="text-[10px] uppercase font-black tracking-wider text-indigo-400">Smart student response cell</p>
          </div>

          {isFirebasePlaceholder && (
            <div className="p-3.5 bg-amber-500/10 border border-solid border-amber-500/25 rounded-2xl text-[11px] leading-relaxed text-amber-400 font-bold text-left">
              💡 <strong className="text-amber-300">សាកល្បងរហ័ស (Local Test Mode)៖</strong> ចុច JOIN PLAY ដើម្បីសាកល្បងភ្លាមៗ! បើក Tab ថ្មីលើ browser នេះដើម្បីមើលអេក្រង់សិស្ស និងអេក្រង់គ្រូជាមួយគ្នា។ លោកគ្រូ-អ្នកគ្រូក៏អាចចុច <strong className="text-indigo-400 text-xs">"Setup Firebase"</strong> នៅផ្នែកខាងលើ AI Studio ដើម្បីភ្ជាប់ទូរស័ព្ទពិតៗ។
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-400">ឈ្មោះរបស់អ្នក (Your Name in Khmer)៖</label>
            <input 
              type="text" 
              required
              placeholder="វាយបញ្ចូលឈ្មោះ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-2xl text-sm text-slate-100 outline-none transition-all font-black"
            />
          </div>

          {/* Avatar Field */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-black text-slate-400 flex justify-between">
              <span>ជ្រើសរើសរូបតំណាង (Choose Emoji)៖</span>
              <span className="text-indigo-400 font-mono font-black">{selectedEmoji}</span>
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-[110px] overflow-y-auto p-1 custom-scrollbar">
              {emojisList.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={`py-2 text-xl rounded-xl transition-all cursor-pointer border-none select-none ${
                    selectedEmoji === em 
                      ? 'bg-indigo-600 shadow-md scale-105' 
                      : 'bg-slate-950/40 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl select-none cursor-pointer transition-all border-none flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            <span>ចូលរួមបន្ទប់លេង (JOIN PLAY)</span>
          </button>
        </form>
      </div>
    );
  }

  // Waiting for Approval state
  if (studentId && joinedStudent && joinedStudent.isApproved === false && !joinedStudent.isDeclined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-indigo-600/10 border-2 border-indigo-500/20 rounded-[2rem] flex items-center justify-center text-3xl mx-auto animate-pulse">
              {joinedStudent.emoji || "🧑‍🎓"}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-white font-extrabold animate-bounce">
              ⏳
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">{joinedStudent.name}</h3>
            <p className="text-xs text-amber-400 font-bold bg-amber-500/10 px-4 py-2 rounded-full inline-block border border-amber-500/20">
              កំពុងរង់ចាំគ្រូអនុញ្ញាតចូលលេង...
            </p>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mt-2">
              (Waiting for teacher approval to join)
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl text-left text-xs border border-slate-900/80 leading-relaxed font-semibold text-slate-300">
            👋 សូមរង់ចាំលោកគ្រូ-អ្នកគ្រូអនុញ្ញាត! ឈ្មោះរបស់អ្នកត្រូវបានបញ្ចូលទៅកាន់បញ្ជីស្នើសុំរបស់លោកគ្រូ-អ្នកគ្រូហើយ។ នៅពេលលោកគ្រូ-អ្នកគ្រូចុច "អនុញ្ញាត" អ្នកនឹងអាចចូលរួមលេង Quiz ជាមួយមិត្តភក្តិភ្លាមៗ។
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                localStorage.removeItem(`my_student_id_${classId}`);
                setStudentId(null);
                setJoinedStudent(null);
              } catch (err) {
                console.error(err);
              }
            }}
            className="w-full py-3 bg-red-650 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer select-none border-none text-center"
          >
            បោះបង់ ឬចុះឈ្មោះឡើងវិញ (Cancel or Re-register)
          </button>
        </div>
      </div>
    );
  }

  if (studentId && joinedStudent && joinedStudent.isDeclined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-sm bg-slate-900/40 border border-red-900/30 p-8 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-red-600/10 border-2 border-red-500/20 rounded-[2rem] flex items-center justify-center text-3xl mx-auto animate-pulse">
              ❌
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">{joinedStudent.name}</h3>
            <p className="text-xs text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-full inline-block border border-red-500/20">
              ការស្នើសុំត្រូវបានបដិសេធ (Request Declined)
            </p>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mt-2">
              (The teacher declined your join request)
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl text-left text-xs border border-red-950/50 leading-relaxed font-semibold text-slate-350">
            សុំទោសលោកគ្រូ-អ្នកគ្រូបានបដិសេធការស្នើសុំចូលរួមលេងរបស់អ្នក។ សូមព្យាយាមចុះឈ្មោះម្តងទៀតជាមួយឈ្មោះផ្សេង។
          </div>

          <button
            type="button"
            onClick={async () => {
              localStorage.removeItem(`my_student_id_${classId}`);
              setStudentId(null);
              setJoinedStudent(null);
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer select-none border-none text-center"
          >
            ចុះឈ្មោះជាថ្មី (Register Again)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0%,transparent_100%)] pointer-events-none" />

      {/* Header Deck */}
      <header className="h-16 px-6 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between shrink-0 relative z-10 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl select-none">{joinedStudent.emoji || "🧑‍🎓"}</span>
          <div>
            <h4 className="text-xs font-black text-white leading-none">{joinedStudent.name}</h4>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase flex items-center gap-1.5">
              <span>{allStudents.length} នាក់ក្នុងថ្នាក់</span>
              {currentRank > 0 && <span>• លេខ {currentRank}</span>}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-amber-400 px-3 py-1 bg-gradient-to-r from-amber-500/5 to-amber-500/15 rounded-full flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 animate-bounce" />
          <span className="text-[10px] font-black font-mono leading-none">{joinedStudent.score || 0} ពិន្ទុ</span>
        </div>
      </header>

      {/* Core Play Area */}
      <main className="flex-1 p-6 flex flex-col justify-center items-center relative z-10 overflow-y-auto">
        {!currentQuestion ? (
          /* Waiting Screen Workspace */
          <div className="text-center p-8 space-y-6 max-w-sm">
            <div className="relative">
              <div className="w-20 h-20 bg-indigo-600/10 border-2 border-indigo-500/20 rounded-[2rem] flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin-slow" />
              </div>
              <div className="absolute top-0 right-1/4 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">រង់ចាំលោកគ្រូ-អ្នកគ្រូ...</h3>
              <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">សកម្មភាពរបស់អ្នកៈ រួចរាល់</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-semibold">
                សូមរង់ចាំនៅលើអេក្រង់នេះ លោកគ្រូ-អ្នកគ្រូកំពុងរៀបចំ បើកសន្លឹកសំណួរនៅលើក្ដារសំណួរ! វានឹងដំណើរការស្វ័យប្រវត្ត។
              </p>
            </div>

            {/* Minor Score Board */}
            <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-3xl space-y-2 text-left">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                <span>ចំណាត់ថ្នាក់របស់អ្នក (Class Rank)៖</span>
                <span className="text-indigo-400">លេខ {currentRank} / {allStudents.length}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                <span>ពិន្ទុសរុប (Cumulative Points)៖</span>
                <span className="text-amber-400 font-mono text-xs">{joinedStudent.score || 0} ពិន្ទុ</span>
              </div>
            </div>
          </div>
        ) : answeredState !== null ? (
          /* Answer Feedback Screen Workspace */
          <div className="text-center p-8 max-w-sm bg-slate-900/35 border border-slate-800 rounded-[2.5rem] space-y-6">
            <div className="space-y-4">
              {answeredState === 'correct' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-400">🥳 ត្រឹមត្រូវល្អណាស់!</h3>
                  <div className="inline-flex items-center gap-1 py-1 px-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 rounded-full text-[10px] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    ទទួលបាន +{pointsEarned} ពិន្ទុ
                  </div>
                </>
              ) : answeredState === 'wrong' ? (
                <>
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-red-400">😢 មិនត្រឹមត្រូវទេ!</h3>
                  <p className="text-xs text-slate-400">កុំបារម្ភ! ព្យាយាមម្ដងទៀតនៅសំណួរបន្ទាប់។</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 mx-auto">
                    <Timer className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-orange-400">⏳ អស់រយៈពេលឆ្លើយ!</h3>
                  <p className="text-xs text-slate-400">សំណួរផុតកំណត់រយៈពេល ២៥វិនាទី។</p>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl text-left text-xs border border-slate-900/80">
              <h5 className="font-bold text-slate-400 mb-1">ចម្លើយត្រឹមត្រូវគឺ៖</h5>
              <p className="text-slate-200 font-black">
                <FormulaRenderer text={currentQuestion.options[currentQuestion.correctIndex] || ''} />
              </p>
            </div>

            <div className="text-center text-[10px] text-slate-500 animate-pulse font-bold">
              កំពុងរង់ចាំលោកគ្រូ-អ្នកគ្រូបើកសំនួរបន្ទាប់...
            </div>
          </div>
        ) : (
          /* Active Question Workspace for Student answering */
          <div className="w-full max-w-sm flex-1 flex flex-col justify-between">
            {/* Question status header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                សំណួរលេខ {currentCard?.number || ''}
              </span>

              {/* Countdown Progress Bar */}
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${localTimeLeft <= 5 ? 'text-red-500 animate-ping' : 'text-slate-400'}`} />
                <span className={`text-xs font-black font-mono ${localTimeLeft <= 5 ? 'text-red-400' : 'text-slate-300'}`}>
                  {localTimeLeft} វិនាទី
                </span>
              </div>
            </div>

            {/* Question description card */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800/80 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-lg min-h-[140px] mb-6 overflow-hidden max-w-full">
              <h2 className="text-base sm:text-lg font-black text-white leading-relaxed break-words whitespace-normal word-break-break-word max-w-full">
                <FormulaRenderer text={currentQuestion.text || ''} />
              </h2>
            </div>

            {/* Answer Options Action Deck */}
            <div className="grid grid-cols-1 gap-3 shrink-0">
              {currentQuestion.options.map((opt, i) => {
                const colors = [
                  'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01]',
                  'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01]',
                  'bg-sky-600 hover:bg-sky-700 hover:scale-[1.01]',
                  'bg-violet-600 hover:bg-violet-700 hover:scale-[1.01]'
                ];
                const activeColor = colors[i % colors.length];
                const optPrefix = ["A", "B", "C", "D"][i];

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(i)}
                    className={`w-full p-4 rounded-2xl flex items-center gap-3 text-left transition-all text-white cursor-pointer select-none border-none shadow-md overflow-hidden max-w-full ${activeColor}`}
                  >
                    <span className="w-7 h-7 rounded-xl bg-black/20 flex items-center justify-center font-black text-xs shrink-0 select-none">
                      {optPrefix}
                    </span>
                    <span className="text-xs font-black select-none leading-snug break-words whitespace-normal word-break-break-word flex-1">
                      <FormulaRenderer text={opt || ''} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer copyright */}
      <footer className="py-4 text-center shrink-0 border-t border-slate-900/60 font-mono text-[9px] text-slate-500 font-bold tracking-widest">
        ACTIVE MOBILE LIVE TERMINAL
      </footer>
    </div>
  );
}
