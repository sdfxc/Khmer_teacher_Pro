/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentClassName, Group } from '../types';
import { Users, Shuffle, Download, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface SmartGroupProps {
  students: Student[];
  currentClass: StudentClassName;
}

export default function SmartGroup({ students, currentClass }: SmartGroupProps) {
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState<Group[]>([]);
  const classStudents = students.filter(s => s.className === currentClass);

  const generateGroups = () => {
    if (classStudents.length < groupCount) return;

    // Smart Balancing Logic
    // 1. Group by Level and then Gender
    const buckets: Record<string, Student[]> = {};
    classStudents.forEach(s => {
      const key = `${s.level}-${s.gender}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(s);
    });

    // 2. Shuffle each bucket
    Object.values(buckets).forEach(bucket => {
      for (let i = bucket.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
      }
    });

    // 3. Assemble all shuffled buckets in a specific order to spread them
    // Sorting buckets by size or specific level order can help too, but spreading is key
    const allShuffled = Object.values(buckets).flat();
    
    // 4. Distribute round-robin
    const newGroups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
      id: i + 1,
      members: []
    }));

    allShuffled.forEach((student, index) => {
      newGroups[index % groupCount].members.push(student);
    });

    setGroups(newGroups);
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="glass p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="khmer-header text-xl">កំណត់ចំនួនក្រុម</h3>
            <p className="text-xs text-slate-500 khmer-text">ថ្នាក់: {currentClass} | សិស្សសរុប: {classStudents.length} នាក់</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-colors shadow-sm"
            >-</button>
            <span className="w-12 text-center font-bold text-lg">{groupCount}</span>
            <button
              onClick={() => setGroupCount(Math.min(10, groupCount + 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-colors shadow-sm"
            >+</button>
          </div>
          <button
            onClick={generateGroups}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Shuffle className="w-4 h-4" />
            <span className="khmer-text">បែងចែកក្រុម</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groups.map((group) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            key={group.id}
            className="group-card glass rounded-3xl overflow-hidden border-t-4 border-t-primary"
          >
            <div className="bg-primary/5 p-4 flex justify-between items-center border-b border-slate-100">
              <h4 className="khmer-header text-lg text-primary">ក្រុមទី {group.id}</h4>
              <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-full shadow-sm">
                {group.members.length} នាក់
              </span>
            </div>
            <div className="p-4 space-y-3">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${member.gender === 'ស្រី' ? 'bg-pink-400' : 'bg-blue-400'}`}></div>
                    <span className="text-sm font-medium text-slate-700">{member.name}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded text-white flex-shrink-0 ${
                    member.level === 'ឆ្នើម' ? 'bg-emerald-500' :
                    member.level === 'សកម្ម' ? 'bg-blue-500' :
                    member.level === 'អភិវឌ្ឍ' ? 'bg-amber-500' : 'bg-violet-500'
                  }`}>{member.level}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="flex justify-center gap-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="khmer-text">បោះពុម្ព (Print)</span>
          </button>
        </div>
      )}

      {groups.length === 0 && (
        <div className="py-20 text-center text-slate-400 khmer-text print:hidden">
          ចុចប៊ូតុងខាងលើដើម្បីបែងចែកក្រុម...
        </div>
      )}
    </div>
  );
}
