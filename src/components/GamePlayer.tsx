/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, collection, onSnapshot, getDocs, orderBy, query, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Trophy, Star, Flame, Award, Check, X, ShieldAlert, Sparkles, Volume2, VolumeX, Landmark, Sun, Moon } from 'lucide-react';
import { Game, Player, Question, PlayerAnswer } from '../types';
import { gameAudio } from '../utils/audio';
import { getLevelFromXP, ACHIEVEMENTS, shuffleOptionsDeterministically } from '../utils/gamification';
import AnimalAvatar from './AnimalAvatar';

export default function GamePlayer() {
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

  const studentName = searchParams.get('name') || 'សិស្សលាក់មុខ';
  const studentBlook = searchParams.get('blook') || 'turtle';

  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Player answer state
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats updates tracking at game end
  const [xpAwarded, setXpAwarded] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(gameAudio.isSoundEnabled());

  useEffect(() => {
    if (!gameId) return;

    const setupPlayerSession = async () => {
      try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          setErrorMsg('រកមិនឃើញបន្ទប់លេងជាមួយកូដនេះឡើយ!');
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

        // Try dynamically registering student in players subcollection if not present
        // Let's check if they exist or register them
        const playerId = localStorage.getItem(`sp_pid_${gameId}`) || `p_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(`sp_pid_${gameId}`, playerId);

        const playerRef = doc(db, `games/${gameId}/players`, playerId);
        const playerSnap = await getDoc(playerRef);

        if (!playerSnap.exists()) {
          // Add default student doc to room using setDoc since document doesn't exist yet!
          await setDoc(doc(db, `games/${gameId}/players`, playerId), {
            id: playerId,
            gameId: gameId,
            nickname: studentName,
            score: 0,
            streak: 0,
            correctCount: 0,
            joinedAt: new Date().toISOString(),
            lastAnsweredQuestionIndex: -1,
            answers: {},
            blook: studentBlook,
            avatarSeed: studentBlook
          } as any);
        }

        // Real-time subscribe to our student document
        const unsubPlayer = onSnapshot(playerRef, (snapshot) => {
          if (snapshot.exists()) {
            setPlayer({ ...(snapshot.data() as any), id: snapshot.id });
          }
        });

        // Realtime sync live Game room states
        const unsubGame = onSnapshot(gameRef, (snapshot) => {
          if (snapshot.exists()) {
            const upGame = snapshot.data() as Game;
            setGame({ ...upGame, id: snapshot.id });
          }
        });

        setLoading(false);

        return () => {
          unsubPlayer();
          unsubGame();
          if (timerRef.current) clearInterval(timerRef.current);
        };
      } catch (err) {
        console.error(err);
        setErrorMsg('មានបញ្ហាក្នុងការចងភ្ជាប់ទៅបន្ទប់លេង');
        setLoading(false);
      }
    };

    setupPlayerSession();
  }, [gameId]);

  // Synchronize dynamic ticking for active question
  useEffect(() => {
    if (!game || !player) return;

    if (game.status === 'playing' && game.questionStatus === 'counting_down') {
      const activeQ = questions[game.currentQuestionIndex];
      if (!activeQ) return;

      setTimeLeft(activeQ.timer);
      setHasAnsweredCurrent(player.lastAnsweredQuestionIndex === game.currentQuestionIndex);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.status, game?.currentQuestionIndex, game?.questionStatus, player?.id]);

  // Award stats gamification once game hits 'finished'
  useEffect(() => {
    if (game?.status === 'finished' && player && xpAwarded === 0) {
      // Award XP
      const baseScore = player.score;
      const calculatedXp = Math.floor(baseScore / 8) + 120; // XP gained from performance
      setXpAwarded(calculatedXp);

      // Read standard stats
      const currentStatsXp = parseInt(localStorage.getItem('studyplay_xp') || '0', 10);
      const newXp = currentStatsXp + calculatedXp;
      localStorage.setItem('studyplay_xp', newXp.toString());

      // Badge achievements check
      const badgesHistory = JSON.parse(localStorage.getItem('studyplay_badges') || '[]');
      if (!badgesHistory.includes('first_game')) {
        badgesHistory.push('first_game');
      }
      if (player.streak >= 3 && !badgesHistory.includes('streak_3')) {
        badgesHistory.push('streak_3');
      }
      if (player.correctCount === questions.length && questions.length > 0 && !badgesHistory.includes('perfect_score')) {
        badgesHistory.push('perfect_score');
      }
      localStorage.setItem('studyplay_badges', JSON.stringify(badgesHistory));

      // Calculate streak day
      const currentStreakDays = parseInt(localStorage.getItem('studyplay_streak') || '0', 10);
      localStorage.setItem('studyplay_streak', (currentStreakDays + 1).toString());
    }
  }, [game?.status]);

  const handleToggleSound = () => {
    const nextVal = gameAudio.toggleSound();
    setAudioEnabled(nextVal);
    gameAudio.playTick();
  };

  // Maintain background ambient lounge music smoothly
  useEffect(() => {
    const isGameplayActive = game && (game.status === 'lobby' || game.status === 'playing' || game.status === 'leaderboard');
    if (audioEnabled && isGameplayActive) {
      gameAudio.startBackgroundMusic();
    } else {
      gameAudio.stopBackgroundMusic();
    }

    return () => {
      gameAudio.stopBackgroundMusic();
    };
  }, [audioEnabled, game?.status]);

  const handleAnswerResponseSubmit = async (answer: string) => {
    if (hasAnsweredCurrent || !game || !player || !gameId) return;

    gameAudio.playTick();
    setHasAnsweredCurrent(true);
    setSelectedResponse(answer);

    const activeQ = questions[game.currentQuestionIndex];
    if (!activeQ) return;

    const isCorrect = answer.trim().toLowerCase() === activeQ.correctAnswer.trim().toLowerCase();

    // Sound alert feedback instantly
    if (isCorrect) {
      gameAudio.playCorrect();
    } else {
      gameAudio.playWrong();
    }

    // Scoring formula: Speed penalty included for speed mode or classic basic points
    let pointsAwarded = 0;
    if (isCorrect) {
      const speedBonus = timeLeft / activeQ.timer; // Ratio
      pointsAwarded = Math.floor(activeQ.points * (0.6 + 0.4 * speedBonus));
    }

    const nextScore = player.score + pointsAwarded;
    const nextStreak = isCorrect ? player.streak + 1 : 0;
    const nextCorrectCount = isCorrect ? player.correctCount + 1 : player.correctCount;

    // Save answer detail to player answers Map
    const sampleAnswerRecord: PlayerAnswer = {
      questionIndex: game.currentQuestionIndex,
      answerSubmitted: answer,
      isCorrect,
      scoreGained: pointsAwarded,
      answeredAtMs: Date.now(),
      timeTakenSec: activeQ.timer - timeLeft
    };

    const updatedAnswers = {
      ...player.answers,
      [game.currentQuestionIndex.toString()]: sampleAnswerRecord
    };

    // Update Player Document in Firestore
    const pRef = doc(db, `games/${gameId}/players`, player.id);
    await updateDoc(pRef, {
      score: nextScore,
      streak: nextStreak,
      correctCount: nextCorrectCount,
      lastAnsweredQuestionIndex: game.currentQuestionIndex,
      lastAnswerCorrect: isCorrect,
      answers: updatedAnswers
    });
  };

  const currentLevelXpStats = parseInt(localStorage.getItem('studyplay_xp') || '0', 10);
  const { level, progress } = getLevelFromXP(currentLevelXpStats);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-sm">កំពុងភ្ជាប់ទៅបន្ទប់ប្រឡង...</span>
      </div>
    );
  }

  if (errorMsg || !game || !player) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 font-bold mb-4">{errorMsg || 'បន្ទប់លេងមិនមានសុពលភាព'}</p>
        <button onClick={() => navigate('/')} className="bg-indigo-600 px-6 py-3 rounded-2xl text-xs font-bold">
          ត្រឡប់ទៅទំព័រដើម
        </button>
      </div>
    );
  }

  const activeQ = questions[game.currentQuestionIndex];
  const lastAns = player.answers[game.currentQuestionIndex.toString()];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Top Banner with Student Level & sound panel */}
      <nav className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <AnimalAvatar id={studentBlook} size={32} />
          <div>
            <span className="text-xs font-bold text-white block leading-none">{player.nickname}</span>
            <span className="text-4xs text-indigo-400 font-bold">កម្រិត {level}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Audio on/off toggle */}
          <button 
            onClick={handleToggleSound}
            className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-300"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="text-xs font-extrabold bg-slate-850/60 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-400 font-mono">
            {player.score} <span className="text-4xs text-slate-400 font-sans">ពិន្ទុ</span>
          </div>
        </div>
      </nav>

      {/* Main Student Console view */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col justify-center">

        {/* A. LOBBY SCREEN (Waiting in Lobby) */}
        {game.status === 'lobby' && (
          <div className="text-center space-y-6 my-auto bg-slate-900 border border-slate-850 p-6 md:p-8 rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-indigo-600/10 text-indigo-400 rounded-full border border-indigo-500/20 flex items-center justify-center mx-auto text-3xl animate-pulse">
              🎮
            </div>
            
            <div className="space-y-2">
              <h1 className="text-lg font-black text-white">បានចូលរួមបន្ទប់ជោគជ័យ!</h1>
              <p className="text-xs text-slate-400">
                សូមរង់ចាំលោកគ្រូ-អ្នកគ្រូបង្កាត់ការប្រកួតប្រជែងជាក្រុម។ កូដសម្រង់៖ <strong className="text-indigo-400 font-mono">{game.gameCode}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl max-w-xs mx-auto border border-slate-850 text-slate-355 text-xs font-semibold flex flex-col items-center space-y-2">
              <AnimalAvatar id={studentBlook} size={48} />
              <div>
                👋 ឈ្មោះលេង៖ <span className="text-white font-bold">{player.nickname}</span>
              </div>
            </div>
          </div>
        )}

        {/* B. GET READY INTRO SPLASH */}
        {game.status === 'playing' && game.questionStatus === 'showing' && (
          <div className="text-center space-y-6 my-auto animate-bounce py-12">
            <span className="text-5xl font-black block">⌛</span>
            <h1 className="text-2xl font-black text-amber-400 uppercase tracking-wider">ត្រៀមខ្លួនរួចរាល់!</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              សំណួរថ្មីកំពុងបង្ហាញលើក្តារធំជាផ្លូវការ បំពេញចម្លើយឱ្យលឿនបំផុត ដើម្បីទទួលបានពិន្ទុខ្ពស់បង្អស់!
            </p>
          </div>
        )}

        {/* C. ACTIVE RESPONDING TIMER COUNTDOWN */}
        {game.status === 'playing' && game.questionStatus === 'counting_down' && activeQ && (
          <div className="space-y-6 my-auto">
            
            <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-xl border border-slate-850">
              <span className="text-xs font-bold text-slate-400">សំណួរ {game.currentQuestionIndex + 1}/{questions.length}</span>
              
              <div className="flex items-center space-x-1.5 font-mono text-base font-extrabold text-white">
                <span>⏱️ {timeLeft} វិនាទី</span>
              </div>
            </div>

            {/* Question Text and Image presentation */}
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-sm md:text-base font-black text-white leading-relaxed text-center">
                {activeQ.text}
              </h2>
              {activeQ.imageUrl && (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-48 border border-slate-800">
                  <img
                    src={activeQ.imageUrl}
                    alt="Question Visual"
                    className="object-contain max-h-48 w-auto py-2"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {hasAnsweredCurrent ? (
              // Answer already submitted screen
              <div className="bg-slate-900 border border-slate-850 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 rounded-full flex items-center justify-center mx-auto text-xl">
                  🚀
                </div>
                <h3 className="font-extrabold text-white text-base">បានបញ្ជូនចម្លើយរួចរាល់!</h3>
                <p className="text-2xs text-slate-400 leading-relaxed">
                  ចម្លើយរបស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យ។ សូមរង់ចាំសិស្សានុសិស្សដទៃទៀតឆ្លើយរួចរាល់ ឬអស់ម៉ោងកំណត់។
                </p>
                <div className="text-indigo-400 text-xs font-extrabold font-mono border-t border-slate-800/80 pt-3">
                  ចម្លើយ៖ "{selectedResponse || textAnswer}"
                </div>
              </div>
            ) : (
              // Submit input choices based on Question category
              <div className="space-y-4">
                
                {/* 1. Multiple choice click options */}
                {activeQ.type === 'multiple_choice' && activeQ.options && (() => {
                  const isKhmer = /[\u1780-\u17FF]/.test(activeQ.text || '') || activeQ.options.some(o => /[\u1780-\u17FF]/.test(o));
                  const seed = (gameId || '') + '_' + game.currentQuestionIndex;
                  const shuffledOptions = shuffleOptionsDeterministically(activeQ.options, seed);
                  return (
                    <div className="grid grid-cols-1 gap-3">
                      {shuffledOptions.map((opt, idx) => {
                        const label = isKhmer
                          ? (idx === 0 ? 'ក' : idx === 1 ? 'ខ' : idx === 2 ? 'គ' : 'ឃ')
                          : (idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D');
                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswerResponseSubmit(opt)}
                            className={`w-full p-4 rounded-2xl flex items-center space-x-3 text-left font-extrabold text-sm border cursor-pointer hover:scale-101 active:scale-98 transition transform ${
                              idx === 0 ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/15' :
                              idx === 1 ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-550/15' :
                              idx === 2 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-550/15' :
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-550/15'
                            }`}
                          >
                            <span className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center font-black">
                              {label}
                            </span>
                            <span className="flex-1 truncate">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 2. True / False buttons */}
                {activeQ.type === 'true_false' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleAnswerResponseSubmit('ត្រូវ')}
                      className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-2xl text-center font-black text-sm text-white shadow-lg cursor-pointer transform active:scale-95 transition"
                    >
                      ត្រូវ (True)
                    </button>
                    <button
                      onClick={() => handleAnswerResponseSubmit('ខុស')}
                      className="flex-1 py-6 bg-red-600 hover:bg-red-500 border border-red-500 rounded-2xl text-center font-black text-sm text-white shadow-lg cursor-pointer transform active:scale-95 transition"
                    >
                      ខុស (False)
                    </button>
                  </div>
                )}

                {/* 3. Text responses (Fill Blank, short answer) */}
                {(activeQ.type === 'fill_blank' || activeQ.type === 'short_answer' || activeQ.type === 'matching') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                    <label className="text-3xs text-slate-400 font-bold block mb-1">✍️ បំពេញចម្លើយត្រឹមត្រូវ</label>
                    <input
                      type="text"
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="វាយចម្លើយខ្លីរបស់អ្នកទីនេះ..."
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <button
                      onClick={() => handleAnswerResponseSubmit(textAnswer)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-center transition cursor-pointer text-xs"
                    >
                      បញ្ជូនចម្លើយឥឡូវនេះ
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* D. TIME UP - DISPLAY RESULT FEEDBACK */}
        {game.status === 'playing' && game.questionStatus === 'times_up' && (
          <div className="space-y-6 my-auto animate-fade-in">
            {lastAns ? (
              // Student answered, show correctness
              lastAns.isCorrect ? (
                <div className="bg-emerald-555/10 border border-emerald-500/20 text-center rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl shadow-xl">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h1 className="text-xl font-bold text-emerald-400">ឆ្លើយត្រឹមត្រូវល្អណាស់! 🎉</h1>
                  <span className="text-3xl font-black font-mono text-white block">+{lastAns.scoreGained} ពិន្ទុ</span>
                  
                  <p className="text-xs text-emerald-300 font-bold bg-emerald-900/40 py-2.5 px-4 rounded-xl border border-emerald-500/10">
                    អ្នកជ្រើសរើសចម្លើយត្រឹមត្រូវបានចំនួន <span className="font-mono text-sm underline">{player.correctCount}</span> / <span className="font-mono text-sm">{questions.length}</span> (សំណួរសរុប)។
                  </p>

                  {player.streak >= 2 && (
                    <span className="inline-flex items-center space-x-1.5 bg-red-500/10 text-red-400 font-bold text-xs px-3 py-1 rounded-full">
                      <Flame className="w-4 h-4 fill-current text-red-500" />
                      <span>ឆ្លើយត្រូវ {player.streak} សំណួរហើយ!</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="bg-red-555/10 border border-red-500/20 text-center rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl shadow-xl animate-shake">
                    <X className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h1 className="text-xl font-bold text-red-400">សោកស្តាយ!ចម្លើយមិនត្រឹមត្រូវ</h1>
                  
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-2xs inline-block max-w-[280px]">
                    <span className="text-slate-500 block">ចម្លើយដ៏ត្រឹមត្រូវគឺ៖</span>
                    <strong className="text-emerald-400 text-xs mt-1 block">{activeQ?.correctAnswer}</strong>
                  </div>
                </div>
              )
            ) : (
              // Student didn't answer on time
              <div className="bg-slate-900 border border-slate-800 text-center rounded-3xl p-8 shadow-xl space-y-4">
                <div className="text-4xl animate-bounce">⏱️</div>
                <h1 className="text-lg font-bold text-amber-500">អស់ម៉ោងកំណត់!</h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  អ្នកមិនបានបញ្ជូនចម្លើយក្នុងរយៈពេលដែលបានគ្រោងទុកនោះឡើយ។ សូមរៀបចំខ្លួនសម្រាប់សំណួរបន្ទាប់ជានិច្ច!
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-900 rounded-2xl flex items-center justify-between border border-slate-800/80">
              <span className="text-slate-300 text-xs font-bold">ពិន្ទុសរុបបច្ចុប្បន្ន</span>
              <span className="font-mono text-base font-extrabold text-indigo-400">{player.score} ពិន្ទុ</span>
            </div>
          </div>
        )}

        {/* E. LEADERBOARD / WAITING IN LEADERBOARD SCREEN */}
        {game.status === 'leaderboard' && (
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-xl my-auto">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>

            <div className="space-y-1.5">
              <h2 className="font-extrabold text-white text-base">មើលលទ្ធផលនៅលើក្តារធំ!</h2>
              <p className="text-2xs text-slate-400 leading-normal">
                លោកគ្រូ-អ្នកគ្រូកំពុងវិភាគស្ថិតិពិន្ទុ ហើយបង្ហាញតារាងសិស្សានុសិស្សលេចធ្លោជាងគេ។
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl space-y-1 text-left border border-slate-850">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">ពិន្ទុរបស់អ្នក៖</span>
                <strong className="text-white text-sm font-mono">{player.score}</strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60 mt-2">
                <span className="text-slate-400">ឆ្លើយត្រូវសរុប៖</span>
                <strong className="text-emerald-400 font-mono">{player.correctCount} សំណួរ</strong>
              </div>
            </div>
          </div>
        )}

        {/* F. FINISHED GAME PODIUM / STATS AWARDS PROGRESS */}
        {game.status === 'finished' && (
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-500/10 rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-2xl my-auto">
            <span className="text-5xl block animate-pulse">🏅</span>
            
            <div className="space-y-1.5">
              <h1 className="text-xl font-black text-white">បញ្ចប់ការប្រឡងជោគជ័យ!</h1>
              <p className="text-2xs text-slate-300">
                អបអរសាទរ! អ្នកបានឆ្លើយបានយ៉ាងអស្ចារ្យ។ នេះជារង្វាន់វិជ្ជាជីវៈប្រមូលបាន៖
              </p>
            </div>

            {/* Reward calculation visual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                <span className="text-4xs text-slate-500 block font-bold mb-1">រង្វាន់ទទួលបាន</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">+{xpAwarded} XP</span>
              </div>
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                <span className="text-4xs text-slate-500 block font-bold mb-1">ឆ្លើយត្រូវសរុប</span>
                <span className="text-base font-extrabold text-indigo-400 font-mono">{player.correctCount} សំណួរ</span>
              </div>
            </div>

            {/* Level upgrades rendering */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-bold">លំហរវិវត្ត (Level Progress)</span>
                <span className="text-amber-400 font-bold font-mono">កម្រិត {level}</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-4xs text-slate-500 mt-1 font-mono">
                <span>{currentLevelXpStats} XP </span>
                <span>ជំហានបន្ទាប់៖ រីកចម្រើនឥតឈប់ឈរ</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-800 hover:bg-slate-750 text-white font-black py-3.5 rounded-xl text-center text-xs cursor-pointer block"
            >
              ត្រឡប់ទៅទំព័រដើមវិញ
            </button>
          </div>
        )}

      </main>

      <footer className="bg-slate-900 border-t border-slate-850 py-3.5 text-center text-xs text-slate-550 select-none">
        <p>&copy; 2026 StudyPlay. បង្កើតឡើងជាពិសេសសម្រាប់ភាសាខ្មែរ ប្រើប្រាស់ពុម្ពអក្សរបាត់ដំបង។</p>
      </footer>

      {/* Floating Theme Switcher Option (Light / Dark Mode Toggle) */}
      <div className="fixed bottom-6 right-6 z-45">
        <button
          onClick={() => {
            gameAudio.playTick();
            setIsLightMode(!isLightMode);
          }}
          className="w-11 h-11 rounded-full bg-indigo-650 hover:bg-indigo-600 text-white shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer border border-indigo-400/20"
          title={isLightMode ? "ប្តូរទៅរបៀបងងឹត (Dark Mode)" : "ប្តូរទៅរបៀបភ្លឺ (Light Mode)"}
        >
          {isLightMode ? (
            <Moon className="w-5 h-5 text-amber-200" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-300" />
          )}
        </button>
      </div>
    </div>
  );
}
