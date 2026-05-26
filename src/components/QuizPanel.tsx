import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Timer, CheckCircle, XCircle, Info, Trophy, AlertCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, QuizCard, Student } from '../types';

interface QuizPanelProps {
  cards: QuizCard[];
  onCardClick: (card: QuizCard) => void;
  onAnswer: (correct: boolean) => void;
  onReset: () => void;
  activeCard: QuizCard | null;
  selectedStudent: Student | null;
}

export default function QuizPanel({ 
  cards, 
  onCardClick, 
  onAnswer, 
  onReset,
  activeCard,
  selectedStudent
}: QuizPanelProps) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCard && activeCard.status === 'idle' && timeLeft > 0 && !showResult) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(-1); // Timeout
    }
    return () => clearInterval(timer);
  }, [activeCard, timeLeft, showResult]);

  useEffect(() => {
    if (activeCard?.question) {
      const originalOptions = activeCard.question.options;
      const originalCorrect = activeCard.question.correctIndex;
      
      // Map options to pair with correct status
      const items = originalOptions.map((opt, index) => ({
        opt,
        isCorrect: index === originalCorrect
      }));
      
      // Perform a clean Fisher-Yates shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      
      setShuffledOptions(items.map(item => item.opt));
      const newCorrectIdx = items.findIndex(item => item.isCorrect);
      setCorrectIndex(newCorrectIdx >= 0 ? newCorrectIdx : 0);
      
      setTimeLeft(20);
      setShowResult(null);
    }
  }, [activeCard]);

  const handleAnswer = (index: number) => {
    if (!activeCard?.question || showResult) return;

    const isCorrect = index === correctIndex;
    setShowResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
    }
  };

  const handleContinue = () => {
    if (showResult !== null) {
      onAnswer(showResult === 'correct');
    }
  };

  if (activeCard) {
    return (
      <div className="flex-1 flex flex-col p-8 bg-transparent relative transition-colors duration-300 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
                {activeCard.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">សំណួរដែលត្រូវឆ្លើយ</h3>
                <p className="text-xl font-bold text-slate-800 dark:text-white">សន្លឹកប័ណ្ណសំណួរ</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 mb-1 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`}>
                <Timer className="w-5 h-5 text-indigo-500" />
                <span className="text-base font-bold">រយៈពេលនៅសល់៖ <span className="text-xl font-black font-mono">{timeLeft}</span> វិនាទី</span>
              </div>
              <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 20) * 100}%` }}
                  className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Question Content */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white dark:bg-white border-2 border-slate-200 shadow-md rounded-[2rem] p-10 mb-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              <HelpCircle className="absolute -top-12 -right-12 w-48 h-48 text-indigo-500/5 rotate-12" />
              <span className="text-xs uppercase font-black tracking-widest text-indigo-650 bg-indigo-50 px-3 py-1 rounded-full mb-4">សំណួរលេខ {activeCard.number}</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 text-center leading-relaxed relative z-10 max-w-2xl">
                {activeCard.question?.text}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {shuffledOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult !== null}
                  className={`relative p-6 rounded-3xl border-3 text-left transition-all group overflow-hidden cursor-pointer ${
                    showResult === null 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-655 hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm text-slate-850 dark:text-slate-100 hover:scale-[1.02]'
                      : idx === correctIndex
                        ? 'bg-green-500/15 border-green-500 shadow-xl shadow-green-500/10 text-green-950 dark:text-green-100 scale-[1.01]'
                        : showResult === 'wrong' && idx !== correctIndex
                          ? 'bg-red-500/5 border-red-500/20 opacity-50 text-slate-900 dark:text-slate-100'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-805 opacity-65 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-all ${
                      idx === correctIndex && showResult !== null
                        ? 'bg-green-550 text-white'
                        : showResult !== null
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-405'
                          : 'bg-indigo-600 text-white group-hover:bg-indigo-700 animate-in zoom-in-30 duration-200'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={`text-lg sm:text-xl font-bold tracking-tight leading-snug ${
                      idx === correctIndex && showResult !== null
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Result Feedback Overlay */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-3 p-6 rounded-3xl border-4 shadow-xl relative overflow-hidden ${
                  showResult === 'correct' 
                    ? 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400' 
                    : 'bg-red-500/10 border-red-500/50 text-red-750 dark:text-red-400'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {showResult === 'correct' ? <CheckCircle className="w-8 h-8 text-green-550" /> : <XCircle className="w-8 h-8 text-red-550" />}
                    <h4 className="text-xl font-bold uppercase tracking-tight">
                      {showResult === 'correct' ? 'អស្ចារ្យណាស់! +៣ ពិន្ទុ' : 'គួរឲ្យសោកស្ដាយ! មិនទាន់ត្រឹមត្រូវទេ'}
                    </h4>
                  </div>
                  {showResult === 'wrong' && (
                    <div className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-500/5 p-3 rounded-xl mt-4 max-w-lg mb-4 border border-red-500/20">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        ចម្លើយត្រឹមត្រូវគឺ៖ <span className="font-bold underline text-slate-800 dark:text-white">{shuffledOptions[correctIndex]}</span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleContinue}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
                      showResult === 'correct' 
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                    }`}
                  >
                    បន្តទៅទៀត
                  </button>
                </div>
                {showResult === 'correct' && (
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="p-4 bg-green-500 text-white rounded-full hidden sm:block shadow-lg shadow-green-500/20"
                  >
                    <Trophy className="w-10 h-10 text-yellow-300" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 bg-transparent overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">ក្ដារសំណួរ</h2>
            {cards.length > 0 && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-750 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs shadow-sm active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                ធ្វើម្ដងទៀត
              </button>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">សូមជ្រើសរើសសន្លឹកប័ណ្ណមួយដើម្បីចាប់ផ្ដើម។ មានសរុប {cards.length} សន្លឹកបណ្ណសំណួរ។</p>
        </div>
        
        <AnimatePresence>
          {!selectedStudent && cards.length > 0 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-100 text-yellow-800 rounded-2xl font-bold border-2 border-yellow-200 shadow-lg shadow-yellow-100/30"
            >
              <AlertCircle className="w-5 h-5 text-yellow-600 animate-bounce" />
              <span className="text-xs">សូមបង្វិលរកឈ្មោះសិស្សដំបូងសិន!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            whileHover={selectedStudent && !card.isRevealed ? { y: -5, scale: 1.05 } : {}}
            whileTap={selectedStudent && !card.isRevealed ? { scale: 0.95 } : {}}
            onClick={() => !card.isRevealed && selectedStudent && onCardClick(card)}
            disabled={card.isRevealed || !selectedStudent}
            className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center relative transition-all shadow-md overflow-hidden group border ${
              card.isRevealed
                ? card.status === 'correct'
                  ? 'bg-green-500 border-green-500 text-white shadow-green-500/20 cursor-default'
                  : 'bg-red-500 border-red-500 text-white shadow-red-500/20 cursor-default'
                : selectedStudent
                  ? 'bg-slate-950 border-slate-900 hover:border-indigo-500 hover:ring-4 hover:ring-indigo-500/20 cursor-pointer text-white shadow-lg'
                  : 'bg-[#f8fafc] dark:bg-[#1e293b] text-slate-350 dark:text-slate-600 opacity-40 grayscale cursor-not-allowed border-slate-200 dark:border-slate-850'
            }`}
          >
            {card.isRevealed ? (
              card.status === 'correct' ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />
            ) : (
              <span className="text-3xl font-black drop-shadow-sm">{card.number}</span>
            )}
            
            {!selectedStudent && !card.isRevealed && (
              <div className="absolute inset-0 bg-transparent" />
            )}
          </motion.button>
        ))}
      </div>
      
      {cards.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none max-w-sm">
            <Info className="w-16 h-16 text-indigo-300 dark:text-indigo-400 mx-auto mb-6" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-150 mb-2">មិនទាន់មានសំណួរនៅឡើយទេ</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 italic leading-relaxed">លោកគ្រូ អ្នកគ្រូ សូមប្រើប្រាស់ឧបករណ៍ AI ដើម្បីបង្កើតសំណួរចេញពីអត្ថបទមេរៀន!</p>
          </div>
        </div>
      )}
    </div>
  );
}
