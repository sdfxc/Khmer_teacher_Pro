import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, BookOpen, Loader2, Info } from 'lucide-react';
import { generateQuestions, getSavedApiKey, saveApiKey } from '../lib/gemini';
import { Question } from '../types';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
}

export default function LessonModal({ isOpen, onClose, onQuestionsGenerated }: LessonModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(25);
  const [apiKeyInput, setApiKeyInput] = useState(getSavedApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const questions = await generateQuestions(text, count);
      onQuestionsGenerated(questions);
      onClose();
    } catch (err: any) {
      if (err.message === "NEED_API_KEY") {
        setShowKeyInput(true);
        setErrorMsg("សូមបញ្ចូល កូនសោ API Gemini (Gemini API Key) ដើម្បីបង្កើតសំណួរដោយផ្ទាល់ពីកម្មវិធីរុករក (Browser)។");
      } else {
        setErrorMsg(err.message || 'មានបញ្ហាក្នុងការបង្កើតសំណួរ');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">បង្កើតសន្លឹកប័ណ្ណសំណួរ</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">បញ្ជាដោយបច្ចេកវិទ្យា Gemini AI</p>
                    <span className="text-[10px] text-slate-300">|</span>
                    <button 
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-0.5"
                    >
                      🔐 កំណត់ API Key
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {showKeyInput && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      🔐 កូនសោ API Gemini (Gemini API Key)
                    </label>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-bold"
                    >
                      បង្កើត API Key ឥតគិតថ្លៃ ↗
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        saveApiKey(e.target.value);
                      }}
                      placeholder="បញ្ចូលកូនសោ API Gemini (ឧទាហរណ៍៖ AIzaSy...)"
                      className="flex-1 p-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(false)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      រក្សាទុក
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700/80 mt-2 leading-relaxed">
                    ព្រោះតែកម្មវិធីនេះត្រូវបានបង្ហោះជាលក្ខណៈ static (ឧទាហរណ៍ Vercel, Github Pages) គ្មានម៉ាស៊ីនបម្រើផ្ទាល់ខ្លួន, អ្នកត្រូវការបញ្ចូលកូនសោ API ផ្ទាល់ខ្លួនដើម្បីប្រើប្រាស់មុខងារ AI នេះ។ កូនសោនឹងត្រូវបានរក្សាទុកក្នុងឧបករណ៍របស់អ្នកដោយមានសុវត្ថិភាពខ្ពស់។
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                  <span className="text-red-500 font-bold shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="text-xs text-red-800 font-semibold leading-relaxed">{errorMsg}</p>
                    {(errorMsg.includes("API Key") || errorMsg.includes("កូនសោ") || errorMsg.includes("NEED_API_KEY") || errorMsg.includes("403") || errorMsg.includes("400")) && (
                      <button
                        onClick={() => setShowKeyInput(true)}
                        className="text-xs text-indigo-600 hover:underline font-bold mt-1.5 block"
                      >
                        កំណត់ ឬប្ដូរ API Key ឡើងវិញ ↗
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  ខ្លឹមសារមេរៀន
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="សូមចម្លងខ្លឹមសារមេរៀន ឬកំណត់ចំណាំរបស់អ្នកដាក់ទីនេះ... AI នឹងបង្កើតសំណួរចេញពីមេរៀននេះ។"
                  className="w-full h-48 p-4 bg-white text-slate-900 border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm leading-relaxed font-semibold placeholder-slate-400 shadow-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="w-full sm:flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-slate-700">ចំនួនសន្លឹកប័ណ្ណ</label>
                    <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-lg text-sm">{count}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    step="5"
                    value={count} 
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                  />
                  <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400 uppercase">
                    <span>៥</span>
                    <span>១០០ សន្លឹក</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !text.trim()}
                  className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl active:scale-95 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      កំពុងបង្កើត...
                    </>
                  ) : (
                    <>
                      បង្កើតសំណួរ
                      <Sparkles className="w-5 h-5 text-indigo-400 group-hover:animate-pulse" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  AI នឹងធ្វើការវិភាគលើអត្ថបទមេរៀនរបស់អ្នកដើម្បីបង្កើតសំណួរពហុជ្រើសរើស។ 
                  អ្នកអាចដាក់អត្ថបទជាភាសាខ្មែរ ឬអង់គ្លេស។
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

