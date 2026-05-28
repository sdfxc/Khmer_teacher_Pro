import React, { useState } from 'react';
import { Search, Plus, FileSpreadsheet, Download, Upload, UserPlus, Users, Trash2, Award, ShieldAlert, Sparkles, TrendingUp, HelpCircle, Pencil } from 'lucide-react';
import { Student, ClassInfo } from '../types';
import * as XLSX from 'xlsx';

interface StudentManagerProps {
  students: Student[];
  classes: ClassInfo[];
  activeClassId: string;
  onAddStudentDetail: (fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => void;
  onRemoveStudent: (id: string) => void;
  onBulkAddStudents: (list: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[]) => void;
  onUpdateStudentDetail?: (id: string, fields: { name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'; classId: string }) => void;
}

export default function StudentManager({
  students,
  classes,
  activeClassId,
  onAddStudentDetail,
  onRemoveStudent,
  onBulkAddStudents,
  onUpdateStudentDetail
}: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  
  // Single student form toggle & states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [newStatus, setNewStatus] = useState<'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'>('សកម្ម');
  const [newClassId, setNewClassId] = useState<string>(activeClassId);

  // Editing student states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [editStatus, setEditStatus] = useState<'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ'>('សកម្ម');
  const [editClassId, setEditClassId] = useState('');

  // Bulk add toggle
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [parsedStudents, setParsedStudents] = useState<{ name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }[]>([]);

  const handleBulkTextChange = (text: string) => {
    setBulkTextInput(text);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    setParsedStudents(prev => {
      return lines.map((name, i) => {
        // Keep existing if same name & position
        const existing = prev[i];
        if (existing && existing.name === name) {
          return existing;
        }

        const existingByName = prev.find(s => s.name === name);
        if (existingByName) {
          return {
            name,
            gender: existingByName.gender,
            status: existingByName.status
          };
        }

        // Guess gender slightly for better UX
        let defaultGender: 'ប្រុស' | 'ស្រី' = 'ប្រុស';
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes('ស្រី') || 
          lowerName.includes('កញ្ញា') ||
          lowerName.endsWith('ណា') ||
          lowerName.endsWith('នី') ||
          lowerName.endsWith('លាភ') ||
          lowerName.endsWith('លីន') ||
          lowerName.endsWith('ទេវី') ||
          lowerName.endsWith('ម៉ា') ||
          lowerName.endsWith('ផល្លា')
        ) {
          defaultGender = 'ស្រី';
        }
        
        return {
          name,
          gender: defaultGender,
          status: 'សកម្ម' as const
        };
      });
    });
  };

  const handleUpdateParsedStudent = (index: number, fields: Partial<{ name: string; gender: 'ប្រុស' | 'ស្រី'; status: 'ឆ្នើម' | 'សកម្ម' | 'កំពុងរីកចម្រើន' | 'គួរឲ្យបារម្ភ' }>) => {
    setParsedStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields } as any;
      return updated;
    });
  };

  // Handle excel export
  const exportToExcel = () => {
    if (students.length === 0) return;
    const exportData = students.map(s => {
      const clsName = classes.find(c => c.id === (s.classId || activeClassId))?.name || 'មិនស្គាល់';
      return {
        'ឈ្មោះសិស្ស': s.name,
        'ភេទ': s.gender || 'ប្រុស',
        'កម្រិតសិក្សា': s.status || 'សកម្ម',
        'ថ្នាក់': clsName,
        'ពិន្ទុ': s.score || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "គ្រប់គ្រងសិស្ស");
    XLSX.writeFile(wb, `បញ្ជីឈ្មោះសិស្ស_លម្អិត_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStudentDetail({
        name: newName.trim(),
        gender: newGender,
        status: newStatus,
        classId: newClassId
      });
      // Reset
      setNewName('');
      setShowAddForm(false);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedStudents.length > 0) {
      onBulkAddStudents(parsedStudents);
      setBulkTextInput('');
      setParsedStudents([]);
      setShowBulkForm(false);
    }
  };

  // Filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClassId === 'all' || (student.classId || activeClassId) === filterClassId;
    return matchesSearch && matchesClass;
  });

  // Khmer initials builder helper
  const getKhmerInitial = (name: string) => {
    if (!name) return 'ស';
    return name.trim().charAt(0);
  };

  // Stats Counters
  const totalStudentsCount = filteredStudents.length;
  const femaleCount = filteredStudents.filter(s => s.gender === 'ស្រី').length;
  const outstandingCount = filteredStudents.filter(s => s.status === 'ឆ្នើម').length;
  
  const activeClassName = classes.find(c => c.id === activeClassId)?.name || 'ថ្នាក់';
  const activeClassCount = filteredStudents.filter(s => (s.classId || activeClassId) === activeClassId).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="ស្វែងរកឈ្មោះសិស្ស..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        {/* Grade Selector Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ថ្នាក់ទាំងអស់</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Button Actions Group Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/10 p-2.5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowBulkForm(false);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ បន្ថែមម្នាក់</span>
          </button>

          <button
            onClick={() => {
              setShowBulkForm(!showBulkForm);
              setShowAddForm(false);
            }}
            className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-2xl text-xs font-bold flex items-center gap-2 border border-indigo-100 dark:border-indigo-900/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ បន្ថែមច្រើន (Bulk)</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={exportToExcel}
            title="ទាញយក Excel"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form Add Visual Container (Single) - matches Screenshot 4 perfectly! */}
      {showAddForm && (
        <form onSubmit={handleSingleSubmit} className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-805 p-6 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-top-3 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Field 1: Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ឈ្មោះសិស្ស(ខ្មែរ)</label>
              <input
                type="text"
                required
                placeholder="សុខ រីបុល..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
            </div>

            {/* Field 2: Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ភេទ</label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
            </div>

            {/* Field 3: Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">កម្រិតសិក្សា</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none"
              >
                <option value="ឆ្នើម">ឆ្នើម (Outstanding)</option>
                <option value="សកម្ម">សកម្ម (Active)</option>
                <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន (Improving)</option>
                <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ (Needs Attention)</option>
              </select>
            </div>

            {/* Field 4: Class */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ថ្នាក់</label>
              <select
                value={newClassId}
                onChange={(e) => setNewClassId(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-2xl text-xs font-bold transition-all"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              រក្សាទុក
            </button>
          </div>
        </form>
      )}

      {/* Bulk Form Add */}
      {showBulkForm && (
        <form onSubmit={handleBulkSubmit} className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-805 p-6 rounded-3xl shadow-sm space-y-5 animate-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">បញ្ចូលឈ្មោះច្រើន (មួយជួរ ឈ្មោះមួយ)</label>
            <textarea
              required
              placeholder="ជា ឧត្តម&#10;លី ម៉ារីណា&#10;សុខ រីបុល"
              value={bulkTextInput}
              onChange={(e) => handleBulkTextChange(e.target.value)}
              className="w-full text-sm p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 h-36 font-semibold"
            />
          </div>

          {/* Interactive Live Preview and Setup List - Matches perfect with User's Photo Attachment */}
          {parsedStudents.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mt-2">
                <span>៣. ពិនិត្យ និងកែសម្រួលព័ត៌មានលម្អិត ({parsedStudents.length} នាក់)</span>
              </h4>
              
              <div className="space-y-3 max-h-[380px] overflow-y-auto p-3.5 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40">
                {parsedStudents.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-2.5 rounded-2xl shadow-sm transition-all"
                  >
                    {/* Index Indicator */}
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0 select-none">
                      {i + 1}
                    </div>

                    {/* Student Name Input */}
                    <input
                      type="text"
                      required
                      placeholder="ឈ្មោះសិស្ស..."
                      value={item.name}
                      onChange={(e) => handleUpdateParsedStudent(i, { name: e.target.value })}
                      className="flex-1 h-9.5 px-4 border border-slate-200 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />

                    {/* Gender Select Dropdown */}
                    <select
                      value={item.gender}
                      onChange={(e) => handleUpdateParsedStudent(i, { gender: e.target.value as 'ប្រុស' | 'ស្រី' })}
                      className="h-9.5 px-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-black cursor-pointer focus:outline-none focus:border-indigo-500 w-24 shrink-0"
                    >
                      <option value="ប្រុស">ប្រុស</option>
                      <option value="ស្រី">ស្រី</option>
                    </select>

                    {/* Status Select Dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateParsedStudent(i, { status: e.target.value as any })}
                      className="h-9.5 px-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-black cursor-pointer focus:outline-none focus:border-indigo-500 w-36 shrink-0"
                    >
                      <option value="ឆ្នើម">ឆ្នើម</option>
                      <option value="សកម្ម">សកម្ម</option>
                      <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន</option>
                      <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pb-1 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setBulkTextInput('');
                setParsedStudents([]);
                setShowBulkForm(false);
              }}
              className="px-5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-2xl text-xs font-bold transition-all"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              យល់ព្រម
            </button>
          </div>
        </form>
      )}

      {/* Student Cards Listing Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const studentClass = classes.find(c => c.id === (student.classId || activeClassId))?.name || 'ថ្នាក់ទី៧ក';
            
            // Generate statuses colors dynamically
            let statusPillColor = 'bg-blue-50 text-blue-750 dark:bg-blue-950/20 dark:text-blue-300';
            const statusKey = student.status || 'សកម្ម';
            if (statusKey === 'ឆ្នើម') statusPillColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300';
            else if (statusKey === 'កំពុងរីកចម្រើន') statusPillColor = 'bg-purple-50 text-purple-750 dark:bg-purple-950/20 dark:text-purple-300';
            else if (statusKey === 'គួរឲ្យបារម្ភ') statusPillColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300';

            const genderPillColor = student.gender === 'ស្រី' ? 'bg-pink-50 text-pink-700' : 'bg-blue-55 text-blue-700';

            // Distinctive initials colored badges
            const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
            const badgeBg = colors[student.name.charCodeAt(0) % colors.length];

            return (
              <div
                key={student.id}
                className="bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  {/* Distinctive First Character Badge */}
                  <div className={`w-12 h-12 rounded-full ${badgeBg} flex items-center justify-center text-white text-lg font-black select-none shadow-sm`}>
                    {getKhmerInitial(student.name)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{student.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {/* Class Badge */}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 px-2 py-0.5 rounded-md uppercase">
                        {studentClass}
                      </span>
                      {/* Gender Badge */}
                      <span className="text-[10px] text-indigo-400/80 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">
                        {student.gender || 'ប្រុស'}
                      </span>
                      {/* Status Indicator */}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusPillColor}`}>
                        {statusKey}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingStudent(student);
                      setEditName(student.name);
                      setEditGender(student.gender || 'ប្រុស');
                      setEditStatus(student.status || 'សកម្ម');
                      setEditClassId(student.classId || activeClassId);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-505/10 rounded-xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="កែប្រែព័ត៌មាន"
                  >
                    <Pencil className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`តើលោកគ្រូ អ្នកគ្រូ ពិតជាចង់លុបឈ្មោះសិស្ស «${student.name}» នេះចោលមែនទេ?`)) {
                        onRemoveStudent(student.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="លុបឈ្មោះសិស្ស"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-50" />
            <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">គ្មានលទ្ធផលសិស្សស្របតាមការស្វែងរករបស់អ្នកឡើយ!</p>
          </div>
        )}
      </div>

      {/* Bottom Summary Statistcs Cards Grid Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
        {/* Card 1: Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-4 rounded-3xl shadow-sm text-left flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">សិស្សសរុប</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalStudentsCount}</h4>
          </div>
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/35 text-indigo-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Females count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-4 rounded-3xl shadow-sm text-left flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">សិស្សស្រី</p>
            <h4 className="text-2xl font-black text-pink-650 dark:text-pink-400 mt-1">{femaleCount}</h4>
          </div>
          <div className="w-10 h-10 bg-pink-50 dark:bg-pink-950/30 text-pink-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-500 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Active Class count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-4 rounded-3xl shadow-sm text-left flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{activeClassName}</p>
            <h4 className="text-2xl font-black text-emerald-650 dark:text-emerald-400 mt-1">{activeClassCount}</h4>
          </div>
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Outstanding count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-4 rounded-3xl shadow-sm text-left flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">ឆ្នើម</p>
            <h4 className="text-2xl font-black text-yellow-550 dark:text-yellow-400 mt-1">{outstandingCount}</h4>
          </div>
          <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-500 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Edit Student Modal Overlay */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditingStudent(null)}
          />
          {/* Form Content */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim() && onUpdateStudentDetail) {
                onUpdateStudentDetail(editingStudent.id, {
                  name: editName.trim(),
                  gender: editGender,
                  status: editStatus,
                  classId: editClassId
                });
                setEditingStudent(null);
              }
            }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl shadow-2xl relative z-10 p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-500" />
                <span>កែប្រែព័ត៌មានសិស្ស</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Name field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ឈ្មោះសិស្ស(ខ្មែរ)</label>
                <input
                  type="text"
                  required
                  placeholder="សុខ រីបុល..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 w-full"
                />
              </div>

              {/* Gender field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ភេទ</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                >
                  <option value="ប្រុស">ប្រុស</option>
                  <option value="ស្រី">ស្រី</option>
                </select>
              </div>

              {/* Status field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">កម្រិតសិក្សា</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                >
                  <option value="ឆ្នើម">ឆ្នើម (Outstanding)</option>
                  <option value="សកម្ម">សកម្ម (Active)</option>
                  <option value="កំពុងរីកចម្រើន">កំពុងរីកចម្រើន (Improving)</option>
                  <option value="គួរឲ្យបារម្ភ">គួរឲ្យបារម្ភ (Needs Attention)</option>
                </select>
              </div>

              {/* Class field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">ថ្នាក់</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-200 text-sm font-bold cursor-pointer focus:outline-none focus:border-indigo-500 w-full"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pb-1 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-2xl text-xs font-bold transition-all"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                រក្សាទុក
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
