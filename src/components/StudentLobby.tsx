import React, { useState, useEffect } from 'react';
import { 
  Crown, QrCode, Award, Trophy, Sparkles, Timer, Check, Copy, 
  Plus, Users, CheckCircle, TrendingUp, UserCheck, Volume2, Tv, RefreshCw, Smartphone,
  HelpCircle, AlertCircle, Play, ArrowRight, XCircle, Info, ChevronRight, Pencil, Trash2
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import FormulaRenderer from './FormulaRenderer';
import { Student, QuizCard } from '../types';
import confetti from 'canvas-confetti';

interface StudentLobbyProps {
  activeClassId: string;
  className: string;
  teacher: any;
  activeRoomId: string | null;
  students: Student[];
  cards: QuizCard[];
  activeCardId: string | null;
  isDarkMode: boolean;
  setActiveCardId: (id: string | null) => void;
  activeCardState: 'answering' | 'revealed';
  setActiveCardState: (state: 'answering' | 'revealed') => void;
}

export default function StudentLobby({
  activeClassId,
  className,
  teacher,
  activeRoomId,
  students,
  cards,
  activeCardId,
  isDarkMode,
  setActiveCardId,
  activeCardState,
  setActiveCardState
}: StudentLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0 = none, 1 = Rank 5, 2 = Rank 4, 3 = Rank 3, 4 = Rank 2, 5 = Rank 1
  const [liveLeftTime, setLiveLeftTime] = useState<number>(25);
  const [selectedDomain, setSelectedDomain] = useState<'auto' | 'aistudio' | 'vercel'>('auto');

  // Simulated Players State (fallback when no real approved players)
  const isUsingSimulatedPlayers = students.filter(s => s.isApproved !== false).length === 0;
  const [simulatedAnswers, setSimulatedAnswers] = useState<Record<string, { option: number; isCorrect: boolean; points: number }>>({});
  const [simulatedScores, setSimulatedScores] = useState<Record<string, number>>({
    "sim-1": 130,
    "sim-2": 95,
    "sim-3": 115,
    "sim-4": 80,
    "sim-5": 140
  });

  const baseSimulatedPlayers: Student[] = [
    { id: "sim-1", name: "សូភក្តិ / Sophak", score: 130, emoji: "🧑‍🎓", gender: "ប្រុស", status: "សកម្ម", isApproved: true },
    { id: "sim-2", name: "ចិន្តា / Chenda", score: 95, emoji: "🦊", gender: "ស្រី", status: "សកម្ម", isApproved: true },
    { id: "sim-3", name: "វិសាល / Visal", score: 115, emoji: "🦁", gender: "ប្រុស", status: "សកម្ម", isApproved: true },
    { id: "sim-4", name: "ដារ៉ា / Dara", score: 80, emoji: "🚀", gender: "ប្រុស", status: "សកម្ម", isApproved: true },
    { id: "sim-5", name: "បូរី / Borey", score: 140, emoji: "🔥", gender: "ប្រុស", status: "សកម្ម", isApproved: true }
  ];

  // Active question and metadata calculations
  const activeCard = cards.find(c => c.id === activeCardId) || null;
  const currentQuestion = activeCard?.question || null;

  const simulatedPlayers = baseSimulatedPlayers.map(player => {
    const simAns = simulatedAnswers[player.id];
    const score = simulatedScores[player.id] ?? player.score;
    return {
      ...player,
      score,
      currentAnswerCardId: simAns ? activeCardId : undefined,
      currentAnswerIndex: simAns ? simAns.option : undefined,
      currentAnswerIsCorrect: simAns ? simAns.isCorrect : undefined
    } as Student;
  });

  // Filter approved and pending join requests
  const approvedStudents = isUsingSimulatedPlayers ? simulatedPlayers : students.filter(s => s.isApproved !== false);
  const pendingApprovalStudents = students.filter(s => s.isApproved === false);

  const answeredStudents = approvedStudents.filter(s => s.currentAnswerCardId === activeCardId);
  const numberAnswered = answeredStudents.length;
  const totalStudentsCount = approvedStudents.length;

  const correctStudents = answeredStudents.filter(s => s.currentAnswerIsCorrect === true);
  const wrongStudents = answeredStudents.filter(s => s.currentAnswerIsCorrect === false || s.currentAnswerIndex === -1);
  const pendingStudents = approvedStudents.filter(s => s.currentAnswerCardId !== activeCardId);

  // Automated simulation of answers logic
  useEffect(() => {
    if (!isUsingSimulatedPlayers || !activeCardId || activeCardState !== 'answering' || !currentQuestion) {
      setSimulatedAnswers({});
      return;
    }

    const timeoutIds: any[] = [];
    simulatedPlayers.forEach((player, idx) => {
      const delay = 1000 + idx * 1200 + Math.random() * 600;
      const t = setTimeout(() => {
        const correctOpt = currentQuestion.correctIndex ?? 0;
        const isCorrect = Math.random() > 0.25; // 75% correct
        const chosenOpt = isCorrect ? correctOpt : (correctOpt + 1) % (currentQuestion.options?.length ?? 4);
        const points = isCorrect ? Math.round(100 + Math.random() * 50) : 0;

        setSimulatedAnswers(prev => ({
          ...prev,
          [player.id]: { option: chosenOpt, isCorrect, points }
        }));
      }, delay);
      timeoutIds.push(t);
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, [activeCardId, activeCardState, isUsingSimulatedPlayers, currentQuestion]);

  // Sync simulated answer scores to student simulatedScoreboard on reveal state
  useEffect(() => {
    if (activeCardState === 'revealed' && isUsingSimulatedPlayers) {
      setSimulatedScores(prev => {
        const next = { ...prev };
        (Object.entries(simulatedAnswers) as [string, { option: number; isCorrect: boolean; points: number }][]).forEach(([pid, ans]) => {
          if (ans.isCorrect) {
            next[pid] = (next[pid] ?? 0) + ans.points;
          }
        });
        return next;
      });
    }
  }, [activeCardState]);

  const handleApproveStudent = async (studentId: string) => {
    if (!teacher || !activeClassId) return;
    try {
      const studentDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', studentId);
      await setDoc(studentDocRef, { isApproved: true }, { merge: true });
    } catch (err) {
      console.error("Student approval failed:", err);
    }
  };

  const handleApproveAllStudents = async () => {
    if (!teacher || !activeClassId) return;
    try {
      await Promise.all(
        pendingApprovalStudents.map(student => {
          const studentDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'students', student.id);
          return setDoc(studentDocRef, { isApproved: true }, { merge: true });
        })
      );
    } catch (err) {
      console.error("All students approval failed:", err);
    }
  };

  const handleDeclineStudent = async (studentId: string) => {
    const currentTeacherId = teacher?.id || 'local';
    if (!activeClassId) return;
    try {
      const studentDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId);
      await deleteDoc(studentDocRef);
    } catch (err) {
      console.error("Decline student failed:", err);
    }
  };

  const handleEditStudentNameInLobby = async (studentId: string, currentName: string) => {
    const newName = window.prompt("សូមបញ្ចូលឈ្មោះថ្មីរបស់សិស្ស៖", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const trimmedName = newName.trim();
      const currentTeacherId = teacher?.id || 'local';
      try {
        const studentDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId);
        await setDoc(studentDocRef, { name: trimmedName }, { merge: true });
      } catch (err) {
        console.error("Failed to update student name in lobby:", err);
      }
    }
  };

  const handleRemoveStudentFromLobby = async (studentId: string, studentName: string) => {
    if (window.confirm(`តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបសិស្ស «${studentName}» នេះចេញមែនទេ?`)) {
      const currentTeacherId = teacher?.id || 'local';
      try {
        const studentDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId, 'students', studentId);
        await deleteDoc(studentDocRef);
      } catch (err) {
        console.error("Failed to delete student in lobby:", err);
      }
    }
  };

  // 1. Reveal answer triggers (both teacher state update and db write)
  const handleRevealAnswer = async () => {
    setActiveCardState('revealed');
    if (!teacher || !activeClassId) return;
    try {
      const classDocRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId);
      await setDoc(classDocRef, {
        activeCardState: 'revealed'
      }, { merge: true });
    } catch (err) {
      console.error("Reveal master sync failed:", err);
    }
  };

  // 2. Local countdown timer for teacher's screen
  useEffect(() => {
    if (!activeCardId || activeCardState !== 'answering') return;
    
    setLiveLeftTime(25);
    
    const timer = setInterval(() => {
      setLiveLeftTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRevealAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCardId, activeCardState]);

  // 3. Auto-reveal when all joined students have submitted an option
  useEffect(() => {
    if (
      activeCardId && 
      activeCardState === 'answering' && 
      totalStudentsCount > 0 && 
      numberAnswered >= totalStudentsCount
    ) {
      handleRevealAnswer();
    }
  }, [students, activeCardId, activeCardState, numberAnswered, totalStudentsCount]);

  // 4. Advance questions handler
  const handleNextQuestion = async () => {
    if (!activeRoomId || cards.length === 0) return;
    const currentTeacherId = teacher?.id || 'local';
    
    const currentIdx = cards.findIndex(c => c.id === activeCardId);
    let nextCard = null;
    
    for (let i = currentIdx + 1; i < cards.length; i++) {
      if (cards[i].question) {
        nextCard = cards[i];
        break;
      }
    }

    if (nextCard) {
      setActiveCardId(nextCard.id);
      setActiveCardState('answering');
      
      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: nextCard.id,
          activeCardState: 'answering',
          activeCard: nextCard
        }, { merge: true });
      } catch (err) {
        console.error("Next question sync failed:", err);
      }
    } else {
      // End game and show victory podium ceremony
      setActiveCardId(null);
      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: null,
          activeCardState: 'answering',
          activeCard: null
        }, { merge: true });
      } catch (err) {
        console.error("Reset active game state failed:", err);
      }
      handleStartReveal();
    }
  };

  // 4b. Auto-advance to the next question 3 seconds after an answer has been revealed
  useEffect(() => {
    if (activeCardState !== 'revealed' || !activeCardId) return;

    const timer = setTimeout(() => {
      handleNextQuestion();
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeCardState, activeCardId, cards, activeClassId]);

  // 5. Exit active game handler
  const handleExitGame = async () => {
    setActiveCardId(null);
    const currentTeacherId = teacher?.id || 'local';
    try {
      const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
      await setDoc(classDocRef, {
        activeCardId: null,
        activeCardState: 'answering',
        activeCard: null
      }, { merge: true });
    } catch (err) {
      console.error("Exit active game failed:", err);
    }
  };

  // 6. Start the first live game question from the lobby
  const handleStartGameFirst = async () => {
    if (cards.length === 0) return;
    const firstQ = cards.find(c => c.question);
    const currentTeacherId = teacher?.id || 'local';
    if (firstQ) {
      setActiveCardId(firstQ.id);
      setActiveCardState('answering');
      try {
        const classDocRef = doc(db, 'teachers', currentTeacherId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: firstQ.id,
          activeCardState: 'answering',
          activeCard: firstQ
        }, { merge: true });
      } catch (err) {
        console.error("First question sync failed:", err);
      }
    }
  };

  // Dynamic join link for students
  const getBaseOrigin = () => {
    if (selectedDomain === 'aistudio') {
      return 'https://ai.studio/apps/93d7f0ee-4f6b-44a7-b110-d2f72d2acec6';
    }
    if (selectedDomain === 'vercel') {
      return 'https://khmer-teacher-pro-bql1.vercel.app';
    }
    return window.location.origin;
  };

  const baseOrigin = getBaseOrigin();
  const separator = baseOrigin.includes('?') ? '&' : baseOrigin.endsWith('/') ? '' : '/';
  const studentJoinLink = `${baseOrigin}${separator}?mode=student&classId=${activeClassId}&teacherId=${teacher?.id || 'local'}&roomId=${activeRoomId || 'default'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentJoinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sound Synthesizer function
  const playPodiumSound = (isChampion = false) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      if (isChampion) {
        // Grand victory chord arpeggio!
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C E G C E G C
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.15, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.5);
          
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 1.5);
        });
      } else {
        // Individual rising sound
        const notes = [392.00, 493.88, 587.33, 783.99]; // G B D G
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.1, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.8);
          
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.8);
        });
      }
    } catch (err) {
      console.warn('Audio API is blocked or failed:', err);
    }
  };

  // Specific confetti burst placement depending on Rank
  const fireConfettiForRank = (rank: number) => {
    if (rank === 5) {
      playPodiumSound(false);
      confetti({
        particleCount: 50,
        spread: 35,
        origin: { x: 0.15, y: 0.75 },
        colors: ['#64748B', '#94A3B8', '#CBD5E1'] // Slate colors
      });
    } else if (rank === 4) {
      playPodiumSound(false);
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { x: 0.85, y: 0.75 },
        colors: ['#B45309', '#F59E0B', '#FBBF24'] // Bronze-yellow colors
      });
    } else if (rank === 3) {
      playPodiumSound(false);
      confetti({
        particleCount: 75,
        spread: 45,
        origin: { x: 0.33, y: 0.65 },
        colors: ['#475569', '#3B82F6', '#60A5FA'] // Cool Blue colors
      });
    } else if (rank === 2) {
      playPodiumSound(false);
      confetti({
        particleCount: 90,
        spread: 50,
        origin: { x: 0.67, y: 0.6 },
        colors: ['#94A3B8', '#E2E8F0', '#F8FAFC'] // Silver/white colors
      });
    } else if (rank === 1) {
      // CHAMPION: Massive, continuous firework-like confetti bursts for 6 seconds!
      playPodiumSound(true);
      
      const duration = 6000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Fire everywhere around center and podiums
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: 0.5, y: 0.4 }, colors: ['#F59E0B', '#10B981', '#4F46E5', '#EF4444'] });
      }, 250);
    }
  };

  const handleStartReveal = () => {
    setShowPodium(true);
    setRevealStep(0);
    
    // Step 1: Reveal Rank 5
    const t5 = setTimeout(() => {
      setRevealStep(1);
      fireConfettiForRank(5);
    }, 1200);

    // Step 2: Reveal Rank 4
    const t4 = setTimeout(() => {
      setRevealStep(2);
      fireConfettiForRank(4);
    }, 3000);

    // Step 3: Reveal Rank 3
    const t3 = setTimeout(() => {
      setRevealStep(3);
      fireConfettiForRank(3);
    }, 4800);

    // Step 4: Reveal Rank 2
    const t2 = setTimeout(() => {
      setRevealStep(4);
      fireConfettiForRank(2);
    }, 6600);

    // Step 5: Reveal Rank 1 (Champion)
    const t1 = setTimeout(() => {
      setRevealStep(5);
      fireConfettiForRank(1);
    }, 8400);

    return () => {
      clearTimeout(t5);
      clearTimeout(t4);
      clearTimeout(t3);
      clearTimeout(t2);
      clearTimeout(t1);
    };
  };

  // Ranks calculations
  // Filter active/interactive roster of joined students
  const activeStudents = [...approvedStudents].filter(s => s.status !== 'គួរឲ្យបារម្ភ');
  const sortedStudents = [...approvedStudents].sort((a, b) => b.score - a.score);
  const topStudents = sortedStudents.slice(0, 5);

  // Pad the winners list to 5 students so we always have a gorgeous full podium!
  const displayWinners = Array.from({ length: 5 }).map((_, idx) => {
    return topStudents[idx] || {
      id: `placeholder-${idx}`,
      name: `រង់ចាំសិស្សតស៊ូ...`,
      score: 0,
      emoji: "👤",
      gender: "ប្រុស" as const,
      status: "កំពុងរីកចម្រើន" as const
    };
  });

  // Podium Positions layout mappings (5, 3, 1, 2, 4):
  // Column 0: Rank 5 (displayWinners[4]) - Far Left
  // Column 1: Rank 3 (displayWinners[2]) - Left of Center
  // Column 2: Rank 1 (displayWinners[0]) - Center
  // Column 3: Rank 2 (displayWinners[1]) - Right of Center
  // Column 4: Rank 4 (displayWinners[3]) - Far Right
  const podiumSpots = [
    { rank: 5, data: displayWinners[4], stepVisible: 1, bgColor: 'bg-slate-500/20 border-slate-400', height: 'h-24 sm:h-28', trophyColor: 'text-slate-400', badgeClass: 'bg-slate-200 text-slate-700' },
    { rank: 3, data: displayWinners[2], stepVisible: 3, bgColor: 'bg-blue-500/20 border-blue-400', height: 'h-36 sm:h-44', trophyColor: 'text-amber-700', badgeClass: 'bg-amber-100 text-amber-900' },
    { rank: 1, data: displayWinners[0], stepVisible: 5, bgColor: 'bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30', height: 'h-52 sm:h-64 scale-105', trophyColor: 'text-amber-400 text-3xl', badgeClass: 'bg-amber-500 text-white animate-bounce shadow-md' },
    { rank: 2, data: displayWinners[1], stepVisible: 4, bgColor: 'bg-slate-300/20 border-slate-300', height: 'h-44 sm:h-52', trophyColor: 'text-slate-200', badgeClass: 'bg-slate-300 text-slate-800' },
    { rank: 4, data: displayWinners[3], stepVisible: 2, bgColor: 'bg-amber-600/20 border-amber-600', height: 'h-28 sm:h-36', trophyColor: 'text-amber-600', badgeClass: 'bg-amber-700 text-amber-100' }
  ];

  if (activeCardId && activeCard && currentQuestion) {
    const isRevealed = activeCardState === 'revealed';
    
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#0b0f19] relative transition-colors duration-300">
        {/* Host Control Deck Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">សង្វៀនបន្តផ្ទាល់ (Live Question Console)</h2>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 font-semibold">
              ថ្នាក់រៀន៖ <span className="text-indigo-600 dark:text-indigo-400">{className}</span> • មេរៀន៖ <span className="text-indigo-600 dark:text-indigo-400">{cards.filter(c => c.question).length} សំណួរ</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Timer Meter */}
            <div className={`flex items-center gap-2.5 bg-white dark:bg-slate-900 border px-4 py-2 rounded-2xl shadow-sm transition-all duration-300 ${
              liveLeftTime <= 5 && !isRevealed 
                ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20 scale-110 animate-bounce' 
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <Timer className={`w-5 h-5 ${liveLeftTime <= 5 && !isRevealed ? 'text-red-550 dark:text-red-400 animate-pulse' : 'text-indigo-500'}`} />
              <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${liveLeftTime <= 5 && !isRevealed ? 'text-red-450 dark:text-red-400' : 'text-slate-400'}`}>រយៈពេលនៅសល់</p>
                <p className={`text-lg font-extrabold font-mono tracking-tight mt-1 leading-none transition-all duration-300 ${
                  liveLeftTime <= 5 && !isRevealed ? 'text-red-650 dark:text-red-400 text-xl' : 'text-slate-800 dark:text-white'
                }`}>
                  {isRevealed ? 'Revealed' : `${liveLeftTime} វិនាទី`}
                </p>
              </div>
            </div>

            {/* Answer Tracker */}
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-sm">
              <Users className="w-5 h-5 text-indigo-500" />
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">សិស្សបានឆ្លើយ</p>
                <p className="text-lg font-extrabold font-mono tracking-tight text-slate-800 dark:text-white mt-1 leading-none">
                  {numberAnswered}/{totalStudentsCount} <span className="text-xs font-semibold text-slate-400">នាក់</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Progress Percentage Meter */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${totalStudentsCount > 0 ? (numberAnswered / totalStudentsCount) * 100 : 0}%` }}
          />
        </div>

        {/* Big Question Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden mb-6 flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-505 bg-indigo-500/5 rounded-full pointer-events-none -mr-16 -mt-16" />
          <span className="text-xs uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3.5 py-1.5 rounded-full mb-4">សំណួរលេខ {activeCard.number}</span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-relaxed max-w-3xl break-words whitespace-pre-wrap">
            <FormulaRenderer text={currentQuestion.text || ''} />
          </h2>
        </div>

        {/* Question Options Displays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {currentQuestion.options.map((option, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isCorrectIndex = idx === currentQuestion.correctIndex;
            
            // Percentage of student responses picking this option
            const optionVotes = answeredStudents.filter(s => s.currentAnswerIndex === idx).length;
            const optionPercent = numberAnswered > 0 ? Math.round((optionVotes / numberAnswered) * 100) : 0;

            let cardStyles = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100';
            if (isRevealed) {
              if (isCorrectIndex) {
                cardStyles = 'bg-green-500/10 border-green-500 text-green-950 dark:text-green-300 shadow-md shadow-green-500/5';
              } else {
                cardStyles = 'bg-slate-100 dark:bg-slate-950 border-slate-200/50 dark:border-slate-900 opacity-40 text-slate-400';
              }
            }

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 relative overflow-hidden ${cardStyles}`}
              >
                <div className="flex items-center gap-4 z-10 flex-1 min-w-0">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-sm shrink-0 ${
                    isRevealed && isCorrectIndex
                      ? 'bg-green-600 text-white animate-bounce'
                      : 'bg-indigo-600 text-white'
                  }`}>
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base font-bold break-words whitespace-normal leading-snug max-w-full text-slate-800 dark:text-slate-200">
                    <FormulaRenderer text={option} />
                  </span>
                </div>

                {isRevealed && (
                  <div className="flex items-center gap-2 z-10 shrink-0 font-bold text-xs select-none bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{optionVotes} នាក់</span>
                    <span className="text-slate-300 mr-1 ml-1 font-semibold text-slate-400">|</span>
                    <span className="text-indigo-600 font-mono">{optionPercent}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Scorers List (Correct vs Incorrect stats) */}
        {isRevealed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 mb-8 animate-in fade-in duration-300">
            {/* Correct Scopes column */}
            <div className="bg-green-50/20 dark:bg-green-950/5 border border-green-200/30 dark:border-green-900/10 rounded-[2rem] p-6 flex flex-col shadow-none min-h-[150px]">
              <h4 className="text-xs font-black text-green-600 dark:text-green-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle className="w-4 h-4 text-green-600" />
                សិស្សឆ្លើយត្រូវ ({correctStudents.length} នាក់)
              </h4>
              <div className="flex-1 overflow-y-auto max-h-[180px] custom-scrollbar">
                {correctStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {correctStudents.map(student => (
                      <span key={student.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/15 text-green-700 dark:text-green-300 border border-green-250 rounded-full text-xs font-bold transition-all hover:scale-105 select-none text-center">
                        <span className="text-base">{student.emoji || "🧑‍🎓"}</span>
                        <span>{student.name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">គ្មានសិស្សឆ្លើយត្រូវទេ 😔</p>
                )}
              </div>
            </div>

            {/* Incorrect Scopes column */}
            <div className="bg-red-50/20 dark:bg-red-955/5 border border-red-200/30 dark:border-red-900/10 rounded-[2rem] p-6 flex flex-col shadow-none min-h-[150px]">
              <h4 className="text-xs font-black text-red-650 text-red-600 dark:text-red-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <XCircle className="w-4 h-4 text-red-600" />
                សិស្សឆ្លើយខុស / មិនបានឆ្លើយ ({wrongStudents.length + pendingStudents.length} នាក់)
              </h4>
              <div className="flex-1 overflow-y-auto max-h-[180px] custom-scrollbar">
                {wrongStudents.length > 0 || pendingStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {wrongStudents.map(student => (
                      <span key={student.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-400/10 hover:bg-red-400/15 text-red-700 dark:text-red-300 border border-red-250/60 rounded-full text-xs font-bold transition-all hover:scale-105 select-none text-center animate-in fade-in">
                        <span className="text-base">{student.emoji || "🧑‍🎓"}</span>
                        <span>{student.name} (ខុស)</span>
                      </span>
                    ))}
                    {pendingStudents.map(student => (
                      <span key={student.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800 rounded-full text-xs font-bold transition-all hover:scale-105 select-none text-center animate-in fade-in">
                        <span className="text-base">{student.emoji || "🧑‍🎓"}</span>
                        <span>{student.name} (មិនឆ្លើយ)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">គ្មានសិស្សណាឆ្លើយខុសទេ! ពូកែណាស់! 🎉</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Area Controls Deck */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5 gap-4">
          <button
            type="button"
            onClick={handleExitGame}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer select-none active:scale-95 border-none"
          >
            បិទការប្រកួត (Cancel Quiz)
          </button>

          {!isRevealed ? (
            <button
              type="button"
              onClick={handleRevealAnswer}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 border-none"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>បង្ហាញចម្លើយត្រូវ (Reveal Answer)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 border-none"
            >
              <span>សំណួរបន្ទាប់ (Next Question)</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar relative transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Background visual effects for game feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.04)_0%,transparent_50%)] pointer-events-none" />

      {/* Top Header Panel - Styled like original StudyPlay Host */}
      <div className={`flex flex-col md:flex-row items-center justify-between pb-4 mb-6 border-b gap-4 relative z-10 shrink-0 ${
        isDarkMode ? 'border-indigo-950/60' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-amber-500 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-500/10">
            🎮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black tracking-tight flex items-center gap-1 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                StudyPlay Host <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">របៀបគ្រូ (Classic)</span>
              </h1>
            </div>
            <p className={`text-[10px] font-bold mt-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              ថ្នាក់រៀន៖ <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{className}</span> • គាំទ្រការឆ្លើយតបពេលវេលាពិត (Connected Room Live Sync)
            </p>
          </div>
        </div>

        {/* Live connections badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isDarkMode 
              ? 'bg-slate-900 border-indigo-950/60 text-slate-400' 
              : 'bg-white border-slate-200 text-slate-650 text-slate-600 shadow-xs'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ម៉ាស៊ីេនមេ Live (Online Server)</span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 relative z-10">
        {/* Left Panel: Access & QR Code Box (StudyPlay Host Frame) - Styled dynamically for light and dark modes */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className={`${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#121829] to-[#0d1222] border-2 border-indigo-950/85 shadow-[0_8px_30px_rgb(0,0,0,0.3)]' 
              : 'bg-white border-2 border-slate-100 shadow-xl'
          } rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col items-center justify-center text-center flex-1 min-h-[500px]`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${
              isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/50'
            } rounded-full -mr-16 -mt-16 pointer-events-none`} />
            
            <div className="w-full flex items-center justify-center gap-2 mb-2">
              <Smartphone className={`w-5 h-5 animate-bounce ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>ស្កែន QR ឬបញ្ចូលលេខកូដដើម្បីចូលលេង</span>
            </div>

            <h2 className={`text-2xl font-black tracking-tight mb-1 flex items-center gap-2 justify-center ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <span>ចូលរួមលេងជាមួយ PIN</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse ${
                isDarkMode 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>Classic</span>
            </h2>

            <p className={`text-[11.5px] max-w-sm mb-5 font-bold leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              សិស្សប្រើប្រាស់ទូរស័ព្ទដៃស្កេន QR Code ខាងក្រោម ដើម្បីចុះឈ្មោះ និងចូលរួមលេងហ្គេមឆ្លើយសំណួរផ្ដាច់មុខរបស់ StudyPlay ភ្លាមៗ!
            </p>

            {/* Unique Game PIN Block - Elegant Dynamic design */}
            <div className={`w-full p-5 rounded-3xl mb-5 text-center relative overflow-hidden group ${
              isDarkMode ? 'bg-slate-950/60 border border-indigo-950/80' : 'bg-slate-50 border border-slate-200/80'
            }`}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              
              <span className={`text-[10.5px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1.5 z-10 relative ${
                isDarkMode ? 'text-indigo-400/90' : 'text-indigo-600/90'
              }`}>
                <Crown className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                លេខកូដសម្គាល់បន្ទប់ (GAME PIN)
              </span>
              <div className={`text-5xl font-black font-sans tracking-[0.2em] select-all z-10 relative pl-[0.2em] ${
                isDarkMode 
                  ? 'text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.25)]' 
                  : 'text-slate-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.04)]'
              }`}>
                {(activeRoomId || 'default').substring(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Dynamic QR Code Frame - Styled cleanly for dark or light backgrounds */}
            <div className={`p-4 rounded-[2rem] shadow-md shrink-0 flex flex-col items-center gap-2 group hover:scale-[1.02] transition-all duration-300 relative ${
              isDarkMode ? 'bg-slate-950 border border-indigo-950' : 'bg-slate-50 border border-slate-200/80'
            }`}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(studentJoinLink)}`}
                alt="QR Code For Joining" 
                className="w-36 h-36 object-contain rounded-xl select-none z-10 relative"
              />
              <span className={`text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1.5 z-10 relative ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                <QrCode className={`w-3.5 h-3.5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} animate-pulse`} />
                ស្កេនរូបដើម្បីចូលរួម (Scan QR)
              </span>
            </div>

            {/* Quick Share Link - Minimal and elegant copy-trigger */}
            <button
              onClick={handleCopyLink}
              className={`mt-4 px-4 py-2 border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none rounded-[14px] text-[10.5px] font-black ${
                copied 
                  ? isDarkMode
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-900 shadow-sm' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-250 shadow-sm'
                  : isDarkMode
                    ? 'bg-indigo-950/80 text-indigo-300 hover:text-white hover:bg-indigo-900/60 border-indigo-900/50'
                    : 'bg-indigo-50 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100/70 border-indigo-100/60'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "ចម្លងតំណភ្ជាប់ជោគជ័យ!" : "ចម្លងតំណភ្ជាប់ចូលរួម (Copy Link)"}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Joined Members & Action Deck (Classic StudyPlay Layout) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Quick Stats & Core Controls Frame */}
          <div className={`border rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#121829] to-[#0a0e1a] border-indigo-950/80' 
              : 'bg-white border-slate-200/80 shadow-sm'
          }`}>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/5 rounded-full animate-pulse pointer-events-none" />
            
            <div className={`flex justify-between items-center pb-4 border-b ${
              isDarkMode ? 'border-indigo-950/50' : 'border-slate-100'
            }`}>
              <div>
                <h3 className={`text-[10px] font-extrabold tracking-widest uppercase mb-1 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-650'
                }`}>ស្ថានភាពបន្ទប់ហ្គេម (GAME STATISTICS)</h3>
                <h2 className={`text-3xl font-black font-sans tracking-tight mt-1 flex items-baseline gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {approvedStudents.length} 
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-indigo-300' : 'text-slate-500'}`}>នាក់បានចូលរួម (Connected)</span>
                </h2>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center animate-pulse border ${
                isDarkMode 
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}>
                <Users className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-505'}`} />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 my-5 p-4 rounded-2xl text-xs font-semibold border ${
              isDarkMode 
                ? 'bg-slate-950/30 border-indigo-950/55 text-slate-300' 
                : 'bg-slate-50 border-slate-200/80 text-slate-750 text-slate-700'
            }`}>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-black">សកម្មភាពម៉ាស៊ីនបន្តផ្ទាល់</span>
                {isUsingSimulatedPlayers ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                    របៀបសាកល្បង (Sim Mode Live)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                    កំពុងរង់ចាំសិស្សពិត
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-black">សន្លឹកសំណួរក្នុងមេរៀន</span>
                <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                  📚 {cards.filter(c => c.question).length} Quiz Cards
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={handleStartGameFirst}
                disabled={cards.filter(c => c.question).length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95 text-center border-none select-none text-center"
              >
                <Play className="w-4 h-4 text-white animate-pulse" />
                <span>ចាប់ផ្ដើមលេងសំណួរ Live 🚀 (Start Session)</span>
              </button>

              <button
                type="button"
                onClick={handleStartReveal}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-2xl shadow-lg cursor-pointer active:scale-95 transition-all text-center border-none select-none text-center"
              >
                <Trophy className="w-4 h-4 text-slate-950 animate-bounce" />
                <span>🏆 បង្ហាញម្ចាស់ជ័យលាភី (Show Podium)</span>
              </button>
            </div>
          </div>

          {/* Pending Approval Join Requests Container */}
          {pendingApprovalStudents.length > 0 && (
            <div className="p-5 bg-amber-550/10 bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-3xl flex flex-col animate-in fade-in duration-300 shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-amber-500/25 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  <div>
                    <h3 className="text-xs font-black text-amber-400">សិស្សរង់ចាំការអនុញ្ញាត ({pendingApprovalStudents.length} នាក់)</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      សិស្សកំពុងរង់ចាំការអនុញ្ញាតដើម្បីចូលរួមឆ្លើយសំណួរយកពិន្ទុ
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleApproveAllStudents}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl transition-all cursor-pointer select-none active:scale-95 border-none shadow-md shadow-amber-500/15"
                >
                  អនុញ្ញាតទាំងអស់ (Approve All)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                {pendingApprovalStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/65 border border-indigo-950/50 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl select-none">{student.emoji || "🧑‍🎓"}</span>
                      <p className="text-[11px] font-black truncate text-slate-200">{student.name}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                      <button
                        type="button"
                        onClick={() => handleApproveStudent(student.id)}
                        className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all border-none"
                        title="អនុញ្ញាត (Approve)"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineStudent(student.id)}
                        className="w-7 h-7 bg-red-650 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all border-none"
                        title="បដិសេធ (Decline)"
                      >
                        <XCircle className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Students Block Grid (StudyPlay Blocks Theme) */}
          <div className={`border rounded-[2.5rem] p-6 flex flex-col flex-1 min-h-[300px] transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#121829] to-[#0a0e1a] border-indigo-950/80' 
              : 'bg-white border-slate-200/80 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
              isDarkMode ? 'border-indigo-950/50' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-amber-500 rounded-full animate-pulse" />
                <h3 className={`text-xs font-bold tracking-wider uppercase ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>សិស្សដែលបានចូលរួម (CONNECTED STUDENT ROSTER)</h3>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                isDarkMode 
                  ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' 
                  : 'text-indigo-700 bg-indigo-50 border-indigo-200'
              }`}>
                ចំនួន {approvedStudents.length} នាក់
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[340px] custom-scrollbar">
              {approvedStudents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
                  {sortedStudents.map((student, sIdx) => {
                    const blockColors = isDarkMode ? [
                      'from-[#ffd9a6]/8 to-[#ffd9a6]/15 hover:from-[#ffd9a6]/20 border-amber-950/45 text-amber-200',
                      'from-[#a8e6cf]/8 to-[#a8e6cf]/15 hover:from-[#a8e6cf]/20 border-emerald-950/45 text-emerald-250',
                      'from-[#dcedc1]/8 to-[#dcedc1]/15 hover:from-[#dcedc1]/20 border-lime-950/45 text-lime-200',
                      'from-[#ffd3b6]/8 to-[#ffd3b6]/15 hover:from-[#ffd3b6]/20 border-orange-950/45 text-orange-200',
                      'from-[#ff8b94]/8 to-[#ff8b94]/15 hover:from-[#ff8b94]/20 border-rose-950/45 text-rose-200',
                      'from-[#a8d8ea]/8 to-[#a8d8ea]/15 hover:from-[#a8d8ea]/20 border-sky-950/45 text-sky-200',
                      'from-[#aa96da]/8 to-[#aa96da]/15 hover:from-[#aa96da]/20 border-purple-950/45 text-purple-200'
                    ] : [
                      'from-[#ffd9a6]/15 to-[#ffd9a6]/40 hover:from-[#ffd9a6]/50 border-amber-200 text-amber-900',
                      'from-[#a8e6cf]/15 to-[#a8e6cf]/40 hover:from-[#a8e6cf]/50 border-emerald-200 text-emerald-900',
                      'from-[#dcedc1]/15 to-[#dcedc1]/40 hover:from-[#dcedc1]/50 border-lime-200 text-lime-900',
                      'from-[#ffd3b6]/15 to-[#ffd3b6]/40 hover:from-[#ffd3b6]/50 border-orange-200 text-orange-900',
                      'from-[#ff8b94]/15 to-[#ff8b94]/40 hover:from-[#ff8b94]/50 border-rose-200 text-rose-900',
                      'from-[#a8d8ea]/15 to-[#a8d8ea]/40 hover:from-[#a8d8ea]/50 border-sky-200 text-sky-900',
                      'from-[#aa96da]/15 to-[#aa96da]/40 hover:from-[#aa96da]/50 border-purple-200 text-purple-900'
                    ];
                    const gridColor = blockColors[sIdx % blockColors.length];
                    
                    return (
                      <div 
                        key={student.id || sIdx}
                        className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.05] hover:-translate-y-0.5 relative overflow-hidden group shadow-md ${gridColor}`}
                      >
                        {/* Glow outline on group hover */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        {/* Inline controls to edit name or delete student */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudentNameInLobby(student.id, student.name);
                            }}
                            className={`p-1.5 rounded-lg transition-colors border shadow-xs cursor-pointer flex items-center justify-center ${
                              isDarkMode 
                                ? 'bg-slate-900/85 border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-indigo-400' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600'
                            }`}
                            title="កែឈ្មោះសិស្ស (Edit Name)"
                          >
                            <Pencil className="w-3 h-3 text-slate-400 group-hover:text-indigo-400" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStudentFromLobby(student.id, student.name);
                            }}
                            className={`p-1.5 rounded-lg transition-colors border shadow-xs cursor-pointer flex items-center justify-center ${
                              isDarkMode 
                                ? 'bg-slate-900/85 border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-red-400' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-605 group-hover:text-red-650 text-slate-600'
                            }`}
                            title="លុបសិស្ស (Delete Student)"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400 group-hover:text-red-400" />
                          </button>
                        </div>

                        {/* 3D-feeling Character Avatar with customizable platform background */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner select-none mb-2 duration-300 group-hover:rotate-6 border ${
                          isDarkMode ? 'bg-slate-950/50 border-white/10' : 'bg-white/80 border-black/5'
                        }`}>
                          {student.emoji || "🧑‍🎓"}
                        </div>

                        <div className="min-w-0 w-full">
                          <p className={`text-xs font-black truncate leading-tight ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>{student.name}</p>
                          <p className={`text-[9px] font-mono font-bold mt-1 flex items-center justify-center gap-1 leading-none ${
                            isDarkMode ? 'text-slate-450 text-slate-400' : 'text-slate-500'
                          }`}>
                            <span className={isDarkMode ? 'text-indigo-350' : 'text-indigo-650 font-black'}>{student.score} XP</span>
                            {sIdx === 0 && <span className="text-[8px] bg-amber-500/20 text-amber-500 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-500/10">👑 លេខ១</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`flex-1 flex flex-col items-center justify-center p-12 text-center ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <div className="w-16 h-16 bg-indigo-500/5 rounded-full flex items-center justify-center border border-indigo-500/10 mb-4 animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                  <p className={`text-sm font-black ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>មិនទាន់មានសិស្សភ្ជាប់លេងនៅឡើយទេ...</p>
                  <p className={`text-[10px] mt-1.5 max-w-sm mx-auto leading-relaxed ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    ស្កេនរូប QR Code ឬចុចចម្លងតំណភ្ជាប់ហ្គេម ដើម្បីអញ្ជើញសិស្សឱ្យចូលរួមលេងជាមួយគ្នាភ្លាមៗ!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WINNERS PODIUM CEREMONY VIEW */}
      {showPodium && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-hidden animate-fade-in no-print">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_100%)] pointer-events-none" />
          
          <div className="w-full max-w-4xl flex flex-col items-center justify-between h-[90vh] max-h-[850px] relative z-10 p-6">
            {/* Header Area */}
            <div className="text-center space-y-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                <Crown className="w-3.5 h-3.5" />
                ស្វែងរកកំពូលម្ចាស់ជ័យលាភីរូបវិទ្យា/គណិត
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                ជណ្តើរពានរង្វាន់ - ម្ចាស់ជ័យលាភីទាំង៥នាក់
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                លោកគ្រូ អ្នកគ្រូសូមអបអរសាទរសិស្សដែលទទួលបានពិន្ទុខ្ពស់ជាងគេក្នុងការលេង live!
              </p>
            </div>

            {/* Stair Structure Row (Left to Right: 5, 3, 1, 2, 4 with heights order 1 > 2 > 3 > 4 > 5) */}
            <div className="w-full flex-1 flex items-end justify-center gap-3 sm:gap-6 max-w-3xl my-6">
              {podiumSpots.map((spot, index) => {
                const isVisible = revealStep >= spot.stepVisible;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end relative select-none">
                    {/* Character/Student Metadata */}
                    <div 
                      className={`mb-4 flex flex-col items-center text-center transition-all duration-1000 transform ${
                        isVisible 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 translate-y-24 scale-50 pointer-events-none'
                      }`}
                    >
                      {/* Emoji Profile */}
                      <div className="relative group">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-slate-800/80 border-4 border-slate-700 flex items-center justify-center text-3xl sm:text-5xl shadow-xl shadow-slate-950/60 relative z-10">
                          {spot.data.emoji || "👤"}
                        </div>
                        {spot.rank === 1 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                            <Trophy className="w-9 h-9 text-amber-400 filter drop-shadow-[0_4px_6px_rgba(251,191,36,0.4)]" />
                          </div>
                        )}
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Name Plate */}
                      <p className="text-xs sm:text-sm font-black text-white mt-3 leading-tight truncate max-w-[110px] drop-shadow">
                        {spot.data.name}
                      </p>
                      
                      {/* Score Value */}
                      <p className="text-[10px] sm:text-xs font-black font-mono mt-0.5 text-amber-400 drop-shadow">
                        {spot.data.score} ពិន្ទុ
                      </p>
                    </div>

                    {/* Stair Stand Block Element */}
                    <div 
                      className={`w-full ${spot.height} ${spot.bgColor} rounded-t-[1.5rem] border-t-4 border-x-2 border-dashed shadow-2xl relative transition-all duration-1000 transform flex flex-col justify-between items-center py-4 ${
                        isVisible 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-48 scale-y-0 pointer-events-none'
                      }`}
                    >
                      {/* Stair Rank Number Tag */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md border border-white/10 ${spot.badgeClass}`}>
                        {spot.rank}
                      </span>
                      
                      {/* Optional podium graphic layout standardizer */}
                      <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                        {spot.rank === 1 ? 'ជើងឯក (1st)' : `${spot.rank}nd`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Under-deck Dashboard controls */}
            <div className="flex items-center gap-4 text-center shrink-0 w-full justify-center">
              <button
                onClick={() => {
                  setShowPodium(false);
                  setRevealStep(0);
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer select-none"
              >
                ចាកចេញ (Exit)
              </button>
              <button
                onClick={handleStartReveal}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer select-none shadow-md border-none"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>បាញ់កាំជ្រួចម្តងទៀត (Replay)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
