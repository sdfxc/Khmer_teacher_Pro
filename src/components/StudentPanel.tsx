import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, RotateCw, Trophy, Trash2, Users, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';

interface StudentPanelProps {
  students: Student[];
  pickedIds: string[];
  onSetPickedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onAddStudent: (name: string) => void;
  onRemoveStudent: (id: string) => void;
  onClearStudents: () => void;
  onSelectStudent: (student: Student) => void;
  selectedStudent: Student | null;
}

export default function StudentPanel({ 
  students, 
  pickedIds,
  onSetPickedIds,
  onAddStudent, 
  onRemoveStudent, 
  onClearStudents,
  onSelectStudent,
  selectedStudent 
}: StudentPanelProps) {
  const [newName, setNewName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [showBulkInput, setShowBulkInput] = useState(false);

  // Reset picked list if students are cleared from external source
  useEffect(() => {
    if (students.length === 0) {
      onSetPickedIds([]);
    }
  }, [students.length, onSetPickedIds]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStudent(newName.trim());
      setNewName('');
    }
  };

  const handleBulkAdd = (text: string) => {
    const names = text.split('\n').filter(n => n.trim());
    names.forEach(name => onAddStudent(name.trim()));
    setShowBulkInput(false);
  };

  const exportToExcel = () => {
    if (students.length === 0) return;
    
    // Prepare data
    const data = students.map(s => ({
      'ឈ្មោះសិស្ស': s.name,
      'ពិន្ទុសរុប': s.score
    }));

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 15 }  // Score
    ];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ពិន្ទុសិស្ស");

    // Write file
    XLSX.writeFile(wb, `ពិន្ទុសិស្ស_${new Date().toLocaleDateString()}.xlsx`);
  };

  const spin = () => {
    if (students.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    let count = 0;
    
    // Filter out already picked students
    let availableStudents = students.filter(s => !pickedIds.includes(s.id));
    
    // If everyone has been picked, reset the pool
    if (availableStudents.length === 0) {
      availableStudents = [...students];
      onSetPickedIds([]);
    }

    const interval = setInterval(() => {
      const displayIndex = Math.floor(Math.random() * students.length);
      onSelectStudent(students[displayIndex]);
      count++;
      
      if (count > 20) {
        clearInterval(interval);
        
        // Final selection from available pool
        const finalSelection = availableStudents[Math.floor(Math.random() * availableStudents.length)];
        onSelectStudent(finalSelection);
        onSetPickedIds(prev => {
          if (prev.includes(finalSelection.id)) return prev;
          return [...prev, finalSelection.id];
        });
        setIsSpinning(false);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111827] border-r border-[#e2e8f0] dark:border-slate-800 p-6 overflow-hidden transition-colors duration-300">
      <div className="flex flex-col mb-6 gap-2">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-400 dark:to-blue-400">
          បញ្ជីឈ្មោះសិស្ស ({students.length})
        </h2>
        <div className="flex items-center justify-end gap-2 overflow-x-auto custom-scrollbar-hide flex-nowrap">
          {students.length > 0 && (
            <button 
              onClick={exportToExcel}
              className="shrink-0 group flex items-center gap-1.5 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-green-100 dark:border-green-900/30 cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3" />
              ទាញយក Excel
            </button>
          )}
          <button 
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-indigo-100 dark:border-indigo-900/30 cursor-pointer"
          >
            បន្ថែមច្រើន
          </button>
          {students.length > 0 && (
            <button 
              onClick={onClearStudents}
              className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-full uppercase transition-all shadow-sm border border-red-100 dark:border-red-900/30 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              លុបឈ្មោះទាំងអស់
            </button>
          )}
        </div>
        <div className="flex justify-end">
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
            នៅសល់ {students.length - pickedIds.length} នាក់
          </span>
        </div>
      </div>

      {/* Bulk Input Overlay */}
      <AnimatePresence>
        {showBulkInput && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-950/30 rounded-2xl p-4 shadow-inner">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">បញ្ចូលឈ្មោះច្រើន (មួយជួរ ឈ្មោះមួយ)</p>
              <textarea
                className="w-full h-32 p-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                placeholder="ឈ្មោះសិស្ស ១&#10;ឈ្មោះសិស្ស ២..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleBulkAdd((e.target as HTMLTextAreaElement).value);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    handleBulkAdd(e.target.value);
                  } else {
                    setShowBulkInput(false);
                  }
                }}
                autoFocus
              />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 italic">ចុចខាងក្រៅដើម្បីបញ្ចូល</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Student Banner / Randomizer Button Container */}
      <div className="mb-8 space-y-4">
        <motion.button
          onClick={spin}
          disabled={isSpinning || students.length === 0}
          animate={{
            y: isSpinning ? 0 : [0, -10, 0],
          }}
          transition={{
            y: {
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }
          }}
          className="w-full py-5 bg-yellow-400 text-slate-905 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-yellow-350 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
          <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isSpinning ? 'កំពុងបង្វិល...' : 'បង្វិលរកសិស្ស'}
        </motion.button>

        <AnimatePresence mode="wait">
          {selectedStudent && (
            <motion.div
              key={selectedStudent.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`text-center p-5 bg-yellow-101 border-2 border-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-600/30 rounded-2xl mb-4 shadow-lg ${isSpinning ? 'animate-pulse' : ''}`}
            >
              <p className="text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">អ្នកដែលត្រូវឆ្លើយគឺ</p>
              <h3 className="text-3xl font-black text-red-650 dark:text-red-420 truncate px-2 mb-1 flex items-center justify-center gap-2">
                <span className="text-4xl">{selectedStudent.emoji}</span>
                {selectedStudent.name}
              </h3>
              <div className="flex items-center justify-center gap-1.5 text-red-700/60 dark:text-red-350/80 font-bold text-xs">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>ទទួលបាន {selectedStudent.score} ពិន្ទុ</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 custom-scrollbar">
        {students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-semibold">សូមបន្ថែមឈ្មោះសិស្សដើម្បីចាប់ផ្ដើម!</p>
          </div>
        ) : (
          students.map((student) => (
            <motion.div
              layout
              key={student.id}
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                selectedStudent?.id === student.id 
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900' 
                  : pickedIds.includes(student.id)
                    ? 'bg-slate-50 dark:bg-slate-800/45 border-slate-100 dark:border-slate-800 opacity-40 grayscale'
                    : 'bg-white dark:bg-slate-900 border-[#e2e8f0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl font-bold transition-transform group-hover:scale-110 ${
                   selectedStudent?.id === student.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {student.emoji || student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold leading-none ${selectedStudent?.id === student.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-705 dark:text-slate-200'}`}>{student.name}</p>
                    {pickedIds.includes(student.id) && !isSpinning && selectedStudent?.id !== student.id && (
                      <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{student.score} ពិន្ទុ</p>
                </div>
              </div>
              <button 
                onClick={() => onRemoveStudent(student.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="បញ្ចូលឈ្មោះសិស្ស..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-750 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
