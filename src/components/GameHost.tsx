/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { db, auth } from '../firebase';
import { doc, collection, onSnapshot, updateDoc, writeBatch, query, getDocs, orderBy, getDoc, addDoc } from 'firebase/firestore';
import { Sparkles, Trophy, Play, Users, Award, ChevronRight, XCircle, Download, ArrowRight, Volume2, VolumeX, Check, Flame, Hourglass, Home, HelpCircle, Eye, EyeOff, Pause, PlayCircle, Sun, Moon } from 'lucide-react';
import { Game, Player, Question, GameStatus, GameMode, PlayerAnswer } from '../types';
import { gameAudio } from '../utils/audio';
import { shuffleOptionsDeterministically } from '../utils/gamification';
import AnimalAvatar from './AnimalAvatar';

export default function GameHost() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Scoring / Timing refs
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [answersCount, setAnswersCount] = useState(0);

  // Audio Toggle state
  const [soundEnabled, setSoundEnabled] = useState(gameAudio.isSoundEnabled());

  // Maintain background ambient lounge music smoothly for the host
  useEffect(() => {
    const isGameplayActive = game && (game.status === 'lobby' || game.status === 'playing' || game.status === 'leaderboard');
    if (soundEnabled && isGameplayActive) {
      gameAudio.startBackgroundMusic();
    } else {
      gameAudio.stopBackgroundMusic();
    }

    return () => {
      gameAudio.stopBackgroundMusic();
    };
  }, [soundEnabled, game?.status]);

  // Results screen countdown and views state
  const [resultsTimer, setResultsTimer] = useState(5);
  const [isAutopilotPaused, setIsAutopilotPaused] = useState(false);
  const [teacherViewMode, setTeacherViewMode] = useState<'names' | 'stats'>('names');

  // Podium sequential reveal state (staggered 0 to 5)
  const [podiumStep, setPodiumStep] = useState(0);
  const christmasStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (game?.status === 'finished') {
      setPodiumStep(0);
      const timers: NodeJS.Timeout[] = [];
      
      // Step 1: Reveal Rank 5 after 1.5s
      timers.push(setTimeout(() => {
        setPodiumStep(1);
        gameAudio.playFanfare();
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { x: 0.15, y: 0.8 }
        });
      }, 1500));
      
      // Step 2: Reveal Rank 4 after 3.2s
      timers.push(setTimeout(() => {
        setPodiumStep(2);
        gameAudio.playFanfare();
        confetti({
          particleCount: 55,
          spread: 45,
          origin: { x: 0.85, y: 0.8 }
        });
      }, 3200));
      
      // Step 3: Reveal Rank 3 after 4.9s
      timers.push(setTimeout(() => {
        setPodiumStep(3);
        gameAudio.playFanfare();
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { x: 0.35, y: 0.75 }
        });
      }, 4900));
      
      // Step 4: Reveal Rank 2 after 6.6s
      timers.push(setTimeout(() => {
        setPodiumStep(4);
        gameAudio.playFanfare();
        confetti({
          particleCount: 65,
          spread: 50,
          origin: { x: 0.65, y: 0.75 }
        });
      }, 6600));
      
      // Step 5: Reveal Rank 1 after 8.5s (The Grand Winner!)
      timers.push(setTimeout(() => {
        setPodiumStep(5);
        
        // Start the beautiful background Christmas music track!
        if (christmasStopRef.current) christmasStopRef.current();
        christmasStopRef.current = gameAudio.playChristmas();
        
        // Massive, ultra-long-lasting and intense fireworks for Rank 1 champion
        const duration = 10000; // 10 seconds of fireworks (long and many as requested!)
        const end = Date.now() + duration;
        
        const fireworksInterval = setInterval(() => {
          const timeLeft = end - Date.now();
          if (timeLeft <= 0) {
            clearInterval(fireworksInterval);
            return;
          }
          const particleCount = 70 * (timeLeft / duration);
          
          confetti({
            particleCount,
            angle: 60,
            spread: 60,
            origin: { x: 0.1, y: 0.5 },
            colors: ['#FFE066', '#F76707', '#228BE6', '#12B886', '#E64980']
          });
          confetti({
            particleCount,
            angle: 120,
            spread: 60,
            origin: { x: 0.9, y: 0.5 },
            colors: ['#FFE066', '#F76707', '#228BE6', '#12B886', '#E64980']
          });
          confetti({
            particleCount: Math.floor(particleCount * 0.7),
            angle: 90,
            spread: 90,
            origin: { x: 0.5, y: 0.35 },
            colors: ['#FFD700', '#FFFFFF', '#FF3030']
          });
        }, 250);
        
      }, 8500));

      return () => {
        timers.forEach(t => clearTimeout(t));
        if (christmasStopRef.current) {
          christmasStopRef.current();
          christmasStopRef.current = null;
        }
      };
    } else {
      if (christmasStopRef.current) {
        christmasStopRef.current();
        christmasStopRef.current = null;
      }
    }
  }, [game?.status]);

  useEffect(() => {
    return () => {
      if (christmasStopRef.current) {
        christmasStopRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!gameId) return;

    // Load Game and its Questions first
    const setupHost = async () => {
      try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          setErrorMsg('រកមិនឃើញបន្ទប់លេងនេះឡើយ');
          setLoading(false);
          return;
        }

        const gameData = gameSnap.data() as Game;
        setGame({ ...gameData, id: gameSnap.id });

        // Load quiz questions
        const questionsRef = collection(db, `quizzes/${gameData.quizId}/questions`);
        const qSnap = await getDocs(query(questionsRef, orderBy('order', 'asc')));
        
        const qList: Question[] = [];
        qSnap.forEach((doc) => {
          const d = doc.data();
          qList.push({
            id: doc.id,
            quizId: gameData.quizId,
            type: d.type,
            text: d.text,
            imageUrl: d.imageUrl,
            timer: d.timer || 20,
            points: d.points || 1000,
            order: d.order,
            options: d.options,
            correctAnswer: d.correctAnswer,
            matchingPairs: d.matchingPairs
          });
        });

        setQuestions(qList);

        // Subscribe to player joins real-time
        const playersRef = collection(db, `games/${gameId}/players`);
        const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
          const activePlayers: Player[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            activePlayers.push({
              id: doc.id,
              gameId: gameId,
              nickname: d.nickname,
              score: d.score || 0,
              streak: d.streak || 0,
              correctCount: d.correctCount || 0,
              joinedAt: d.joinedAt,
              lastAnsweredQuestionIndex: d.lastAnsweredQuestionIndex !== undefined ? d.lastAnsweredQuestionIndex : -1,
              answers: d.answers || {},
              avatarSeed: d.avatarSeed || d.blook || 'turtle'
            } as any);
          });
          setPlayers(activePlayers);
        });

        // Listen for live updates on the game itself to sync client commands
        const unsubGame = onSnapshot(gameRef, (snapshot) => {
          if (snapshot.exists()) {
            setGame({ ...(snapshot.data() as Game), id: snapshot.id });
          }
        });

        setLoading(false);

        return () => {
          unsubPlayers();
          unsubGame();
          if (timerRef.current) clearInterval(timerRef.current);
        };
      } catch (err) {
        console.error(err);
        setErrorMsg('កំហុសផ្ទុកទិន្នន័យបន្ទប់លេង');
        setLoading(false);
      }
    };

    setupHost();
  }, [gameId]);

  // Handle countdown timer loops for questions
  useEffect(() => {
    if (!game) return;

    if (game.status === 'playing' && game.questionStatus === 'counting_down') {
      const activeQ = questions[game.currentQuestionIndex];
      if (!activeQ) return;

      setTimeLeft(activeQ.timer);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeOut();
            return 0;
          }
          gameAudio.playTick();
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.status, game?.currentQuestionIndex, game?.questionStatus]);

  // Track how many players have answered current question
  useEffect(() => {
    if (!game || game.status !== 'playing') return;
    const answered = players.filter(p => p.lastAnsweredQuestionIndex === game.currentQuestionIndex).length;
    setAnswersCount(answered);

    // Auto trigger time out if 100% of players answered (only if players count is > 0)
    if (players.length > 0 && answered === players.length && game.questionStatus === 'counting_down') {
      handleTimeOut();
    }
  }, [players, game?.currentQuestionIndex, game?.questionStatus]);

  // Automated 5-second countdown on Times Up results screen to go to next question
  useEffect(() => {
    if (!game || game.status !== 'playing' || game.questionStatus !== 'times_up') {
      setResultsTimer(5);
      return;
    }

    if (isAutopilotPaused) {
      return;
    }

    setResultsTimer(5);

    const interval = setInterval(() => {
      setResultsTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Advance game to next question
          nextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.status, game?.currentQuestionIndex, game?.questionStatus, isAutopilotPaused]);

  const handleTimeOut = async () => {
    if (!gameId) return;
    gameAudio.playFireworkWhistle();
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        questionStatus: 'times_up'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const kickPlayer = async (playerId: string) => {
    gameAudio.playTick();
    if (!window.confirm('តើលោកគ្រូចង់បណ្តេញសិស្សម្នាក់នេះចេញពីហ្គេមមែនទេ?')) return;
    try {
      const pBatch = writeBatch(db);
      // Delete player record
      pBatch.delete(doc(db, `games/${gameId}/players`, playerId));
      await pBatch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const startGame = async () => {
    gameAudio.playTick();
    if (players.length === 0) {
      alert('សូមរង់ចាំសិស្សចូលរួមយ៉ាងហោចណាស់ ១ នាក់!');
      return;
    }
    if (!gameId) return;

    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'playing',
        currentQuestionIndex: 0,
        questionStatus: 'showing',
        currentQuestionStartedAt: new Date().toISOString()
      });

      // Show intro splash, then start ticking down automatically
      setTimeout(async () => {
        await updateDoc(gameRef, {
          questionStatus: 'counting_down'
        });
      }, 3500);

    } catch (e) {
      console.error(e);
    }
  };

  const nextQuestion = async () => {
    gameAudio.playTick();
    if (!game || !gameId) return;

    const nextIdx = game.currentQuestionIndex + 1;
    if (nextIdx >= questions.length) {
      // Completed all questions, show final rankings state
      try {
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          status: 'finished'
        });
        
        // Save historical result
        const getHostId = () => {
          if (auth.currentUser?.uid) return auth.currentUser.uid;
          const local = localStorage.getItem('studyplay_teacher_session');
          if (local) {
            try {
              return JSON.parse(local).uid || '';
            } catch (e) {}
          }
          return '';
        };

        const sorted = [...players].sort((a,b) => b.score - a.score);
        await addDoc(collection(db, 'results'), {
          gameId,
          quizId: game.quizId,
          quizTitle: game.quizTitle,
          hostId: getHostId(),
          playerCount: players.length,
          topPlayers: sorted.slice(0, 3).map(p => ({ nickname: p.nickname, score: p.score })),
          playedAt: new Date().toISOString()
        });

        gameAudio.playFanfare();
      } catch (err) {
        console.error(err);
      }
    } else {
      // Move to next question template
      try {
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          currentQuestionIndex: nextIdx,
          questionStatus: 'showing',
          currentQuestionStartedAt: new Date().toISOString()
        });

        setTimeout(async () => {
          await updateDoc(gameRef, {
            questionStatus: 'counting_down'
          });
        }, 3500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const showLeaderboard = async () => {
    gameAudio.playTick();
    if (!gameId) return;
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'leaderboard'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const resumePlaying = async () => {
    gameAudio.playTick();
    if (!gameId) return;
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'playing'
      });
      nextQuestion();
    } catch (err) {
      console.error(err);
    }
  };

  const downloadResultsExcel = () => {
    gameAudio.playTick();
    const sorted = [...players].sort((a,b) => b.score - a.score);
    // Adding UTF-8 BOM (\ufeff) so Excel displays Khmer unicode characters correctly
    let csvContent = "\ufeffចំណាត់ថ្នាក់,ឈ្មោះសិស្ស,ពិន្ទុ,ចំនួនឆ្លើយត្រូវ\n";
    
    sorted.forEach((p, idx) => {
      csvContent += `${idx + 1},${p.nickname},${p.score},${p.correctCount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `លទ្ធផល_StudyPlay_${game?.quizTitle || 'Result'}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-sm">កំពុងផ្ទុកទិន្នន័យបន្ទប់...</span>
      </div>
    );
  }

  if (errorMsg || !game) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <p className="text-red-400 font-bold mb-4">{errorMsg || 'ហ្គេមមិនមានសុពលភាព'}</p>
        <button onClick={() => navigate('/teacher')} className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold">
          ចាកចេញ
        </button>
      </div>
    );
  }

  const activeQ = questions[game.currentQuestionIndex];
  const joinUrl = `${window.location.origin}/#/join?code=${game.gameCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=4f46e5&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Top Header Controls */}
      <header className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/')}>
            StudyPlay Host
          </span>
          <span className="text-2xs bg-slate-800 border border-slate-700 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold select-none font-sans">
            {game.gameMode === 'classic' ? 'របៀបបុរាណ (Classic)' : 'របៀបលឿន (Speed)'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              gameAudio.playTick();
              if (window.confirm("តើអ្នកពិតជាចង់ចាកចេញពីបន្ទប់លេង StudyPlay Host និងត្រឡប់ទៅកាន់បន្ទះគ្រប់គ្រងគ្រូមែនទេ?")) {
                navigate('/teacher');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            id="back-to-home-host-btn"
          >
            <Home className="w-3.5 h-3.5" />
            <span>ចាកចេញ</span>
          </button>

          <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center space-x-1 font-mono">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 font-extrabold">{players.length} នាក់</span>
          </div>

          <button
            onClick={() => {
              const next = gameAudio.toggleSound();
              setSoundEnabled(next);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Theme switcher */}
          <button
            onClick={() => {
              gameAudio.playTick();
              setIsLightMode(!isLightMode);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-indigo-400 cursor-pointer"
            title={isLightMode ? "ប្តូរទៅរបៀបងងឹត" : "ប្តូរទៅរបៀបភ្លឺ"}
          >
            {isLightMode ? <Moon className="w-4 h-4 text-amber-500" /> : <Sun className="w-4 h-4 text-yellow-300" />}
          </button>
        </div>
      </header>

      {/* Main Board View depending on status */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col justify-center">

        {/* 1. LOBBY STATE */}
        {game.status === 'lobby' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center my-auto">
            {/* Left Block: QR & Join Instructions */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-2xl">
              <div>
                <span className="text-3xs text-slate-400 font-bold uppercase tracking-widest block mb-1">ស្កេន ឬចូលបន្ទប់លេងរហ័ស</span>
                <h1 className="text-4xl font-extrabold text-white">ចូលរួមលេងជាមួយ PIN</h1>
              </div>

              {/* Live QR Code Generator */}
              <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg transform hover:scale-102 transition">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2">
                <span className="text-4xs text-slate-400 block">គេហទំព័រចូលរួម៖</span>
                <span className="text-xs font-mono text-indigo-300 bg-slate-950 px-3 py-1.5 rounded-lg select-all border border-slate-850">
                  {joinUrl.replace('http://', '').replace('https://', '')}
                </span>
                <div className="text-5xl font-black text-white font-mono tracking-widest mt-4">
                  {game.gameCode}
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black py-4 rounded-xl text-center shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                id="start-game-btn"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>ចាប់ផ្តើមប្រកួត ({players.length} នាក់)</span>
              </button>
            </div>

            {/* Right Block: Student Lobbies join grid */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between self-stretch min-h-[400px]">
              <div>
                <h2 className="text-base font-black text-slate-300 flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>សិស្សានុសិស្សដែលបានចូលរួម ({players.length})</span>
                </h2>

                {players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                    <Hourglass className="w-10 h-10 animate-bounce text-indigo-500" />
                    <p className="text-xs">កំពុងរង់ចាំសិស្សវាយកូដហ្គេម ចូលរួម...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                    {players.map((p) => {
                      return (
                        <div
                          key={p.id}
                          onClick={() => kickPlayer(p.id)}
                          className="bg-slate-800/80 hover:bg-red-950/20 border border-slate-700/40 hover:border-red-500/30 p-2.5 rounded-xl flex items-center space-x-2 cursor-pointer transition transform hover:scale-103 group select-none relative"
                        >
                          <span className="text-sm">🐒</span>
                          <span className="text-xs text-slate-200 font-bold truncate flex-1 md:text-sm">
                            {p.nickname}
                          </span>
                          <XCircle className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-4xs text-slate-500 border-t border-slate-800/80 pt-4 text-center">
                💡 លោកគ្រូអាចចុចលើឈ្មោះស្វ័យប្រវត្តិនៃសិស្សម្នាក់ៗ ដើម្បីបណ្តេញចេញពីបន្ទប់លេង។
              </div>
            </div>
          </div>
        )}

        {/* 2. PLAYING STATE: PRE-SPLASH PREPARATION */}
        {game.status === 'playing' && game.questionStatus === 'showing' && activeQ && (
          <div className="text-center space-y-8 my-auto animate-fade-in py-16">
            <div className="inline-flex items-center space-x-2 bg-indigo-550/15 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/20">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>រៀបចំខ្លួនឆ្លើយសំណួរទី {game.currentQuestionIndex + 1}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-4xl mx-auto">
              {activeQ.text}
            </h1>

            <div className="flex justify-center space-x-1 font-mono text-2xl font-black text-amber-400">
              <span>ចាប់ផ្តើមក្នុងរយៈពេលខ្លី...</span>
            </div>
          </div>
        )}

        {/* 3. PLAYING STATE: ACTIVE QUESTION Ticking down */}
        {game.status === 'playing' && game.questionStatus === 'counting_down' && activeQ && (
          <div className="space-y-8 my-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              
              {/* Left Column: Timer Ring / stats */}
              <div className="text-center lg:text-left space-y-6">
                <div className="relative w-32 h-32 mx-auto lg:mx-0 flex items-center justify-center bg-slate-900 rounded-full border-4 border-indigo-500 text-center shadow-indigo-550/10 shadow-xl">
                  <div>
                    <span className="text-4xl font-black text-white font-mono">{timeLeft}</span>
                    <span className="text-4xs text-slate-400 block font-bold uppercase tracking-wider mt-1">វិនាទី</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between">
                  <div>
                    <span className="text-4xs text-slate-500 font-bold block mb-1">ឆ្លើយរួចរាល់</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">{answersCount} / {players.length}</span>
                  </div>
                  <div>
                    <span className="text-4xs text-slate-500 font-bold block mb-1">សំណួរ</span>
                    <span className="text-xl font-bold text-white font-mono">{game.currentQuestionIndex + 1}/{questions.length}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Question + Options presentation (Large size) */}
              <div className="lg:col-span-3 bg-slate-900/60 border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {activeQ.text}
                </h1>

                {activeQ.imageUrl && (
                  <div className="w-full max-h-[220px] rounded-2xl overflow-hidden shadow-lg border border-slate-700/40">
                    <img 
                      src={activeQ.imageUrl} 
                      alt="Question Spec" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Multiple choice options tiles */}
                {activeQ.type === 'multiple_choice' && activeQ.options && (() => {
                  const isKhmer = /[\u1780-\u17FF]/.test(activeQ.text || '') || activeQ.options.some(o => /[\u1780-\u17FF]/.test(o));
                  const seed = (gameId || '') + '_' + game.currentQuestionIndex;
                  const shuffledOptions = shuffleOptionsDeterministically(activeQ.options, seed);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {shuffledOptions.map((opt, idx) => {
                        const label = isKhmer
                          ? (idx === 0 ? 'ក' : idx === 1 ? 'ខ' : idx === 2 ? 'គ' : 'ឃ')
                          : (idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D');
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold border ${
                              idx === 0 ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                              idx === 1 ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                              idx === 2 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            <span className="w-6 h-6 rounded bg-slate-850 flex items-center justify-center font-black">
                              {label}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* True/False */}
                {activeQ.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center text-emerald-300 font-bold text-sm">
                      ត្រូវ (True)
                    </div>
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-300 font-bold text-sm">
                      ខុស (False)
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 4. TIMES UP / FEEDBACK VIEW */}
        {game.status === 'playing' && game.questionStatus === 'times_up' && activeQ && (() => {
          const answersOfCurrentQ = players.reduce((acc, p) => {
            const ansObj = p.answers[game.currentQuestionIndex.toString()];
            if (ansObj) {
              acc[p.id] = ansObj;
            }
            return acc;
          }, {} as { [pId: string]: PlayerAnswer });

          const correctList = players.filter(p => answersOfCurrentQ[p.id]?.isCorrect === true);
          const incorrectList = players.filter(p => answersOfCurrentQ[p.id] && answersOfCurrentQ[p.id].isCorrect === false);
          const unansweredList = players.filter(p => !answersOfCurrentQ[p.id]);
          const accPercentage = players.length > 0 ? Math.round((correctList.length / players.length) * 100) : 0;

          return (
            <div className="space-y-6 my-auto animate-fade-in w-full">
              {/* Confetti Visual Feedback simulation */}
              {correctList.length > 0 && (
                <div className="absolute inset-x-0 top-0 pointer-events-none flex justify-center overflow-hidden h-40">
                  <span className="text-xl animate-bounce delay-100">🎉</span>
                  <span className="text-xl animate-bounce delay-200">✨</span>
                  <span className="text-xl animate-bounce delay-300">🌟</span>
                  <span className="text-xl animate-bounce delay-150">🎉</span>
                  <span className="text-xl animate-bounce delay-500">✨</span>
                </div>
              )}

              {/* Title Header with interactive toggle */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-3xl gap-4">
                <div>
                  <h1 className="text-sm md:text-base font-black text-white">
                    📊 លទ្ធផលឆ្លើយសំណួរទី {game.currentQuestionIndex + 1}
                  </h1>
                  <p className="text-3xs text-slate-400 mt-1">
                    សិស្ស {players.filter(p => answersOfCurrentQ[p.id]).length} នាក់បានឆ្លើយរួចរាល់ ក្នុងចំណោមសិស្សរួម {players.length} នាក់
                  </p>
                </div>

                {/* Switch view buttons */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setTeacherViewMode('names')}
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                      teacherViewMode === 'names'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-355'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>លទ្ធផលឈ្មោះសិស្ស ({players.length})</span>
                  </button>
                  <button
                    onClick={() => setTeacherViewMode('stats')}
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
                      teacherViewMode === 'stats'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-355'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>ស្ថិតិសង្ខេបរួម</span>
                  </button>
                </div>
              </div>

              {/* Core Display depending on viewing style */}
              {teacherViewMode === 'names' ? (
                /* SHOW ALL NAMES SECTIONS */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Correct Students column */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-5 space-y-3">
                    <h2 className="text-xs font-black text-emerald-400 flex items-center space-x-2 pb-2 border-b border-emerald-900/30">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xs">✅</span>
                      <span>សិស្សធ្វើត្រូវ ({correctList.length} នាក់)</span>
                    </h2>
                    
                    {correctList.length === 0 ? (
                      <p className="text-3xs text-slate-500 text-center py-6">គ្មានសិស្សឆ្លើយត្រូវឡើយ</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {correctList.map((p) => {
                          const ansObj = answersOfCurrentQ[p.id];
                          return (
                            <div key={p.id} className="bg-slate-900/70 border border-emerald-500/10 rounded-xl p-2.5 flex items-center justify-between">
                              <div className="flex items-center space-x-2 shrink-0">
                                <AnimalAvatar id={p.avatarSeed || 'turtle'} size={24} />
                                <span className="text-3xs font-bold text-white truncate max-w-[80px]">{p.nickname}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-3xs text-emerald-400 font-extrabold font-mono font-black block">+{ansObj?.scoreGained || 0}</span>
                                <span className="text-4xs text-slate-500 font-semibold">សរុប៖ {p.score}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Incorrect Students column */}
                  <div className="bg-red-950/20 border border-red-500/20 rounded-3xl p-5 space-y-3">
                    <h2 className="text-xs font-black text-red-400 flex items-center space-x-2 pb-2 border-b border-red-900/30">
                      <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-3xs">❌</span>
                      <span>សិស្សធ្វើខុស ({incorrectList.length} នាក់)</span>
                    </h2>
                    
                    {incorrectList.length === 0 ? (
                      <p className="text-3xs text-slate-500 text-center py-6">គ្មានសិស្សឆ្លើយខុសឡើយ</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {incorrectList.map((p) => (
                          <div key={p.id} className="bg-slate-900/70 border border-red-500/10 rounded-xl p-2.5 flex items-center justify-between">
                            <div className="flex items-center space-x-2 shrink-0">
                              <AnimalAvatar id={p.avatarSeed || 'turtle'} size={24} />
                              <span className="text-3xs font-bold text-white truncate max-w-[80px]">{p.nickname}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-3xs text-red-400 font-extrabold font-black block">+0</span>
                              <span className="text-4xs text-slate-500 font-semibold">សរុប៖ {p.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Unanswered Students column */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <h2 className="text-xs font-black text-slate-400 flex items-center space-x-2 pb-2 border-b border-slate-800/60">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-3xs font-sans">⏰</span>
                      <span>មិនបានឆ្លើយ ({unansweredList.length} នាក់)</span>
                    </h2>
                    
                    {unansweredList.length === 0 ? (
                      <p className="text-3xs text-slate-500 text-center py-6">គ្រប់គ្នាបានចូលរួមឆ្លើយទាំងអស់គ្នា</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {unansweredList.map((p) => (
                          <div key={p.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                            <div className="flex items-center space-x-2 shrink-0">
                              <AnimalAvatar id={p.avatarSeed || 'turtle'} size={24} />
                              <span className="text-3xs font-bold text-slate-300 truncate max-w-[80px]">{p.nickname}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-3xs text-slate-500 font-black block">No Ans</span>
                              <span className="text-4xs text-slate-600 font-semibold">សរុប៖ {p.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* SHOW METRICS AND STATISTICS ONLY */
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl">
                  {/* Score accuracy block with side graphs */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-4 text-center space-y-2">
                      <div className="relative w-36 h-36 mx-auto flex items-center justify-center bg-slate-950 rounded-full border-8 border-indigo-650 shadow-indigo-900/30 shadow-2xl">
                        <div>
                          <span className="text-3xl font-black text-white font-mono">{accPercentage}%</span>
                          <span className="text-4xs text-slate-400 font-bold block uppercase tracking-wider mt-1">ភាពត្រឹមត្រូវគិតជាក្រុម</span>
                        </div>
                      </div>
                      <p className="text-2xs text-indigo-400 font-semibold mt-3">ភាគរយឆ្លើយត្រូវរបស់ថ្នាក់សរុប</p>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex flex-col justify-between">
                        <span className="text-4xs text-slate-400 block font-bold">✅ ឆ្លើយត្រូវសរុប</span>
                        <div className="flex items-baseline space-x-1.5 mt-2">
                          <span className="text-2xl font-black text-emerald-400 font-mono">{correctList.length}</span>
                          <span className="text-4xs text-slate-500 font-bold">នាក់</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex flex-col justify-between">
                        <span className="text-4xs text-slate-400 block font-bold">❌ ឆ្លើយខុសសរុប</span>
                        <div className="flex items-baseline space-x-1.5 mt-2">
                          <span className="text-2xl font-black text-red-400 font-mono">{incorrectList.length}</span>
                          <span className="text-4xs text-slate-500 font-bold">នាក់</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex flex-col justify-between">
                        <span className="text-4xs text-slate-400 block font-bold">⏰ មិនបានឆ្លើយ (No Answered)</span>
                        <div className="flex items-baseline space-x-1.5 mt-2">
                          <span className="text-2xl font-black text-amber-500 font-mono">{unansweredList.length}</span>
                          <span className="text-4xs text-slate-500 font-bold">នាក់</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex flex-col justify-between">
                        <span className="text-4xs text-slate-400 block font-bold">👥 សិស្សសកម្មសរុប</span>
                        <div className="flex items-baseline space-x-1.5 mt-2">
                          <span className="text-2xl font-black text-indigo-400 font-mono">{players.length}</span>
                          <span className="text-4xs text-slate-500 font-bold">នាក់</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Question Solution details with explanation & difficulty if present */}
              {activeQ && (activeQ.explanation || activeQ.difficulty) && (
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                       <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                         <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">💡</span>
                         <span>ចម្លើយត្រឹមត្រូវគឺ៖</span>
                       </span>
                       <span className="px-3 py-1 rounded bg-emerald-500/15 border border-emerald-500/20 text-3xs font-extrabold text-emerald-400">
                         {activeQ.correctAnswer || '---'}
                       </span>
                    </div>

                    {activeQ.difficulty && (
                      <span className={`px-2.5 py-0.5 rounded-full text-4xs font-black uppercase tracking-wider ${
                        activeQ.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                        activeQ.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        កម្រិត៖ {activeQ.difficulty === 'easy' ? 'ងាយស្រួល' : activeQ.difficulty === 'medium' ? 'មធ្យម' : 'ពិបាក'}
                      </span>
                    )}
                  </div>

                  {activeQ.explanation && (
                    <p className="text-xs text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                      <strong className="text-indigo-400 font-extrabold not-italic block mb-1">📢 ការពន្យល់ (Explanation)៖</strong>
                      "{activeQ.explanation}"
                    </p>
                  )}
                </div>
              )}

              {/* Autopilot bottom bar status and controls */}
              <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-3 text-white text-xs font-semibold">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span className="text-xs">
                    {isAutopilotPaused ? (
                      <span className="text-amber-400">⏱️ អូតូអ្នកបើកបរត្រូវបានផ្អាក។ សូមចុចបន្តដើម្បីបន្តសំណួរ...</span>
                    ) : (
                      <span>ស្វ័យប្រវត្តិកំពុងឆ្ពោះទៅសំណួរបន្ទាប់ក្នុងរយៈពេល <strong className="text-indigo-400 font-mono text-sm">{resultsTimer}</strong> វិនាទី...</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      gameAudio.playTick();
                      setIsAutopilotPaused(!isAutopilotPaused);
                    }}
                    className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-3xs font-bold font-black border flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                      isAutopilotPaused
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAutopilotPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isAutopilotPaused ? 'បន្តរត់ស្វ័យប្រវត្តិ' : 'ផ្អាកការបន្ត'}</span>
                  </button>

                  <button
                    onClick={() => nextQuestion()}
                    className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-550 text-white font-black py-2.5 px-5 rounded-xl text-3xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>បន្តភ្លាមៗ</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5. LEADERBOARD / SCORE INTERMEDIATE STATE */}
        {game.status === 'leaderboard' && (
          <div className="space-y-8 my-auto animate-fade-in max-w-2xl mx-auto w-full">
            <div className="text-center space-y-2">
              <span className="text-3xs text-indigo-400 font-bold uppercase tracking-widest block">ពិន្ទុសរុបបច្ចុប្បន្ន</span>
              <h1 className="text-3xl font-black text-white flex items-center justify-center space-x-2">
                <Trophy className="w-7 h-7 text-yellow-500" />
                <span>តារាងពិន្ទុកំពូលទាំង ៥</span>
              </h1>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl divide-y divide-slate-800/80">
              {[...players].sort((a,b) => b.score - a.score).slice(0, 5).map((p, idx) => {
                return (
                  <div key={p.id} className="flex items-center justify-between py-4 first:pt-2 last:pb-2">
                    <div className="flex items-center space-x-4">
                      {/* rank badge */}
                      <span className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center ${
                        idx === 0 ? 'bg-yellow-500 text-slate-950 font-mono ring-4 ring-yellow-500/20' :
                        idx === 1 ? 'bg-slate-300 text-slate-950 font-mono' :
                        idx === 2 ? 'bg-amber-600 text-white font-mono' :
                        'bg-slate-800 text-slate-400 font-mono'
                      }`}>
                        {idx + 1}
                      </span>

                      <div className="flex items-center space-x-2">
                        <AnimalAvatar id={p.avatarSeed || 'turtle'} size={32} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-100">{p.nickname}</span>
                          <span className="text-4xs text-slate-500 font-semibold">{p.correctCount} ឆ្លើយត្រូវ</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-base font-black font-mono text-emerald-400">
                        {p.score} <span className="text-3xs text-slate-500 font-sans">ពិន្ទុ</span>
                      </span>
                      {p.streak >= 3 && (
                        <span className="bg-red-500/10 text-red-400 text-3xs font-bold px-2 py-0.5 rounded-full flex items-center space-x-0.5">
                          <Flame className="w-3 h-3 text-red-500 fill-current" />
                          <span>{p.streak}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={resumePlaying}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-black py-4 rounded-xl text-center shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
              id="next-question-btn"
            >
              <span>{game.currentQuestionIndex + 1 >= questions.length ? 'បញ្ចប់ការប្រកួត' : 'សំណួរបន្ទាប់'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 6. WINNER PODIUM FINISHED STATE */}
        {game.status === 'finished' && (() => {
          const sortedPlayers = [...players].sort((a,b) => b.score - a.score);
          
          const renderPedestal = (
            rank: number, 
            playIndex: number, 
            requiredStep: number, 
            minHeightClass: string, 
            avatarSize: number, 
            trophyEmoji: string, 
            bgClass: string, 
            borderClass: string
          ) => {
            const p = sortedPlayers[playIndex];
            if (!p) {
              return (
                <div className={`w-full sm:w-1/5 ${minHeightClass} opacity-10 flex flex-col items-center justify-end p-2 border border-dashed border-slate-700 rounded-2xl`}>
                  <span className="text-[10px] text-slate-550 font-bold block mb-1">គ្មានសិស្សទី {rank}</span>
                </div>
              );
            }

            const isVisible = podiumStep >= requiredStep;

            if (!isVisible) {
              return (
                <div className={`w-full sm:w-1/5 ${minHeightClass} flex flex-col items-center justify-end p-4 border border-slate-800 bg-slate-900/40 rounded-t-2xl animate-pulse space-y-2`}>
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 font-extrabold text-xs">
                    ?
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold block">រង់ចាំជ័យលាភី...</div>
                </div>
              );
            }

            return (
              <div 
                className="w-full sm:w-1/5 space-y-2 md:space-y-3 flex flex-col items-center transform scale-100 transition-all duration-700 animate-zoom-in"
                style={{ contentVisibility: 'auto' }}
              >
                <div className="text-3xl md:text-4xl filter drop-shadow">{trophyEmoji}</div>
                <AnimalAvatar id={p.avatarSeed || 'turtle'} size={avatarSize} />
                <span className="max-w-[120px] truncate font-extrabold text-slate-200 text-xs md:text-sm" title={p.nickname}>
                  {p.nickname}
                </span>
                <div className={`w-full rounded-t-2xl pt-6 pb-4 px-2 text-center shadow-lg flex flex-col justify-end ${bgClass} ${borderClass} ${minHeightClass}`}>
                  <span className="text-[9px] text-slate-350 font-black tracking-wider block uppercase mb-1">លេខ {rank}</span>
                  <span className="text-sm md:text-base font-black text-white font-mono block break-all">
                    {p.score} <span className="text-[9px] font-sans text-slate-400 font-normal">ពិន្ទុ</span>
                  </span>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-8 my-auto animate-fade-in text-center w-full">
              
              <div className="inline-flex items-center space-x-2 bg-amber-500/15 text-amber-400 text-xs px-3.5 py-1 rounded-full border border-amber-500/25">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>ការប្រកួតត្រូវបានបញ្ចប់ដោយជោគជ័យ</span>
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                  ម្ចាស់ជ័យលាភី StudyPlay 🏆
                </h1>
                <p className="text-xs text-slate-400 mt-2">
                  បង្ហាញជ័យលាភីជាបន្តបន្ទាប់ពីលេខ ៥ ដល់ លេខ ១ (Grand Winner)
                </p>
              </div>

              {/* Symmetrical mountain layout structure inside a grid-like container */}
              <div className="flex flex-col sm:flex-row justify-center items-end gap-3 sm:gap-4 md:gap-5 pt-8 max-w-5xl mx-auto px-4">
                
                {/* 1. Leftmost Place: Rank 5 (Revealed Step 1) */}
                {renderPedestal(5, 4, 1, 'min-h-[85px]', 40, '🎖️ ៥', 'bg-slate-850/80', 'border-t-2 border-slate-700/60')}

                {/* 2. Inner Left Place: Rank 3 (Revealed Step 3) */}
                {renderPedestal(3, 2, 3, 'min-h-[125px]', 52, '🥉 ៣', 'bg-gradient-to-t from-orange-950/40 to-amber-900/30', 'border-t-2 border-amber-700/40')}

                {/* 3. CENTER PLACE: Rank 1 (Revealed Step 5!) */}
                {renderPedestal(1, 0, 5, 'min-h-[200px]', 72, '👑 🥇', 'bg-gradient-to-t from-indigo-900/90 to-indigo-850 ring-4 ring-yellow-500/30 ring-offset-2 ring-offset-slate-950', 'border-t-4 border-yellow-500')}

                {/* 4. Inner Right Place: Rank 2 (Revealed Step 4) */}
                {renderPedestal(2, 1, 4, 'min-h-[160px]', 62, '🥈 ២', 'bg-slate-800/90 border-t-2', 'border-slate-500/40')}

                {/* 5. Rightmost Place: Rank 4 (Revealed Step 2) */}
                {renderPedestal(4, 3, 2, 'min-h-[105px]', 46, '🎖️ ៤', 'bg-slate-850/80', 'border-t-2 border-slate-705/60')}

              </div>

              {/* Downloader Result stats */}
              <div className="pt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={downloadResultsExcel}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg cursor-pointer transition transform hover:scale-102"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>ទាញយកលទ្ធផលសិស្ស .xlsx</span>
                </button>

                <button
                  onClick={() => navigate('/teacher')}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl cursor-pointer"
                >
                  <span>ត្រឡប់ទៅបន្ទះគ្រប់គ្រង</span>
                </button>
              </div>
            </div>
          );
        })()}

      </main>

      <footer className="bg-slate-900/60 border-t border-slate-850 py-4 text-center text-xs text-slate-550 select-none">
        <p>&copy; 2026 StudyPlay. បង្កើតឡើងជាពិសេសសម្រាប់ភាសាខ្មែរ ប្រើប្រាស់ពុម្ពអក្សរបាត់ដំបង។</p>
      </footer>
    </div>
  );
}
