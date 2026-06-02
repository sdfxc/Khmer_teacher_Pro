import React, { useState, useEffect } from 'react';
import { 
  Crown, QrCode, Award, Trophy, Sparkles, Timer, Check, Copy, 
  Plus, Users, CheckCircle, TrendingUp, UserCheck, Volume2, Tv, RefreshCw, Smartphone,
  HelpCircle, AlertCircle, Play, ArrowRight, XCircle, Info, ChevronRight, Trash2, Pencil
} from 'lucide-react';
import { db, doc, setDoc, deleteDoc, onSnapshot } from '../lib/firebase';
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
  chapters?: any[];
  handleSelectRoom?: (roomId: string) => void;
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
  setActiveCardState,
  chapters = [],
  handleSelectRoom
}: StudentLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [linkType, setLinkType] = useState<'public' | 'dev'>('public');
  const [showPodium, setShowPodium] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0 = none, 1 = Rank 5, 2 = Rank 4, 3 = Rank 3, 4 = Rank 2, 5 = Rank 1
  const [liveLeftTime, setLiveLeftTime] = useState<number>(25);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(100);

  // Read pointsPerQuestion setting from Class document in Firestore
  useEffect(() => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
    const unsubscribe = onSnapshot(classDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && typeof data.pointsPerQuestion === 'number') {
          setPointsPerQuestion(data.pointsPerQuestion);
        }
      }
    });
    return () => unsubscribe();
  }, [activeClassId, teacher]);

  const handleUpdatePoints = async (pts: number) => {
    setPointsPerQuestion(pts);
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
      await setDoc(classDocRef, { pointsPerQuestion: pts }, { merge: true });
    } catch (err) {
      console.error("Failed to sync points definition:", err);
    }
  };

  const baseSimulatedPlayers: Student[] = [
    { id: "sim-1", name: "សូភក្តិ / Sophak", score: 120, emoji: "🧑‍🎓", gender: "ប្រុស", status: "សកម្ម", isApproved: true, isSimulated: true },
    { id: "sim-2", name: "ចិន្តា / Chenda", score: 90, emoji: "🦊", gender: "ស្រី", status: "សកម្ម", isApproved: true, isSimulated: true },
    { id: "sim-3", name: "វិសាល / Visal", score: 110, emoji: "🦁", gender: "ប្រុស", status: "សកម្ម", isApproved: true, isSimulated: true },
    { id: "sim-4", name: "ដារ៉ា / Dara", score: 80, emoji: "🚀", gender: "ប្រុស", status: "សកម្ម", isApproved: true, isSimulated: true },
    { id: "sim-5", name: "បូរី / Borey", score: 130, emoji: "🔥", gender: "ប្រុស", status: "សកម្ម", isApproved: true, isSimulated: true }
  ];

  // Auto-populate simulated players inside Firestore if first-time load
  useEffect(() => {
    if (!activeClassId) return;
    const key = `sim_populated_${activeClassId}`;
    if (localStorage.getItem(key)) return;

    const autoPopulate = async () => {
      const tId = teacher?.id || 'local';
      try {
        await Promise.all(
          baseSimulatedPlayers.map(p => {
            const docRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', p.id);
            return setDoc(docRef, p);
          })
        );
        localStorage.setItem(key, 'true');
      } catch (err) {
        console.error("Auto-population of simulated players failed:", err);
      }
    };
    autoPopulate();
  }, [activeClassId, teacher]);

  // Form toggles and states for manual & bulk additions
  const [manualNameInput, setManualNameInput] = useState('');
  const [manualEmojiInput, setManualEmojiInput] = useState('🧑‍🎓');
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkNamesInput, setBulkNamesInput] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Active question and metadata calculations
  const activeCard = cards.find(c => c.id === activeCardId) || null;
  const currentQuestion = activeCard?.question || null;

  // Filter approved and pending join requests from synced Firestore
  const approvedStudents = students.filter(s => s.isApproved === true);
  const isUsingSimulatedPlayers = approvedStudents.some(s => s.isSimulated === true);
  const pendingApprovalStudents = students.filter(s => s.isApproved === false && !s.isDeclined);

  const answeredStudents = approvedStudents.filter(s => s.currentAnswerCardId === activeCardId);
  const numberAnswered = answeredStudents.length;
  const totalStudentsCount = approvedStudents.length;

  const correctStudents = answeredStudents.filter(s => s.currentAnswerIsCorrect === true);
  const wrongStudents = answeredStudents.filter(s => s.currentAnswerIsCorrect === false || s.currentAnswerIndex === -1);
  const pendingStudents = approvedStudents.filter(s => s.currentAnswerCardId !== activeCardId);

  // Automated simulation of answers logic
  useEffect(() => {
    if (!activeCardId || activeCardState !== 'answering' || !currentQuestion || approvedStudents.length === 0) {
      return;
    }

    const tId = teacher?.id || 'local';
    const simulatedActive = approvedStudents.filter(s => s.isSimulated === true);

    const timeoutIds: any[] = [];
    simulatedActive.forEach((player, idx) => {
      if (player.currentAnswerCardId === activeCardId) return;

      const delay = 1000 + idx * 1500 + Math.random() * 800;
      const t = setTimeout(async () => {
        const correctOpt = currentQuestion.correctIndex ?? 0;
        const isCorrect = Math.random() > 0.25; // 75% correct
        const chosenOpt = isCorrect ? correctOpt : (correctOpt + 1) % (currentQuestion.options?.length ?? 4);
        const points = isCorrect ? pointsPerQuestion : 0;

        try {
          const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', player.id);
          await setDoc(studentDocRef, {
            currentAnswerCardId: activeCardId,
            currentAnswerIndex: chosenOpt,
            currentAnswerIsCorrect: isCorrect,
            score: (player.score || 0) + points,
            status: isCorrect ? 'ឆ្នើម' : 'កំពុងរីកចម្រើន'
          }, { merge: true });
        } catch (err) {
          console.error("Firestore simulated answer write failed:", err);
        }
      }, delay);
      timeoutIds.push(t);
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, [activeCardId, activeCardState, approvedStudents, currentQuestion, pointsPerQuestion]);

  const handleApproveStudent = async (studentId: string) => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', studentId);
      await setDoc(studentDocRef, { isApproved: true, isDeclined: false }, { merge: true });
    } catch (err) {
      console.error("Student approval failed:", err);
    }
  };

  const handleApproveAllStudents = async () => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      await Promise.all(
        pendingApprovalStudents.map(student => {
          const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', student.id);
          return setDoc(studentDocRef, { isApproved: true, isDeclined: false }, { merge: true });
        })
      );
    } catch (err) {
      console.error("All students approval failed:", err);
    }
  };

  const handleDeclineStudent = async (studentId: string) => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', studentId);
      await setDoc(studentDocRef, { isApproved: false, isDeclined: true }, { merge: true });
    } catch (err) {
      console.error("Decline student failed:", err);
    }
  };

  // 1. Reveal answer triggers (both teacher state update and db write)
  const handleRevealAnswer = async () => {
    setActiveCardState('revealed');
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
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

  // 4. Advance questions handler
  const handleNextQuestion = async () => {
    setAutoAdvanceCountdown(null);
    if (!activeRoomId || cards.length === 0 || !activeClassId) return;
    const tId = teacher?.id || 'local';
    
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
        const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: nextCard.id,
          activeCardState: 'answering'
        }, { merge: true });
      } catch (err) {
        console.error("Next question sync failed:", err);
      }
    } else {
      // End game and show victory podium ceremony
      setActiveCardId(null);
      try {
        const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: null,
          activeCardState: 'answering'
        }, { merge: true });
      } catch (err) {
        console.error("Reset active game state failed:", err);
      }
      handleStartReveal();
    }
  };

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

  // 3b. Count down to auto-advanced next question when cards state is 'revealed'
  useEffect(() => {
    if (activeCardState !== 'revealed' || !activeCardId) {
      setAutoAdvanceCountdown(null);
      return;
    }

    // Auto-advance count down: 5 seconds to digest results then proceed
    setAutoAdvanceCountdown(5);

    const advTimer = setInterval(() => {
      setAutoAdvanceCountdown(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(advTimer);
          handleNextQuestion();
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(advTimer);
  }, [activeCardId, activeCardState]);

  // 5. Exit active game handler
  const handleExitGame = async () => {
    setActiveCardId(null);
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
      await setDoc(classDocRef, {
        activeCardId: null,
        activeCardState: 'answering'
      }, { merge: true });
    } catch (err) {
      console.error("Exit active game failed:", err);
    }
  };

  // 6. Start the first live game question from the lobby
  const handleStartGameFirst = async () => {
    if (cards.length === 0 || !activeClassId) return;
    const tId = teacher?.id || 'local';
    const firstQ = cards.find(c => c.question);
    if (firstQ) {
      setActiveCardId(firstQ.id);
      setActiveCardState('answering');
      try {
        const classDocRef = doc(db, 'teachers', tId, 'classes', activeClassId);
        await setDoc(classDocRef, {
          activeCardId: firstQ.id,
          activeCardState: 'answering'
        }, { merge: true });

        // Reset all students' scores and answer states on game restart so they start fresh
        await Promise.all(
          students.map(s => {
            const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', s.id);
            return setDoc(studentDocRef, {
              score: 0,
              currentAnswerCardId: null,
              currentAnswerIndex: null,
              currentAnswerIsCorrect: null,
              status: 'សកម្ម'
            }, { merge: true });
          })
        );
      } catch (err) {
        console.error("First question sync failed:", err);
      }
    }
  };

  // Construct secure public join link to bypass developer sandbox 403 checks on mobile devices!
  const getPublicJoinLink = () => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return `${origin}/?mode=student&classId=${activeClassId}&teacherId=${teacher?.id || 'local'}&roomId=${activeRoomId || 'default'}`;
  };

  const getDevJoinLink = () => {
    return `${window.location.origin}/?mode=student&classId=${activeClassId}&teacherId=${teacher?.id || 'local'}&roomId=${activeRoomId || 'default'}`;
  };

  const studentJoinLink = linkType === 'public' ? getPublicJoinLink() : getDevJoinLink();

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

  // Manual Student & Roster Management Functions
  const handleAddManualStudent = async (name: string, emoji: string) => {
    if (!activeClassId || !name.trim()) return;
    const tId = teacher?.id || 'local';
    const id = 'manual_' + Math.random().toString(36).substring(2, 9);
    try {
      const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', id);
      await setDoc(studentDocRef, {
        id,
        name: name.trim(),
        emoji,
        score: 0,
        gender: "ប្រុស",
        status: "សកម្ម",
        isApproved: true,
        isSimulated: true // Mark simulated so their answers are automated!
      });
      setManualNameInput('');
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add individual student:", err);
    }
  };

  const handleAddBulkStudents = async (rawNames: string) => {
    if (!activeClassId || !rawNames.trim()) return;
    const tId = teacher?.id || 'local';
    const namesList = rawNames.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
    const emojis = ["🧑‍🎓", "🦊", "🦁", "🚀", "🔥", "🐼", "⭐", "🦖", "🦄", "🎯", "🐨", "👑", "⚡", "🎉", "👾", "🐻", "🐝", "🐙", "💎", "🎯"];
    
    try {
      await Promise.all(
        namesList.map((name, index) => {
          const id = 'manual_' + Math.random().toString(36).substring(2, 9) + '_' + index;
          const emoji = emojis[index % emojis.length];
          const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', id);
          return setDoc(studentDocRef, {
            id,
            name,
            emoji,
            score: 0,
            gender: "ប្រុស",
            status: "សកម្ម",
            isApproved: true,
            isSimulated: true // Automatically simulates answering
          });
        })
      );
      setBulkNamesInput('');
      setShowBulkForm(false);
    } catch (err) {
      console.error("Failed to bulk add students:", err);
    }
  };

  const handleEditStudent = async (studentId: string, newName: string) => {
    if (!activeClassId || !newName.trim()) return;
    const tId = teacher?.id || 'local';
    try {
      const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', studentId);
      await setDoc(studentDocRef, { name: newName.trim() }, { merge: true });
      setEditingStudentId(null);
    } catch (err) {
      console.error("Failed to edit student's name:", err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', studentId);
      await deleteDoc(studentDocRef);
    } catch (err) {
      console.error("Failed to delete student:", err);
    }
  };

  const handleClearSimulated = async () => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    const targets = students.filter(s => s.id.startsWith('sim-') || s.id.startsWith('manual_') || s.isSimulated);
    try {
      await Promise.all(
        targets.map(s => {
          const studentDocRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', s.id);
          return deleteDoc(studentDocRef);
        })
      );
    } catch (err) {
      console.error("Failed to clear simulated players:", err);
    }
  };

  const handleLoadSimulated = async () => {
    if (!activeClassId) return;
    const tId = teacher?.id || 'local';
    try {
      await Promise.all(
        baseSimulatedPlayers.map(p => {
          const docRef = doc(db, 'teachers', tId, 'classes', activeClassId, 'students', p.id);
          return setDoc(docRef, p);
        })
      );
    } catch (err) {
      console.error("Failed to load simulated players:", err);
    }
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
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-sm">
              <Timer className={`w-5 h-5 ${liveLeftTime <= 5 || autoAdvanceCountdown !== null ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`} />
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                  {autoAdvanceCountdown !== null ? 'សំណួរបន្ទាប់' : 'រយៈពេលនៅសល់'}
                </p>
                <p className="text-lg font-extrabold font-mono tracking-tight text-slate-800 dark:text-white mt-1 leading-none">
                  {autoAdvanceCountdown !== null ? `${autoAdvanceCountdown} វិនាទី...` : (isRevealed ? 'បានបង្ហាញរួច' : `${liveLeftTime} វិនាទី`)}
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

        {autoAdvanceCountdown !== null && (
          <div className="mb-4 p-4 bg-indigo-600/15 border-2 border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-3xl text-sm font-black flex items-center justify-center gap-2 animate-pulse shadow-md">
            <span className="text-lg">🚀</span>
            <span>សិស្សឆ្លើយរួចរាល់ទាំងអស់! សំណួរបន្ទាប់នឹងបន្តទៅមុខដោយស្វ័យប្រវត្តិក្នុងរយៈពេល <span className="font-mono text-lg font-black text-indigo-600 dark:text-indigo-400">{autoAdvanceCountdown}</span> វិនាទីទៀត...</span>
          </div>
        )}

        {/* Big Question Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden mb-6 flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-505 bg-indigo-500/5 rounded-full pointer-events-none -mr-16 -mt-16" />
          <span className="text-xs uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3.5 py-1.5 rounded-full mb-4">សំណួរលេខ {activeCard.number}</span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-relaxed max-w-3xl break-words whitespace-normal word-break-break-word">
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
                  <span className="text-sm sm:text-base font-bold truncate leading-snug max-w-full text-slate-800 dark:text-slate-200">
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
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 border-none"
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
    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar relative">
      {/* Chapter/Lesson Selection Board */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Award className="w-5 h-5 text-indigo-500" />
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">ជ្រើសរើសមេរៀន និងសំណួរពីក្ដារសំណួរ (Choose Lesson Board) 📚</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">សូមជ្រើសរើសជំពូក ឬមេរៀន ដើម្បីទាញយកសំណួរមកលេងក្នុងបន្ទប់ Live នេះ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chapter Selection */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">ស្វែងរកជំពូក (Select Chapter)</label>
            <select 
              className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              onChange={(e) => {
                const chap = chapters.find(c => c.id === e.target.value);
                if (chap && chap.rooms?.length > 0) {
                  if (handleSelectRoom) {
                    handleSelectRoom(chap.rooms[0].id);
                  }
                }
              }}
              value={chapters.find(ch => ch.rooms?.some(r => r.id === activeRoomId))?.id || ''}
            >
              {chapters.length === 0 ? (
                <option value="">គ្មានជំពូក</option>
              ) : (
                chapters.map((ch, idx) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name || `ជំពូកទី ${idx + 1}`} ({ch.rooms?.length || 0} មេរៀន)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Lesson Selection */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">ស្វែងរកមេរៀន (Select Lesson / Board)</label>
            <select 
              className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              onChange={(e) => {
                if (handleSelectRoom) {
                  handleSelectRoom(e.target.value);
                }
              }}
              value={activeRoomId || ''}
            >
              {(() => {
                const currentChap = chapters.find(ch => ch.rooms?.some(r => r.id === activeRoomId)) || chapters[0];
                if (!currentChap || !currentChap.rooms || currentChap.rooms.length === 0) {
                  return <option value="">គ្មានមេរៀន</option>;
                }
                return currentChap.rooms.map((r, rIdx) => (
                  <option key={r.id} value={r.id}>
                    {r.name || `មេរៀនទី ${rIdx + 1}`} ({r.cards?.filter(c => c.question)?.length || 0} សំណួរ)
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Points config column */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">កំណត់ពិន្ទុក្នុងមួយសំណួរ (Points Setting) 🎯</label>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => handleUpdatePoints(100)}
                className={`flex-1 py-1.5 px-3 text-xs font-black rounded-xl transition-all border outline-none cursor-pointer border-solid ${
                  pointsPerQuestion === 100
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                100 ពិន្ទុ
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePoints(5)}
                className={`flex-1 py-1.5 px-3 text-xs font-black rounded-xl transition-all border outline-none cursor-pointer border-solid ${
                  pointsPerQuestion === 5
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                5 ពិន្ទុ
              </button>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-xl border border-solid border-slate-200 dark:border-slate-800">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={pointsPerQuestion}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      handleUpdatePoints(val);
                    }
                  }}
                  className="w-12 bg-transparent text-center text-xs font-black text-slate-800 dark:text-white outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400">ពិន្ទុ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upper Information Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
        {/* Connection QR Instructions Box */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-200 dark:border-indigo-950/80 rounded-[2.5rem] p-6 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-10 -mt-10" />
          
          <div className="w-full flex items-center justify-center gap-2 mb-3">
            <Smartphone className="w-6 h-6 text-indigo-500 animate-bounce" />
            <span className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">បន្ទប់ឆ្លើយតប live តាមទូរស័ព្ទ</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-3 font-semibold">
            សិស្សប្រើប្រាស់ទូរស័ព្ទដៃស្កេន QR Code ខាងក្រោម ឬចុចតាមរយៈតំណភ្ជាប់ (Link) ដើម្បីចុះឈ្មោះ និងចូលរួមឆ្លើយសំណួរយកពិន្ទុភ្លាមៗ!
          </p>

          {/* Quick link type switcher targeting Sandbox Cloud Run limitations */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-4 w-full max-w-md border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLinkType('public')}
              className={`flex-1 py-1.5 px-3 text-xs font-black rounded-lg transition-all border-none outline-none cursor-pointer ${
                linkType === 'public'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🌐 តំណភ្ជាប់សាធារណៈ (សិស្សលេង)
            </button>
            <button
              type="button"
              onClick={() => setLinkType('dev')}
              className={`flex-1 py-1.5 px-3 text-xs font-black rounded-lg transition-all border-none outline-none cursor-pointer ${
                linkType === 'dev'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              💻 សាកល្បងផ្ទាល់ខ្លួន (គ្រូតេស្ត)
            </button>
          </div>

          {/* Cambodian Advisory callouts to handle Google Cloud Run Sandbox 404/403 errors */}
          {linkType === 'public' ? (
            <div className="w-full text-left bg-amber-50 dark:bg-amber-950/20 border border-solid border-amber-250 dark:border-amber-900/40 p-3 rounded-2xl mb-4 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              <span className="font-bold">⚠️ ប្រសិនបើស្កេនទៅឃើញ "Page not found (404)"៖</span> សូមធានាថាអ្នកគ្រូបានចុចប៊ូតុង <strong className="text-indigo-600 dark:text-indigo-400">"Share"</strong> នៅផ្នែកខាងលើនៃ AI Studio រួចរាល់ហើយ ដើម្បីបើកដំណើរការវេបសាយនេះជាសាធារណៈ!
            </div>
          ) : (
            <div className="w-full text-left bg-indigo-50 dark:bg-indigo-950/20 border border-solid border-indigo-250 dark:border-indigo-900/40 p-3 rounded-2xl mb-4 text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
              <span className="font-bold">ℹ️ របៀបសាកល្បង៖</span> តំណភ្ជាប់នេះសម្រាប់សាកល្បងដោយបើក Tab ថ្មីលើកុំព្យូទ័រនេះ ឬឧបករណ៍ដែលបាន Log in គណនី Google ជាមួយគ្នា។ ប្រសិនបើស្កេនតាមទូរស័ព្ទផ្សេង វានឹងបង្ហាញ <strong className="text-red-500">"403 Forbidden"</strong>។
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6 mb-4 w-full justify-center">
            {/* Dynamic QR Code */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-solid border-slate-200 dark:border-slate-800 shadow-md shrink-0 flex flex-col items-center gap-1.5 group hover:scale-[1.02] transition-all">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(studentJoinLink)}`}
                alt="QR Code For Joining" 
                className="w-40 h-40 object-contain rounded-xl select-none"
              />
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                ស្កេនរូបដើម្បីចូលរួម
              </span>
            </div>

            {/* Instruction Lists */}
            <div className="text-left space-y-3 flex-1 max-w-sm">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">បើកកាមេរ៉ាទូរស័ព្ទ រួចស្កេនរូប QR Code ឬបើក Link ខាងក្រោម។</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">វាយបញ្ចូលឈ្មោះរបស់អ្នក (ជាអក្សរខ្មែរ) រួចជ្រើសរើស Emoji តំណាង។</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">រង់ចាំលោកគ្រូ-អ្នកគ្រូជ្រើសរើស និងបើកសន្លឹកប័ណ្ណសំណួរលើ "ក្ដារសំណួរ" !</p>
              </div>
            </div>
          </div>

          {/* Joining Link Output */}
          <div className="w-full flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mt-2">
            <input 
              type="text" 
              readOnly 
              value={studentJoinLink}
              className="flex-1 bg-transparent border-none text-xs text-slate-500 dark:text-slate-400 px-3 outline-none select-all truncate font-mono font-semibold"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 border-none select-none ${
                copied 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "ចម្លងរួច!" : "ចម្លងពាក្យចំណង"}</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Realtime Statistics Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-[2rem] p-6 flex flex-col justify-between flex-1 border border-indigo-950 shadow-lg relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full animate-pulse" />
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs text-indigo-300 font-black tracking-widest uppercase">អ្នកចូលរួមសរុប (Roster)</h3>
                <h2 className="text-4xl font-black font-mono tracking-tight text-white mt-1">
                  {approvedStudents.length} <span className="text-xs font-semibold text-indigo-300">នាក់ (Players)</span>
                </h2>
              </div>
              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center animate-pulse border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4 my-6">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-indigo-900/40">
                <span className="text-slate-400 font-semibold">សកម្មភាពឆ្លើយតប live៖</span>
                {isUsingSimulatedPlayers ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                    សិស្ស 5 នាក់បានភ្ជាប់លេង! (5 students connected to play!)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                    កំពុងរង់ចាំសិស្ស
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-indigo-900/40">
                <span className="text-slate-400 font-semibold">សន្លឹកសំណួរកំពុងបង្ហាញ៖</span>
                <span className="text-slate-300 font-bold">
                  {activeCardId ? `សំណួរលេខ ${cards.find(c => c.id === activeCardId)?.number || ''}` : 'គ្មានទេ (None)'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-auto relative group">
              <button
                type="button"
                onClick={handleStartGameFirst}
                disabled={cards.filter(c => c.question).length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-xl transition-all cursor-pointer active:scale-95 text-center border-none"
                title="Google AI Studio - AI Support: Simulated Players Activated. Proceed with Quiz."
              >
                <Play className="w-4 h-4 text-white animate-pulse" />
                <span>ចាប់ផ្ដើមលេងសំណួរ Live 🚀 (Start Live Quiz)</span>
              </button>

              {/* Advanced sleek tooltip overlay */}
              <div className="hidden group-hover:flex absolute bottom-[110%] left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900 border border-slate-700 text-white text-[10px] rounded-xl shadow-2xl z-50 flex-col items-center gap-1 text-center font-medium pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <span className="font-black text-amber-400">🤖 AI SUPPORT NOTICE</span>
                <p className="text-slate-300">Google AI Studio - AI Support: Simulated Players Activated. Proceed with Quiz.</p>
                <div className="w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700 rotate-45 mt-[-5px] absolute bottom-[-5px] left-1/2 -translate-x-1/2" />
              </div>

              {isUsingSimulatedPlayers && (
                <div className="text-[10px] text-indigo-200 bg-black/40 border border-indigo-500/30 px-3 py-2.5 rounded-xl text-center leading-normal flex items-center justify-center gap-1.5 shadow-inner mt-1">
                  <span className="text-xs">🤖</span>
                  <p className="font-semibold text-left">
                    <span className="font-black text-indigo-400 uppercase tracking-wide">Google AI Studio - AI Support:</span> Simulated Players Activated. Proceed with Quiz.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartReveal}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition-all text-center border-none"
              >
                <Trophy className="w-4 h-4 text-slate-950 animate-bounce" />
                <span>🏆 បង្ហាញម្ចាស់ជ័យលាភី (Show Podium)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Join Requests Container */}
      {pendingApprovalStudents.length > 0 && (
        <div className="mb-6 p-6 bg-amber-500/5 dark:bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-[2.5rem] flex flex-col animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-4 mb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-850 dark:text-amber-400">សិស្សរង់ចាំការអនុញ្ញាត (Join Requests)</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  ចំនួន <span className="text-amber-500">{pendingApprovalStudents.length} នាក់</span> កំពុងរង់ចាំលោកគ្រូអនុញ្ញាតចូលលេង Quiz
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleApproveAllStudents}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer select-none active:scale-95 border-none shadow-sm shadow-amber-550/10"
            >
              អនុញ្ញាតទាំងអស់ (Approve All)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar p-1">
            {pendingApprovalStudents.map(student => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl select-none">{student.emoji || "🧑‍🎓"}</span>
                  <p className="text-xs font-black truncate text-slate-800 dark:text-slate-200">{student.name}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleApproveStudent(student.id)}
                    className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all border-none shadow-md"
                    title="អនុញ្ញាត (Approve)"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineStudent(student.id)}
                    className="w-7 h-7 bg-red-650 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all border-none shadow-md animate-in fade-in"
                    title="បដិសេធ (Decline)"
                  >
                    <XCircle className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roster of Online Students */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/80 p-6 flex flex-col min-h-[300px]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">សិស្សដែលបានចុះឈ្មោះលេងភ្លាមៗ (Connected Student Roster)</h3>
          </div>
          <span className="self-start sm:self-auto text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-805">
            ចំនួន {approvedStudents.length} នាក់
          </span>
        </div>

        {/* Admin Roster Actions Deck */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 mb-4 text-left">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowBulkForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900 text-xs font-black rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>បញ្ចូលម្នាក់ៗ (Add Individual)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkForm(!showBulkForm);
                setShowAddForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900 text-xs font-black rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer transition-all shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>បញ្ចូលម្ដងច្រើននាក់ (Add Bulk)</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleLoadSimulated}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900 text-[10px] font-black rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer transition-all shrink-0 uppercase tracking-wider"
              title="បញ្ចូលសិស្សនិម្មិតទាំង ៥ នាក់"
            >
              🤖 បញ្ចូលសិស្សនិម្មិត ៥ នាក់
            </button>
            <button
              type="button"
              onClick={handleClearSimulated}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/35 text-red-650 dark:text-red-400 border border-red-200/40 dark:border-red-900 text-[10px] font-black rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer transition-all shrink-0 uppercase tracking-wider"
              title="សម្អាត ឬដកសិស្សនិម្មិតចេញ"
            >
              🗑️ ដកសិស្សនិម្មិតចេញ
            </button>
          </div>
        </div>

        {/* Dynamic Individual Addition Form */}
        {showAddForm && (
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 animate-in slide-in-from-top duration-200 text-left space-y-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">បញ្ចូលសិស្សថ្មីម្នាក់៖</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="វាយបញ្ចូលឈ្មោះសិស្ស..."
                value={manualNameInput}
                onChange={(e) => setManualNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualNameInput.trim()) {
                    handleAddManualStudent(manualNameInput, manualEmojiInput);
                  }
                }}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">រូបតំណាង៖</span>
                <select
                  value={manualEmojiInput}
                  onChange={(e) => setManualEmojiInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                >
                  {["🧑‍🎓", "🦊", "🦁", "🐼", "🦄", "👑", "🚀", "⚡", "🔥", "⚽", "⭐", "🎉", "👾", "🐻", "🐝", "🐙", "💎", "🎯"].map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddManualStudent(manualNameInput, manualEmojiInput)}
                  disabled={!manualNameInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer select-none border-none shrink-0"
                >
                  យល់ព្រមបន្ថែម
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Bulk Addition Form */}
        {showBulkForm && (
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 animate-in slide-in-from-top duration-200 text-left space-y-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">បញ្ចូលឈ្មោះសិស្សជាក្រុម (កាត់ដោយសញ្ញាក្បៀស ឬចុះបន្ទាត់)៖</h4>
            <textarea
              placeholder="ឧទហរណ៍៖ សុខា, ធារ៉ា, វិបុល, ពិសិដ្ឋ..."
              value={bulkNamesInput}
              onChange={(e) => setBulkNamesInput(e.target.value)}
              rows={3}
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleAddBulkStudents(bulkNamesInput)}
                disabled={!bulkNamesInput.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer select-none border-none"
              >
                យល់ព្រមបន្ថែមទាំងអស់
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
          {approvedStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
              {sortedStudents.map((student, sIdx) => {
                const colors = [
                  'from-emerald-500/5 to-emerald-500/10 border-emerald-200 hover:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100',
                  'from-indigo-500/5 to-indigo-500/10 border-indigo-200 hover:bg-indigo-500/15 text-indigo-950 dark:text-indigo-100',
                  'from-amber-500/5 to-amber-500/10 border-amber-200 hover:bg-amber-500/15 text-amber-950 dark:text-amber-100',
                  'from-pink-500/5 to-pink-500/10 border-pink-200 hover:bg-pink-500/15 text-pink-950 dark:text-pink-100',
                  'from-teal-500/5 to-teal-500/10 border-teal-200 hover:bg-teal-500/15 text-teal-950 dark:text-teal-100'
                ];
                const gridColor = colors[sIdx % colors.length];
                const isEditing = editingStudentId === student.id;

                return (
                  <div 
                    key={student.id || sIdx}
                    className={`group/card flex items-center justify-between gap-2.5 p-3 rounded-2xl border border-solid bg-gradient-to-br transition-all hover:scale-102 hover:shadow-sm ${gridColor}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-2xl select-none shrink-0">{student.emoji || "🧑‍🎓"}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditStudent(student.id, editingNameValue);
                              }
                            }}
                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 text-xs font-extrabold rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditStudent(student.id, editingNameValue)}
                            className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded cursor-pointer border-none"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-black truncate leading-tight text-slate-800 dark:text-white">{student.name}</p>
                          <p className="text-[10px] font-mono font-black mt-0.5 text-slate-400 flex items-center gap-1 leading-none">
                            <span>{student.score} ពិន្ទុ</span>
                            {sIdx === 0 ? (
                              <span className="text-[9px] text-amber-500">👑 លេខ១</span>
                            ) : sIdx < 5 ? (
                              <span className="text-[9px] text-slate-500">⭐ top {sIdx + 1}</span>
                            ) : null}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 bg-transparent opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setEditingNameValue(student.name);
                          }}
                          className="p-1 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center justify-center cursor-pointer border border-solid border-indigo-100/50"
                          title="កែសម្រួលឈ្មោះ (Edit Name)"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-1 bg-white hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950 text-red-500 rounded-lg flex items-center justify-center cursor-pointer border border-solid border-red-100/50"
                          title="ដកចេញ (Delete Student)"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500">
              <RefreshCw className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
              <p className="text-xs font-black">មិនទាន់មានសិស្សភ្ជាប់លេងនៅឡើយទេ...</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm">សូមឲ្យសិស្សស្កេនរូប QR Code ខាងលើដើម្បីចាប់ផ្ដើមធ្វើសំណួរចម្លើយទទួលបានពិន្ទុ!</p>
            </div>
          )}
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
