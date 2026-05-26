import React, { useState } from 'react';
import { Users, Plus, Minus, Shuffle } from 'lucide-react';
import { Student } from '../types';

interface GroupDividerProps {
  students: Student[];
  activeClassName: string;
}

interface GroupMember extends Student {
  assignedRole?: 'ប្រធាន' | 'អនុប្រធាន' | 'សមាជិក';
}

interface Group {
  id: number;
  name: string;
  members: GroupMember[];
}

export default function GroupDivider({ students, activeClassName }: GroupDividerProps) {
  const [numGroups, setNumGroups] = useState(4);
  const [groups, setGroups] = useState<Group[]>([]);

  const handleIncrement = () => {
    setNumGroups(prev => Math.min(prev + 1, students.length || 10));
  };

  const handleDecrement = () => {
    setNumGroups(prev => Math.max(2, prev - 1));
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
      if (s.status === 'ឆ្នើម') {
        outstanding.push(s);
      } else if (s.status === 'សកម្ម') {
        active.push(s);
      } else if (s.status === 'គួរឲ្យបារម្ភ') {
        attention.push(s);
      } else {
        // 'កំពុងរីកចម្រើន' or undefined/null/empty status gets classified under improving
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
    // This distributes Outstanding, Active, Improving, and Needs Attention as evenly as possible, with alternating genders
    weavedOutstanding.forEach((student, idx) => {
      resultGroups[idx % G].members.push({ ...student });
    });

    weavedActive.forEach((student, idx) => {
      resultGroups[idx % G].members.push({ ...student });
    });

    weavedImproving.forEach((student, idx) => {
      resultGroups[idx % G].members.push({ ...student });
    });

    weavedAttention.forEach((student, idx) => {
      resultGroups[idx % G].members.push({ ...student });
    });

    // 4. Assign roles and sort/alternate inside each group
    resultGroups.forEach(group => {
      const gOutstanding = group.members.filter(m => m.status === 'ឆ្នើម');
      const gActive = group.members.filter(m => m.status === 'សកម្ម');
      const gImproving = group.members.filter(m => m.status === 'កំពុងរីកចម្រើន' || !m.status);
      const gAttention = group.members.filter(m => m.status === 'គួរឲ្យបារម្ភ');

      // Outstanding get 'ប្រធាន' (President/Leader)
      gOutstanding.forEach(m => {
        m.assignedRole = 'ប្រធាន';
      });

      // Exactly ONE randomly chosen Active student per group gets 'អនុប្រធាន' (Vice President)
      if (gActive.length > 0) {
        const vpIndex = Math.floor(Math.random() * gActive.length);
        gActive.forEach((m, idx) => {
          if (idx === vpIndex) {
            m.assignedRole = 'អនុប្រធាន';
          } else {
            m.assignedRole = 'សមាជិក';
          }
        });
      }

      // Improving get 'សមាជិក' (Member)
      gImproving.forEach(m => {
        m.assignedRole = 'សមាជិក';
      });

      // Attention get 'សមាជិក' (Member)
      gAttention.forEach(m => {
        m.assignedRole = 'សមាជិក';
      });

      const leaders = group.members.filter(m => m.assignedRole === 'ប្រធាន');
      const vices = group.members.filter(m => m.assignedRole === 'អនុប្រធាន');
      const ordinary = group.members.filter(m => m.assignedRole === 'សមាជិក');

      // Weave the remaining ordinary members by gender so they visually alternate (ប្រុស -> ស្រី -> ប្រុស...)
      const ordinaryBoys = ordinary.filter(m => m.gender === 'ប្រុស');
      const ordinaryGirls = ordinary.filter(m => m.gender === 'ស្រី');
      const ordinaryOthers = ordinary.filter(m => m.gender !== 'ប្រុស' && m.gender !== 'ស្រី');

      const sortedOrdinary: GroupMember[] = [];
      let obIdx = 0;
      let ogIdx = 0;

      // Align starting gender with preceding vice/leader to maintain sequential flow
      const lastLeaderGender = vices.length > 0
        ? vices[vices.length - 1].gender
        : (leaders.length > 0 ? leaders[leaders.length - 1].gender : null);

      let preferBoy = true;
      if (lastLeaderGender === 'ប្រុស') {
        preferBoy = false;
      } else if (lastLeaderGender === 'ស្រី') {
        preferBoy = true;
      } else {
        preferBoy = ordinaryBoys.length >= ordinaryGirls.length;
      }

      while (obIdx < ordinaryBoys.length || ogIdx < ordinaryGirls.length) {
        if (preferBoy) {
          if (obIdx < ordinaryBoys.length) {
            sortedOrdinary.push(ordinaryBoys[obIdx++]);
          }
          preferBoy = false;
        } else {
          if (ogIdx < ordinaryGirls.length) {
            sortedOrdinary.push(ordinaryGirls[ogIdx++]);
          }
          preferBoy = true;
        }

        if (obIdx >= ordinaryBoys.length && ogIdx < ordinaryGirls.length) {
          preferBoy = false;
        } else if (ogIdx >= ordinaryGirls.length && obIdx < ordinaryBoys.length) {
          preferBoy = true;
        }
      }

      // Reassemble so Leader is absolute top, followed by Vice Leader, then beautifully weaved ordinary members
      group.members = [
        ...leaders,
        ...vices,
        ...sortedOrdinary,
        ...ordinaryOthers
      ];
    });

    setGroups(resultGroups);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Set Number of Teams Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-850 dark:text-white leading-tight">កំណត់ចំនួនក្រុម</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              ថ្នាក់៖ <span className="text-indigo-650 dark:text-indigo-400">{activeClassName}</span> | សិស្សសរុប៖ <span className="text-indigo-650 dark:text-indigo-400 font-bold">{students.length} នាក់</span>
            </p>
          </div>
        </div>

        {/* Adjusters & Button */}
        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner select-none">
            <button
              onClick={handleDecrement}
              disabled={numGroups <= 2}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-black text-slate-850 dark:text-white font-mono">{numGroups}</span>
            <button
              onClick={handleIncrement}
              disabled={numGroups >= students.length}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={splitGroups}
            disabled={students.length === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95 transition-all"
          >
            <Shuffle className="w-4 h-4" />
            <span>បែងចែកក្រុម</span>
          </button>
        </div>
      </div>

      {/* Divided Groups Content Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-slate-905 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-indigo-600 dark:text-indigo-400 font-sans">{group.name}</h3>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {group.members.length} នាក់
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl text-slate-750 dark:text-slate-350 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base shrink-0 select-none">
                        {member.emoji || (member.gender === 'ស្រី' ? '👧' : '👦')}
                      </span>
                      <span className="truncate dark:text-slate-200 text-[13.5px] font-bold flex items-center gap-1.5" title={member.name}>
                        <span className="truncate">{member.name}</span>
                        {member.gender && (
                          <span className={`text-[10px] font-black shrink-0 ${member.gender === 'ប្រុស' ? 'text-blue-500' : 'text-pink-500'}`} title={member.gender}>
                            {member.gender === 'ប្រុស' ? '♂' : '♀'}
                          </span>
                        )}
                        {member.assignedRole === 'ប្រធាន' && (
                          <span className="text-[10.5px] bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">
                            ប្រធាន
                          </span>
                        )}
                        {member.assignedRole === 'អនុប្រធាន' && (
                          <span className="text-[10.5px] bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">
                            អនុប្រធាន
                          </span>
                        )}
                        {member.assignedRole === 'សមាជិក' && (
                          <span className="text-[10.5px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">
                            សមាជិក
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">សូមចុចប៊ូតុង «បែងចែកក្រុម» ដើម្បីស្វ័យប្រវត្តិកំណត់ក្រុមជម្រើសរំភើប!</p>
        </div>
      )}
    </div>
  );
}
