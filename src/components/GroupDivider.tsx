import React, { useState, useEffect } from 'react';
import { Users, Plus, Minus, Shuffle, Download, FileSpreadsheet, Award, Check, TrendingUp, Trophy, Loader2, Cloud } from 'lucide-react';
import { Student, TeacherAccount } from '../types';
import * as XLSX from 'xlsx';
import { db, doc, getDoc, setDoc } from '../lib/firebase';

interface GroupDividerProps {
  students: Student[];
  activeClassName: string;
  activeClassId: string;
  teacher: TeacherAccount | null;
}

interface GroupMember extends Student {
  assignedRole?: 'ប្រធាន' | 'អនុប្រធាន' | 'សមាជិក';
  groupScore?: number;
}

interface Group {
  id: number;
  name: string;
  members: GroupMember[];
}

export default function GroupDivider({ 
  students, 
  activeClassName,
  activeClassId,
  teacher
}: GroupDividerProps) {
  const [numGroups, setNumGroups] = useState(4);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupScoreInputs, setGroupScoreInputs] = useState<Record<number, string>>({});
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Load saved state from local storage and firestore when activeClassId changes
  useEffect(() => {
    // 1. Reset local state
    setGroups([]);
    setCloudSynced(false);

    // 2. Load from localStorage immediately for high speed and instant display
    const localGroupsKey = `khmer_teacher_divided_groups_${activeClassId}`;
    const localNumGroupsKey = `khmer_teacher_divided_num_groups_${activeClassId}`;
    
    const savedLocalGroups = localStorage.getItem(localGroupsKey);
    const savedLocalNum = localStorage.getItem(localNumGroupsKey);

    if (savedLocalNum) {
      const parsedNum = parseInt(savedLocalNum, 10);
      if (!isNaN(parsedNum)) {
        setNumGroups(parsedNum);
      }
    } else {
      setNumGroups(4);
    }

    if (savedLocalGroups) {
      try {
        setGroups(JSON.parse(savedLocalGroups));
      } catch (err) {
        console.error('Error parsing groups from localstorage:', err);
      }
    }

    // 3. Load from cloud if logged in
    const loadFromCloud = async () => {
      if (!teacher || !activeClassId) return;
      setIsCloudLoading(true);
      try {
        const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'groupsData', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.groups) {
            setGroups(data.groups);
            // Also update localStorage with the latest cloud data
            localStorage.setItem(localGroupsKey, JSON.stringify(data.groups));
          }
          if (data.numGroups) {
            setNumGroups(data.numGroups);
            localStorage.setItem(localNumGroupsKey, String(data.numGroups));
          }
          setCloudSynced(true);
        }
      } catch (err) {
        console.error('Failed to load groups from Firestore:', err);
      } finally {
        setIsCloudLoading(false);
      }
    };

    loadFromCloud();
  }, [activeClassId, teacher]);

  // Helper to save groups to localstorage and firestore
  const saveGroupsState = async (updatedGroups: Group[], numG = numGroups) => {
    // Save to local storage
    const localGroupsKey = `khmer_teacher_divided_groups_${activeClassId}`;
    const localNumGroupsKey = `khmer_teacher_divided_num_groups_${activeClassId}`;
    
    localStorage.setItem(localGroupsKey, JSON.stringify(updatedGroups));
    localStorage.setItem(localNumGroupsKey, String(numG));

    // Save to Firestore if teacher is logged in
    if (teacher && activeClassId) {
      try {
        const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'groupsData', 'current');
        await setDoc(docRef, {
          groups: updatedGroups,
          numGroups: numG,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setCloudSynced(true);
      } catch (err) {
        console.error('Failed to save groups to Firestore:', err);
        setCloudSynced(false);
      }
    }
  };

  const handleIncrement = () => {
    const nextNum = Math.min(numGroups + 1, students.length || 10);
    setNumGroups(nextNum);
    localStorage.setItem(`khmer_teacher_divided_num_groups_${activeClassId}`, String(nextNum));
    if (groups.length > 0) {
      // Just save selected number of groups
      saveGroupsState(groups, nextNum);
    }
  };

  const handleDecrement = () => {
    const nextNum = Math.max(2, numGroups - 1);
    setNumGroups(nextNum);
    localStorage.setItem(`khmer_teacher_divided_num_groups_${activeClassId}`, String(nextNum));
    if (groups.length > 0) {
      // Just save selected number of groups
      saveGroupsState(groups, nextNum);
    }
  };

  const splitGroups = () => {
    if (students.length === 0) return;

    const G = Math.min(numGroups, students.length);

    // 1. Categorize students by active status for proportional distribution
    const outstanding: Student[] = [];
    const active: Student[] = [];
    const improving: Student[] = [];
    const attention: Student[] = [];

    students.forEach(s => {
      const status = s.status || 'កំពុងរីកចម្រើន';
      if (status === 'ឆ្នើម') {
        outstanding.push(s);
      } else if (status === 'សកម្ម') {
        active.push(s);
      } else if (status === 'គួរឲ្យបារម្ភ') {
        attention.push(s);
      } else {
        improving.push(s);
      }
    });

    // Helper function to weave genders alternatingly (ប្រុស, ស្រី) to balance male and female distribution
    const weaveGenders = (arr: Student[]): Student[] => {
      const boys = arr.filter(s => s.gender === 'ប្រុស');
      const girls = arr.filter(s => s.gender === 'ស្រី');
      const others = arr.filter(s => s.gender !== 'ប្រុស' && s.gender !== 'ស្រី');

      // Shuffle pools first to ensure fair random selection
      const shuffle = (list: Student[]) => {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      };

      shuffle(boys);
      shuffle(girls);
      shuffle(others);

      const weaved: Student[] = [];
      let bIdx = 0;
      let gIdx = 0;

      // Start with whichever gender has more students left to maximize alternating success
      let preferBoy = boys.length >= girls.length;

      while (bIdx < boys.length || gIdx < girls.length) {
        if (preferBoy) {
          if (bIdx < boys.length) {
            weaved.push(boys[bIdx++]);
          }
          preferBoy = false;
        } else {
          if (gIdx < girls.length) {
            weaved.push(girls[gIdx++]);
          }
          preferBoy = true;
        }

        // Keep alternating if possible, or deplete remaining
        if (bIdx >= boys.length && gIdx < girls.length) {
          preferBoy = false;
        } else if (gIdx >= girls.length && bIdx < boys.length) {
          preferBoy = true;
        }
      }

      return [...weaved, ...others];
    };

    const weavedOutstanding = weaveGenders(outstanding);
    const weavedActive = weaveGenders(active);
    const weavedImproving = weaveGenders(improving);
    const weavedAttention = weaveGenders(attention);

    // Create G initial groups
    const resultGroups: Group[] = Array.from({ length: G }, (_, idx) => ({
      id: idx + 1,
      name: `ក្រុមទី${idx + 1}`,
      members: []
    }));

    // 3. Proportional round-robin distribution category by category
    // Crucially use a continuous index to distribute members perfectly and equally across G groups!
    let globalIdx = 0;

    weavedOutstanding.forEach((student) => {
      resultGroups[globalIdx % G].members.push({ ...student, groupScore: 0 });
      globalIdx++;
    });

    weavedActive.forEach((student) => {
      resultGroups[globalIdx % G].members.push({ ...student, groupScore: 0 });
      globalIdx++;
    });

    weavedImproving.forEach((student) => {
      resultGroups[globalIdx % G].members.push({ ...student, groupScore: 0 });
      globalIdx++;
    });

    weavedAttention.forEach((student) => {
      resultGroups[globalIdx % G].members.push({ ...student, groupScore: 0 });
      globalIdx++;
    });

    // 4. Assign roles inside each group
    resultGroups.forEach(group => {
      const getStatusWeight = (status?: string) => {
        if (status === 'ឆ្នើម') return 4;
        if (status === 'សកម្ម') return 3;
        if (status === 'គួរឲ្យបារម្ភ') return 1;
        return 2; // កំពុងរីកចម្រើន
      };

      // Sort by status weight descending
      group.members.sort((a, b) => getStatusWeight(b.status) - getStatusWeight(a.status));

      // Now assign roles:
      group.members.forEach((member, index) => {
        if (index === 0) {
          member.assignedRole = 'ប្រធាន';
        } else if (index === 1) {
          member.assignedRole = 'អនុប្រធាន';
        } else {
          member.assignedRole = 'សមាជិក';
        }
      });
    });

    setGroups(resultGroups);
    saveGroupsState(resultGroups);
  };

  // Add Points or Deduct Points for all members of a specific group
  const handleAddGroupScore = (groupId: number, customPoints?: number) => {
    const pointsStr = groupScoreInputs[groupId] || '';
    const pointsVal = customPoints !== undefined ? customPoints : parseInt(pointsStr, 10);

    if (isNaN(pointsVal)) {
      alert('សូមបញ្ចូលពិន្ទុជាលេខត្រឹមត្រូវ!');
      return;
    }

    const updatedGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => {
            const currentGScore = m.groupScore || 0;
            return { ...m, groupScore: currentGScore + pointsVal };
          })
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    saveGroupsState(updatedGroups);

    // Reset input for this group
    setGroupScoreInputs(prev => ({ ...prev, [groupId]: '' }));
  };

  // Update score of a single member inside a group (E.g. add representative points or deduct active warnings)
  const handleUpdateStudentScore = (groupId: number, studentId: string, delta: number) => {
    const updatedGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => {
            if (m.id === studentId) {
              const currentGScore = m.groupScore || 0;
              return { ...m, groupScore: currentGScore + delta };
            }
            return m;
          })
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    saveGroupsState(updatedGroups);
  };

  // Export current groups and their points to styled Excel sheets
  const exportGroupsToExcel = () => {
    if (groups.length === 0) return;

    // Prepared group scores rows
    const rows: any[] = [];
    groups.forEach(g => {
      g.members.forEach(m => {
        const liveStudent = students.find(s => s.id === m.id);
        const groupScoreVal = m.groupScore || 0;
        const generalScoreVal = liveStudent ? liveStudent.score : (m.score || 0);
        rows.push({
          'ក្រុមរៀន': g.name,
          'ឈ្មោះសិស្ស': m.name,
          'ភេទ': m.gender || 'មិនស្គាល់',
          'តួនាទី': m.assignedRole || 'សមាជិក',
          'ពិន្ទុក្នុងក្រុម (ពិន្ទុក្រុម)': groupScoreVal,
          'ពិន្ទុក្នុងថ្នាក់រៀន (ក្ដារចុច/បង្វិល)': generalScoreVal
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set widths
    ws['!cols'] = [
      { wch: 15 }, // group
      { wch: 25 }, // name
      { wch: 10 }, // gender
      { wch: 15 }, // role
      { wch: 22 }, // group score
      { wch: 30 }  // general class score
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ពិន្ទុតាមក្រុម');

    // List of overall state
    const overallRecords = students.map(s => {
      // Find this student in existing groups to report their groupScore, or 0 if not assigned
      let groupAssigned = 'មិនទាន់បែងចែកក្រុម';
      let currentGroupScore = 0;
      for (const g of groups) {
        const member = g.members.find(m => m.id === s.id);
        if (member) {
          groupAssigned = g.name;
          currentGroupScore = member.groupScore || 0;
          break;
        }
      }

      return {
        'ឈ្មោះសិស្ស': s.name,
        'ភេទ': s.gender || 'មិនស្គាល់',
        'សាលា/ថ្នាក់': activeClassName,
        'ក្រុមដែលបានបែងចែក': groupAssigned,
        'ពិន្ទុក្នុងក្រុម (ពិន្ទុក្រុម)': currentGroupScore,
        'ពិន្ទុសរុបក្នុងថ្នាក់ (ក្ដារចុច/បង្វិល)': s.score
      };
    });

    const wsOverall = XLSX.utils.json_to_sheet(overallRecords);
    wsOverall['!cols'] = [
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 25 },
      { wch: 22 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOverall, 'បញ្ជីរួមគ្រប់សិស្ស');

    XLSX.writeFile(wb, `របាយការណ៍ពិន្ទុ_ថ្នាក់_${activeClassName}_${new Date().toLocaleDateString('kh-KH')}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Set Number of Teams Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">កំណត់ការបែងចែកក្រុមស្មើគ្នា</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold flex items-center gap-2 flex-wrap">
              <span>ថ្នាក់៖ <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeClassName}</span></span>
              <span>•</span>
              <span>សិស្សសរុប៖ <span className="text-indigo-600 dark:text-indigo-400 font-bold">{students.length} នាក់</span></span>
            </p>
          </div>
        </div>

        {/* Adjusters & Buttons */}
        <div className="flex flex-wrap items-center gap-4 self-end lg:self-auto">
          {groups.length > 0 && (
            <button
              onClick={exportGroupsToExcel}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-md shadow-green-500/10 cursor-pointer text-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ទាញយករបាយការណ៍ពិន្ទុ (Excel)</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner select-none">
            <button
              onClick={handleDecrement}
              disabled={numGroups <= 2}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-black text-slate-800 dark:text-white font-mono">{numGroups}</span>
            <button
              onClick={handleIncrement}
              disabled={numGroups >= students.length}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={splitGroups}
            disabled={students.length === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95 transition-all text-xs"
          >
            <Shuffle className="w-4 h-4" />
            <span>បែងចែកក្រុមឥឡូវនេះ</span>
          </button>
        </div>
      </div>

      {/* Divided Groups Content Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Group Title and Info */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    {group.id}
                  </div>
                  <h3 className="font-extrabold text-indigo-600 dark:text-indigo-400 font-sans text-base">{group.name}</h3>
                </div>
                <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300 font-black px-2.5 py-0.5 rounded-full uppercase">
                  {group.members.length} នាក់
                </span>
              </div>

              {/* Score Group Interface */}
              <div className="bg-indigo-50/40 dark:bg-slate-950 border border-indigo-100/50 dark:border-slate-800/80 p-3.5 rounded-2xl mb-4 space-y-2">
                <span className="block text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  🎯 ដាក់ពិន្ទុឲ្យក្រុម
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddGroupScore(group.id, 1)}
                    className="flex-1 py-1 px-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="បន្ថែម ១ ពិន្ទុគ្រប់គ្នា"
                  >
                    +១
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, 5)}
                    className="flex-1 py-1 px-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="បន្ថែម ៥ ពិន្ទុគ្រប់គ្នា"
                  >
                    +៥
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, -1)}
                    className="flex-1 py-1 px-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="ដក ១ ពិន្ទុគ្រប់គ្នា"
                  >
                    -១
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, -5)}
                    className="flex-1 py-1 px-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="ដក ៥ ពិន្ទុគ្រប់គ្នា"
                  >
                    -៥
                  </button>

                  <div className="w-[1.2px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      placeholder="ពិន្ទុ"
                      value={groupScoreInputs[group.id] || ''}
                      onChange={(e) => setGroupScoreInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                      className="w-12 text-center text-xs font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => handleAddGroupScore(group.id)}
                      className="p-1 min-w-[28px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="បញ្ចូលពិន្ទុពិសេស"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="flex-1 space-y-2">
                {group.members.map((member) => {
                  const liveStudent = students.find(s => s.id === member.id);
                  const liveGroupScore = member.groupScore || 0;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 rounded-2xl text-slate-700 dark:text-slate-300 transition-all hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base shrink-0 select-none">
                          {liveStudent?.emoji || member.emoji || (member.gender === 'ស្រី' ? '👧' : '👦')}
                        </span>
                        <div className="truncate text-left">
                          <div className="truncate text-sm font-bold flex items-center gap-1.5">
                            <span className="truncate text-slate-800 dark:text-slate-200">{member.name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-extrabold shrink-0">
                              ({member.assignedRole || 'សមាជិក'})
                            </span>
                            {member.gender && (
                              <span className={`text-[10px] font-black shrink-0 ${member.gender === 'ប្រុស' ? 'text-blue-500' : 'text-pink-500'}`} title={member.gender}>
                                {member.gender === 'ប្រុស' ? '♂' : '♀'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score control actions for individual students */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Current Group Score */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-black min-w-[42px] justify-center shadow-inner" title="ពិន្ទុក្នុងក្រុម">
                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{liveGroupScore}</span>
                          </div>
                        </div>

                        {/* Increment Student Group Score */}
                        <button
                          onClick={() => handleUpdateStudentScore(group.id, member.id, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-505 text-emerald-600 hover:text-white rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer active:scale-90"
                          title="បន្ថែម ១ ពិន្ទុក្រុម"
                        >
                          +
                        </button>

                        {/* Decrement Student Group Score */}
                        <button
                          onClick={() => handleUpdateStudentScore(group.id, member.id, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-rose-500/10 hover:bg-rose-505 text-rose-600 hover:text-white rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer active:scale-90"
                          title="ដក ១ ពិន្ទុក្រុម"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">សូមចុចប៊ូតុង «បែងចែកក្រុមឥឡូវនេះ» ដើម្បីកំណត់ក្រុមស្មើគ្នាដែលមានសិស្សចម្រុះគ្រប់ប្រភេទ!</p>
        </div>
      )}
    </div>
  );
}
