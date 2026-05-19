/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentClassName, Gender, StudentLevel } from '../types';
import { CLASSES, GENDERS, LEVELS } from '../constants';
import { Plus, Trash2, Edit3, Search, Download, Upload, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onAddStudents: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImport: (students: Student[]) => void;
}

export default function StudentManager({
  students,
  onAddStudent,
  onAddStudents,
  onUpdateStudent,
  onDeleteStudent,
  onImport
}: StudentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<StudentClassName | 'ទាំងអស់'>('ទាំងអស់');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<Omit<Student, 'id'>[]>([]);

  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    name: '',
    gender: 'ប្រុស',
    level: 'សកម្ម',
    className: 'ថ្នាក់ទី៧ក'
  });

  const handleProcessNames = (text: string) => {
    const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const newItems = names.map(name => ({
      name,
      gender: 'ប្រុស' as Gender,
      level: 'សកម្ម' as StudentLevel,
      className: newStudent.className
    }));
    setBulkStudents(newItems);
  };

  const updateBulkStudent = (index: number, field: keyof Omit<Student, 'id'>, value: string) => {
    const updated = [...bulkStudents];
    updated[index] = { ...updated[index], [field]: value };
    setBulkStudents(updated);
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkStudents.length === 0) return;

    const newStudentsWithIds = bulkStudents.map(s => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9)
    }));

    onAddStudents(newStudentsWithIds);

    setBulkStudents([]);
    setShowAddForm(false);
    setIsBulkMode(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;
    onAddStudent({ ...newStudent, id: Date.now().toString() });
    setNewStudent({ ...newStudent, name: '' });
    setShowAddForm(false);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "students_list.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) onImport(json);
        } catch (err) {
          alert('Error parsing JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'ទាំងអស់' || s.className === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះសិស្ស..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none bg-white/50"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value as any)}
          >
            <option value="ទាំងអស់">ថ្នាក់ទាំងអស់</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setIsBulkMode(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            <UserPlus className="w-4 h-4" />
            <span className="khmer-text">បន្ថែមម្នាក់</span>
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setIsBulkMode(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span className="khmer-text">បន្ថែមច្រើន (Bulk)</span>
          </button>
          <button
            onClick={handleExport}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <label className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer" title="Import JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {showAddForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={isBulkMode ? handleBulkAdd : handleAdd}
          className="glass p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          {isBulkMode ? (
            <div className="md:col-span-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-wider">១. បញ្ចូលបញ្ជីឈ្មោះសិស្ស (ម្នាក់មួយជួរ)</label>
                  <textarea
                    required={bulkStudents.length === 0}
                    className="w-full h-48 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    placeholder="ពេញឈ្មោះទី១&#10;ពេញឈ្មោះទី២&#10;ពេញឈ្មោះទី៣..."
                    onChange={(e) => handleProcessNames(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-wider">២. កំណត់ថ្នាក់សម្រាប់បញ្ជីនេះ</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none font-bold bg-white"
                    value={newStudent.className}
                    onChange={(e) => {
                      const newClass = e.target.value as StudentClassName;
                      setNewStudent({ ...newStudent, className: newClass });
                      setBulkStudents(bulkStudents.map(s => ({ ...s, className: newClass })));
                    }}
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold leading-relaxed">
                      * ប្រព័ន្ធនឹងបង្កើតបញ្ជីសិស្សនៅខាងក្រោមស្វ័យប្រវត្តិ។ អ្នកអាចកែសម្រួល ភេទ និងកម្រិតសិក្សា សម្រាប់សិស្សម្នាក់ៗបានយ៉ាងងាយស្រួល។
                    </p>
                  </div>
                </div>
              </div>

              {bulkStudents.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-wider">៣. ពិនិត្យ និងកែសម្រួលព័ត៌មានលម្អិត ({bulkStudents.length} នាក់)</label>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {bulkStudents.map((bs, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-xs font-bold text-slate-400">{idx + 1}</span>
                        <input
                          type="text"
                          className="flex-1 min-w-[150px] px-3 py-1.5 rounded-lg border border-slate-100 focus:border-primary/30 outline-none text-sm font-bold"
                          value={bs.name}
                          onChange={(e) => updateBulkStudent(idx, 'name', e.target.value)}
                        />
                        <select
                          className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-xs font-bold outline-none"
                          value={bs.gender}
                          onChange={(e) => updateBulkStudent(idx, 'gender', e.target.value)}
                        >
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select
                          className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-xs font-bold outline-none"
                          value={bs.level}
                          onChange={(e) => updateBulkStudent(idx, 'level', e.target.value)}
                        >
                          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">ឈ្មោះសិស្ស</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">ភេទ</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none font-bold"
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as Gender })}
                >
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">កម្រិតសិក្សា</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none font-bold"
                  value={newStudent.level}
                  onChange={(e) => setNewStudent({ ...newStudent, level: e.target.value as StudentLevel })}
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">ថ្នាក់</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none font-bold"
                  value={newStudent.className}
                  onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value as StudentClassName })}
                >
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="md:col-span-4 flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all font-bold shadow-lg shadow-primary/20"
            >
              {isBulkMode ? `រក្សាទុក (${bulkStudents.length} នាក់)` : 'រក្សាទុក'}
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <motion.div
            layout
            key={student.id}
            className="glass p-4 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${student.gender === 'ស្រី' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{student.name}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{student.className}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${
                    student.level === 'ឆ្នើម' ? 'bg-emerald-500' :
                    student.level === 'សកម្ម' ? 'bg-blue-500' :
                    student.level === 'អភិវឌ្ឍ' ? 'bg-amber-500' : 'bg-violet-500'
                  }`}>{student.level}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onDeleteStudent(student.id)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {filteredStudents.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 khmer-text">
            មិនមានទិន្នន័យសិស្ស...
          </div>
        )}
      </div>
    </div>
  );
}
