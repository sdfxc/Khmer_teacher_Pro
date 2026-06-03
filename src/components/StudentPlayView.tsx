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
  const initialClassId = urlParams.get('classId') || '';
  const initialTeacherId = urlParams.get('teacherId') || '';

  const [liveClassId, setLiveClassId] = useState<string>(initialClassId);
  const [liveTeacherId, setLiveTeacherId] = useState<string>(initialTeacherId);
  
  const classId = liveClassId;
  const teacherId = liveTeacherId;

  const [studentId, setStudentId] = useState<string | null>(() => {
    return (classId ? localStorage.getItem(`my_student_id_${classId}`) : null) || null;
  });

  const [enteredPin, setEnteredPin] = useState('');
  const [pinResolved, setPinResolved] = useState(!!initialClassId && !!initialTeacherId);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    if (classId) {
      const saved = localStorage.getItem(`my_student_id_${classId}`);
      if (saved) {
        setStudentId(saved);
      }
    }
  }, [classId]);

  const handleResolvePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin.trim()) return;
    setPinLoading(true);
    setPinError('');
    try {
      const pinDocRef = doc(db, 'active_pins', enteredPin.trim());
      const pinSnap = await getDoc(pinDocRef);
      if (pinSnap.exists()) {
        const data = pinSnap.data();
        setLiveClassId(data.classId);
        setLiveTeacherId(data.teacherId);
        if (data.roomId) {
          setActiveRoomId(data.roomId);
        }
        const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mode=student&classId=${data.classId}&teacherId=${data.teacherId}${data.roomId ? '&roomId=' + data.roomId : ''}`;
        window.history.pushState({ path: newurl }, '', newurl);
        setPinResolved(true);
      } else {
        setPinError('រកមិនឃើញលេខសម្គាល់បន្ទប់នេះទេ! សូមពិនិត្យមើលលេខ PIN ៦ខ្ទង់ឡើងវិញ ឬសួរគ្រូរបស់អ្នក។ (Game PIN not found)');
      }
    } catch (err: any) {
      console.error("Resolve PIN error:", err);
      setPinError('មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Cloud internet ។ (Pin resolution error)');
    } finally {
      setPinLoading(false);
    }
  };

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
  const [autoApprove, setAutoApprove] = useState<boolean>(false);

  // Local play state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentCard, setCurrentCard] = useState<QuizCard | null>(null);
  const [answeredState, setAnsweredState] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [localTimeLeft, setLocalTimeLeft] = useState(25);

  const [showGameZone, setShowGameZone] = useState(false);
  const [activeGame, setActiveGame] = useState<'emoji' | 'sound' | 'moles' | null>(null);
  const [showClassCelebration, setShowClassCelebration] = useState(false);
  
  // Game 1 states: emoji pop
  const [bubbles, setBubbles] = useState<any[]>([]);
  // Game 2 states: sound pad
  const [activeNotePad, setActiveNotePad] = useState<string | null>(null);
  // Game 3 states: whack a mole
  const [molesList, setMolesList] = useState<any[]>([]);

  const emojisList = ["🧑‍🎓", "🦊", "🦁", "🐼", "🐨", "🦄", "👑", "🚀", "⚡", "🔥", "⚽", "⭐", "🎉", "👾", "🐯", "🐻", "🐝", "🐙", "💎", "🎯"];

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
        setAutoApprove(data.autoApprove || false);
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

  // 6. Close Game Zone automatically when a new question arrives
  useEffect(() => {
    if (currentQuestion) {
      setShowGameZone(false);
    }
  }, [currentQuestion]);

  // 7. Shared Live Celebration listener
  useEffect(() => {
    if (!classId || !teacherId) return;

    const classDocRef = doc(db, 'teachers', teacherId, 'classes', classId);
    let lastCelebrationHandled = 0;
    
    const unsubscribe = onSnapshot(classDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.celebrationTime && data.celebrationTime > lastCelebrationHandled) {
          lastCelebrationHandled = data.celebrationTime;
          // Trigger confetti
          try {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch (e) {}
          
          // Show full screen overlay
          setShowClassCelebration(true);
          setTimeout(() => {
            setShowClassCelebration(false);
          }, 4500);
        }
      }
    });

    return () => unsubscribe();
  }, [classId, teacherId]);

  // 8. Emoji Pop Bubble Spawning and Float loop
  useEffect(() => {
    if (!showGameZone || activeGame !== 'emoji') {
      setBubbles([]);
      return;
    }

    const emojis = ["😂", "🥳", "😇", "😎", "🤩", "💖", "🎈", "🍬", "🦋", "✨"];
    const initial = Array.from({ length: 4 }).map((_, idx) => ({
      id: `bubble-${Date.now()}-${idx}-${Math.random()}`,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 80 + 10,
      y: 110,
      size: Math.random() * 20 + 45,
      speed: Math.random() * 1.5 + 1.2,
    }));
    setBubbles(initial);

    const spawnTimer = setInterval(() => {
      setBubbles(prev => {
        if (prev.length >= 6) return prev;
        const newEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        return [
          ...prev,
          {
            id: `bubble-${Date.now()}-${Math.random()}`,
            emoji: newEmoji,
            x: Math.random() * 80 + 10,
            y: 110,
            size: Math.random() * 20 + 45,
            speed: Math.random() * 1.5 + 1.2,
          }
        ];
      });
    }, 2000);

    const floatTimer = setInterval(() => {
      setBubbles(prev => 
        prev
          .map(b => ({ ...b, y: b.y - b.speed }))
          .filter(b => b.y > -20)
      );
    }, 30);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(floatTimer);
    };
  }, [showGameZone, activeGame]);

  // 9. Stress Smasher Whack-A-Mole layout triggers
  useEffect(() => {
    if (!showGameZone || activeGame !== 'moles') {
      setMolesList([]);
      return;
    }

    const stressors = ["ស្ត្រេស", "ធុញថប់", "លំហាត់ពិបាក", "ខ្ជិលច្រអូស", "ងងុយគេង", "ព្រួយបារម្ភ"];
    const icons = ["😤", "🥱", "🥵", "😰", "😴", "🥶"];
    const initial = Array.from({ length: 6 }).map((_, idx) => ({
      id: idx,
      isActive: false,
      name: stressors[idx % stressors.length],
      emoji: icons[idx % icons.length]
    }));
    setMolesList(initial);

    const interval = setInterval(() => {
      setMolesList(prev => {
        const randomIndex = Math.floor(Math.random() * 6);
        return prev.map((m, idx) => ({
          ...m,
          isActive: idx === randomIndex ? true : Math.random() > 0.65 ? m.isActive : false
        }));
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [showGameZone, activeGame]);

  const handlePopBubble = async (bubbleId: string, bubbleEmoji: string) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800 + Math.random() * 300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch(e) {}

    if (!studentId || !classId || !teacherId || !joinedStudent) return;
    try {
      const nextScore = (joinedStudent.score || 0) + 1;
      const nextSmashed = (joinedStudent.stressSmashed || 0) + 1;
      
      const docRef = doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId);
      await setDoc(docRef, {
        score: nextScore,
        stressSmashed: nextSmashed,
        gameAction: {
          game: 'emoji',
          text: `បានបំបែកពពុះរូបអារម្មណ៍រីករាយ! ${bubbleEmoji} 🎈`,
          timestamp: Date.now()
        }
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const playSoundPadNote = async (noteName: string) => {
    setActiveNotePad(noteName);
    setTimeout(() => setActiveNotePad(null), 200);

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        let freq = 523.25; // C5
        if (noteName === 'D5') freq = 587.33;
        else if (noteName === 'E5') freq = 659.25;
        else if (noteName === 'G5') freq = 783.99;
        else if (noteName === 'A5') freq = 880.00;
        else if (noteName === 'C6') freq = 1046.50;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      }
    } catch(e) {}

    if (!studentId || !classId || !teacherId || !joinedStudent) return;
    try {
      const docRef = doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId);
      await setDoc(docRef, {
        gameAction: {
          game: 'sound',
          text: `លេងបន្ទះភ្លេង សម្លេងកំណត់ចំណាំ ${noteName} 🎹`,
          timestamp: Date.now(),
          note: noteName
        }
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleWhackMole = async (id: number, name: string) => {
    setMolesList(prev => 
      prev.map(m => m.id === id ? { ...m, isActive: false } : m)
    );

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch(e) {}

    if (!studentId || !classId || !teacherId || !joinedStudent) return;
    try {
      const nextScore = (joinedStudent.score || 0) + 1;
      const nextSmashed = (joinedStudent.stressSmashed || 0) + 1;
      
      const docRef = doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId);
      await setDoc(docRef, {
        score: nextScore,
        stressSmashed: nextSmashed,
        gameAction: {
          game: 'moles',
          text: `បានវាយកម្ទេងអារម្មណ៍អវិជ្ជមាន៖ ${name}! 🔨`,
          timestamp: Date.now()
        }
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

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
          isApproved: autoApprove
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

  if (!pinResolved) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        <form onSubmit={handleResolvePIN} className="w-full max-w-sm bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center text-3xl animate-pulse">
              🎮
            </div>
            <h3 className="text-xl font-black text-white">ចូលរួមលេងហ្គេម Blooket</h3>
            <p className="text-[10px] uppercase font-black tracking-wider text-amber-500">EduSpin Game ID / PIN entry</p>
          </div>

          {pinError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-xs text-red-400 font-bold leading-normal text-left flex gap-1.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{pinError}</span>
            </div>
          )}

          <div className="space-y-2 text-left">
            <label className="text-xs font-black text-slate-400">វាយបញ្ចូលលេខសម្គាល់បន្ទប់ (Game PIN - ៦ ខ្ទង់)៖</label>
            <input 
              type="text" 
              required
              maxLength={6}
              placeholder="ឧទាហរណ៍៖ ២៨៤៧១៩"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-4 py-3.5 bg-slate-950/70 border border-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-indigo-500 rounded-2xl text-center text-2xl font-black font-mono tracking-widest text-white outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={pinLoading || enteredPin.length < 6}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-2xl select-none cursor-pointer transition-all border-none flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 uppercase tracking-widest"
          >
            {pinLoading ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <ArrowRight className="w-4 h-4 text-slate-950" />}
            <span>ចូលរួមលេង (JOIN GAME)</span>
          </button>
          
          <div className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            ឬប្រើប្រាស់ស្កេន QR Code ពីអេក្រង់គ្រូដើម្បីចូលរួមដោយស្វ័យប្រវត្តិ។
          </div>
        </form>
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
      <main className="flex-1 p-6 flex flex-col justify-center items-center relative z-10 overflow-y-auto w-full max-w-sm mx-auto">
        {showGameZone ? (
          /* Student Stress Relief Game Zone Workspace (3 figures on bottom screen as requested) */
          <div className="w-full max-w-sm bg-slate-900/60 border border-slate-800/80 rounded-[2.5rem] p-6 flex flex-col gap-5 animate-in zoom-in duration-200 text-left font-sans">
            {/* Game Zone Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 gap-2">
              <div className="text-left">
                <h3 className="text-xs sm:text-sm font-black text-teal-400">កន្លែងលេងហ្គេមកាត់ស្ត្រេស 🎮</h3>
                <p className="text-[9px] text-slate-505 font-bold uppercase tracking-wider">Student Relaxation Oasis</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGameZone(false)}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white font-black text-[10px] rounded-xl cursor-pointer transition-all border-none select-none"
              >
                ចាកចេញ (Exit)
              </button>
            </div>

            {/* Game Select Tab Button Row */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-850">
              <button
                type="button"
                onClick={() => setActiveGame('emoji')}
                className={`py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-none select-none flex flex-col items-center gap-0.5 ${
                  activeGame === 'emoji'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <span className="text-sm select-none">🎈</span>
                <span>បំបែកពពុះ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGame('sound')}
                className={`py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-none select-none flex flex-col items-center gap-0.5 ${
                  activeGame === 'sound'
                    ? 'bg-pink-650 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <span className="text-sm select-none">🎹</span>
                <span>បន្ទះតន្ត្រី</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGame('moles')}
                className={`py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-none select-none flex flex-col items-center gap-0.5 ${
                  activeGame === 'moles'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <span className="text-sm select-none">🔨</span>
                <span>វាយកម្ទេច</span>
              </button>
            </div>

            {/* Game Content Area */}
            <div className="flex-1 min-h-[280px] flex flex-col justify-center items-center relative overflow-hidden bg-slate-950/40 border border-slate-850 rounded-[2rem] p-4">
              
              {/* Game 1: Emoji Pop Bubble */}
              {activeGame === 'emoji' && (
                <div className="w-full h-full flex flex-col relative min-h-[250px]">
                  <div className="absolute top-1 right-1 text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 rounded-full z-10">
                    សិស្ស ៤
                  </div>
                  <div className="text-center mb-1.5 z-10 shrink-0">
                    <h4 className="text-xs font-black text-indigo-300">🎈 ហ្គេមបំបែកពពុះរូបអារម្មណ៍ (Emoji Pop)</h4>
                    <p className="text-[9px] text-slate-450 font-semibold leading-normal">ចុចបំបែកពពុះកង្វល់! +1 ពិន្ទុ</p>
                  </div>

                  <div className="flex-1 relative self-stretch overflow-hidden">
                    {bubbles.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[10px] font-bold">
                        កំពុងស្វែងរកពពុះ...
                      </div>
                    ) : (
                      bubbles.map(bubble => (
                        <button
                          key={bubble.id}
                          type="button"
                          onClick={() => handlePopBubble(bubble.id, bubble.emoji)}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer border-none select-none flex items-center justify-center p-0 transition-opacity"
                          style={{
                            left: `${bubble.x}%`,
                            top: `${bubble.y}%`,
                            width: `${bubble.size}px`,
                            height: `${bubble.size}px`,
                            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15) 0%, rgba(99,102,241,0.2) 60%, rgba(99,102,241,0.35) 100%)',
                            border: '1.2px solid rgba(129,140,248,0.3)',
                            backdropFilter: 'blur(1px)'
                          }}
                        >
                          <span className="text-lg select-none">{bubble.emoji}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Game 2: Sound Chime Relaxation Pads */}
              {activeGame === 'sound' && (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[250px] relative">
                  <div className="absolute top-1 right-1 text-[8px] font-black uppercase text-pink-400 bg-pink-500/10 px-2 rounded-full z-10">
                    សិស្ស ៥
                  </div>
                  <div className="text-center mb-4 z-10 shrink-0">
                    <h4 className="text-xs font-black text-pink-300">🎹 បន្ទះតន្ត្រីស្ត្រេសគីឡូ (Sound Pad)</h4>
                    <p className="text-[9px] text-slate-450 font-semibold leading-normal">បន្លឺសម្លេងលាន់ឮលើអេក្រង់របស់គ្រូ live!</p>
                  </div>

                  {/* Pentatonic buttons grid */}
                  <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs p-1">
                    {[
                      { note: 'C5', name: '🔴 សុភមង្គល', bg: 'bg-red-500 hover:bg-red-600' },
                      { note: 'D5', name: '🟠 ថាមពល', bg: 'bg-orange-500 hover:bg-orange-600' },
                      { note: 'E5', name: '🟡 លំហែកាយ', bg: 'bg-amber-500 hover:bg-amber-600' },
                      { note: 'G5', name: '🟢 ក្តីសង្ឃឹម', bg: 'bg-emerald-500 hover:bg-emerald-600' },
                      { note: 'A5', name: '🔵 សេរីភាព', bg: 'bg-sky-500 hover:bg-sky-600' },
                      { note: 'C6', name: '🔮 សន្តិភាព', bg: 'bg-purple-500 hover:bg-purple-600' }
                    ].map(nt => (
                      <button
                        key={nt.note}
                        type="button"
                        onClick={() => playSoundPadNote(nt.note)}
                        className={`py-3.5 px-2.5 rounded-xl flex flex-col justify-center items-center gap-0.5 transition-all cursor-pointer border-none shadow-sm ${
                          activeNotePad === nt.note ? 'scale-95 brightness-125 saturate-150' : 'active:scale-95'
                        } ${nt.bg} text-white`}
                      >
                        <span className="text-xs font-black tracking-wide leading-none">{nt.note}</span>
                        <span className="text-[8px] font-bold text-white/90">{nt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Game 3: Stress Smasher Whack-A-Mole */}
              {activeGame === 'moles' && (
                <div className="w-full h-full flex flex-col relative min-h-[250px]">
                  <div className="absolute top-1 right-1 text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 rounded-full z-10">
                    សិស្ស ៦
                  </div>
                  <div className="text-center mb-3.5 z-10 shrink-0">
                    <h4 className="text-xs font-black text-amber-400">🔨 ល្បែងវាយកម្ទេចភាពធុញថប់ (Stress Smasher)</h4>
                    <p className="text-[9px] text-slate-450 font-semibold leading-normal">វាយសត្រូវស្ត្រេសបន្សុទ្ធចិត្ត! +1 ពិន្ទុ</p>
                  </div>

                  {/* 3x2 Grid for Whack-A-Mole */}
                  <div className="grid grid-cols-3 gap-3 p-1 flex-1 justify-center items-center self-stretch">
                    {molesList.map(mole => (
                      <div 
                        key={mole.id} 
                        className="aspect-square bg-slate-900 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-end overflow-hidden p-1 pb-1.5 shadow-inner"
                      >
                        {/* Hole ellipse */}
                        <div className="absolute bottom-1 w-[80%] h-2 bg-slate-950/90 rounded-full border border-slate-900 ml-[10%]" />
                        
                        {/* Mole image */}
                        <button
                          type="button"
                          onClick={() => mole.isActive && handleWhackMole(mole.id, mole.name)}
                          disabled={!mole.isActive}
                          className={`flex flex-col items-center border-none justify-center bg-transparent p-0 cursor-pointer select-none transition-all duration-300 absolute left-1/2 -translate-x-1/2 z-10 ${
                            mole.isActive 
                              ? 'bottom-2 scale-100 opacity-100' 
                              : 'bottom-[-35px] scale-50 opacity-0 pointer-events-none'
                          }`}
                        >
                          <span className="text-2xl select-none">{mole.emoji}</span>
                          <span className="text-[8px] bg-red-650 text-white font-extrabold px-1 py-0.2 rounded mt-0.5 whitespace-nowrap shadow border border-red-500/20">
                            {mole.name}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : !currentQuestion ? (
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
                <span className="text-indigo-400 font-mono">លេខ {currentRank} / {allStudents.length}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                <span>ពិន្ទុសរុប (Cumulative Points)៖</span>
                <span className="text-amber-400 font-mono text-xs">{joinedStudent.score || 0} ពិន្ទុ</span>
              </div>
            </div>

            {/* Enter Game Zone Button */}
            <button
              type="button"
              onClick={() => {
                setShowGameZone(true);
                setActiveGame('emoji');
              }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-500 via-indigo-600 to-indigo-700 hover:from-teal-600 hover:via-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 border-none relative z-10"
            >
              <span>🎮 លេងហ្គេមកាត់បន្ថយភាពតានតឹង (Relaxation Zone)</span>
            </button>
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

            {/* Enter Game Zone Button */}
            <button
              type="button"
              onClick={() => {
                setShowGameZone(true);
                setActiveGame('emoji');
              }}
              className="w-full py-3 px-5 bg-gradient-to-r from-teal-500 to-indigo-650 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all border-none"
            >
              <span>🎮 លេងហ្គេមកាត់បន្ថយស្ត្រេស (Relax Game)</span>
            </button>
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
                    <span className="w-7 h-7 rounded-xl bg-black/25 flex items-center justify-center font-black text-xs shrink-0 select-none">
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
      
      {/* Shared class celebration overlay banner */}
      {showClassCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-fade-in text-center p-6 pointer-events-none">
          <div className="bg-slate-900 border-2 border-indigo-500/20 p-8 rounded-[3rem] shadow-2xl space-y-4 max-w-sm pointer-events-auto transform animate-bounce">
            <span className="text-5xl select-none animate-pulse">🎉 🎈 🎉</span>
            <h3 className="text-xl font-black text-indigo-400">អបអរសាទរ! (Congratulations!)</h3>
            <p className="text-xs text-slate-200 leading-relaxed font-bold">
              លោកគ្រូ-អ្នកគ្រូ បានចែករំលែកសេចក្ដីរីករាយ និងក្ដីស្រឡាញ់ដល់សិស្សទាំងអស់គ្នាក្នុងថ្នាក់! 💖 🌟
            </p>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono font-black px-3.5 py-1 rounded-full">
              CLASSROOM CARNIVAL CELEBRATION
            </span>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="py-4 text-center shrink-0 border-t border-slate-900/60 font-mono text-[9px] text-slate-500 font-bold tracking-widest">
        ACTIVE MOBILE LIVE TERMINAL
      </footer>
    </div>
  );
}
