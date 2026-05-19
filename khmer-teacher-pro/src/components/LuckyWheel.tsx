/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Student, StudentClassName } from '../types';
import { RefreshCw, Play, RotateCcw, Shuffle, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface LuckyWheelProps {
  students: Student[];
  currentClass: StudentClassName;
}

export default function LuckyWheel({ students, currentClass }: LuckyWheelProps) {
  const [list, setList] = useState<Student[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Student | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setList(students.filter(s => s.className === currentClass));
    setWinner(null);
  }, [students, currentClass]);

  const spin = () => {
    if (isSpinning || list.length < 2) return;

    setIsSpinning(true);
    setWinner(null);

    const extraRounds = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = rotation + extraRounds * 360 + randomAngle;
    
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      // Calculate winner based on final angle
      const finalAngle = totalRotation % 360;
      const sliceAngle = 360 / list.length;
      // We want the slice at the TOP (270 deg usually for pointer at top)
      // Pointer is at 0 degrees (pointing right) by default in SVG standard rotation
      // Let's adjust so 0 is top
      const adjustedAngle = (360 - (finalAngle % 360)) % 360;
      const winnerIndex = Math.floor(adjustedAngle / sliceAngle);
      setWinner(list[winnerIndex]);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#10b981']
      });
    }, 4000); // matches transition duration
  };

  const shuffle = () => {
    setList([...list].sort(() => Math.random() - 0.5));
  };

  const reset = () => {
    setList(students.filter(s => s.className === currentClass));
    setWinner(null);
    setRotation(0);
  };

  const removeFromList = (id: string) => {
    setList(list.filter(s => s.id !== id));
    if (winner?.id === id) setWinner(null);
  };

  const colors = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'
  ];

  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const handleBulkAdd = () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const newStudents: Student[] = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      gender: 'ប្រុស',
      level: 'សកម្ម',
      className: currentClass
    }));
    setList([...list, ...newStudents]);
    setBulkInput('');
    setShowBulkInput(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[400px] aspect-square">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-6 h-8 bg-rose-500 clip-path-triangle shadow-lg border-2 border-white" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
          </div>

          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-2xl transition-transform duration-[4000ms] cubic-bezier(0.1, 0, 0, 1)"
            style={{ transform: `rotate(${rotation}deg)` }}
            ref={wheelRef}
          >
            {list.map((student, i) => {
              const sliceAngle = 360 / list.length;
              const startAngle = i * sliceAngle;
              const endAngle = (i + 1) * sliceAngle;
              const x1 = 50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180);
              const largeArcFlag = sliceAngle > 180 ? 1 : 0;

              return (
                <g key={student.id}>
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={colors[i % colors.length]}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <text
                    x="50"
                    y="25"
                    transform={`rotate(${startAngle + sliceAngle/2}, 50, 50)`}
                    fill="white"
                    fontSize={Math.max(2, 6 - list.length / 5)}
                    textAnchor="middle"
                    className="font-bold pointer-events-none"
                    style={{ writingMode: 'vertical-rl', fontWeight: 'bold' }}
                  >
                    {student.name.length > 8 ? student.name.substring(0, 7) + '..' : student.name}
                  </text>
                </g>
              );
            })}
            <circle cx="50" cy="50" r="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
          </svg>

          {/* Center Button */}
          <button
            onClick={spin}
            disabled={isSpinning || list.length < 2}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border-4 border-slate-50 z-10 disabled:opacity-50 disabled:grayscale"
          >
            <Play className={`w-8 h-8 text-primary fill-primary ${isSpinning ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={reset} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <RotateCcw className="w-4 h-4" />
            <span className="khmer-text">Reset</span>
          </button>
          <button onClick={shuffle} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Shuffle className="w-4 h-4" />
            <span className="khmer-text">Shuffle</span>
          </button>
        </div>

        <div className="w-full mt-6">
          <button 
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="text-primary text-sm font-medium hover:underline flex items-center justify-center w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="khmer-text">បញ្ចូលឈ្មោះសិស្សបន្ថែម (Bulk Add)</span>
          </button>
          
          <AnimatePresence>
            {showBulkInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
              >
                <textarea
                  className="w-full h-32 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none bg-white text-sm"
                  placeholder="បញ្ចូលឈ្មោះសិស្ស (មួយជួរ ឈ្មោះមួយ)..."
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => setShowBulkInput(false)}
                    className="px-4 py-2 text-slate-500 text-sm"
                  >បោះបង់</button>
                  <button 
                    onClick={handleBulkAdd}
                    className="px-6 py-2 bg-primary text-white rounded-xl text-sm"
                  >បន្ថែម</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass p-8 rounded-3xl text-center border-primary/30 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
              <p className="text-slate-500 khmer-text mb-2">សិស្សដែលត្រូវបានជ្រើសរើស៖</p>
              <h2 className="text-5xl font-display text-primary mb-6">{winner.name}</h2>
              <button
                onClick={() => removeFromList(winner.id)}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="khmer-text">លុបចេញពីបញ្ជីបង្វិល</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="khmer-header text-xl">បញ្ជីឈ្មោះសិស្ស ({list.length})</h3>
            <span className="text-xs text-slate-400 khmer-text">{currentClass}</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-slate-100 group">
                <span className="font-medium text-slate-700">{s.name}</span>
                <button
                  onClick={() => removeFromList(s.id)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {list.length === 0 && (
              <p className="text-center py-10 text-slate-400 khmer-text">មិនមានសិស្សក្នុងថ្នាក់នេះទេ</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
