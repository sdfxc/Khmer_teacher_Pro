/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Award, Info, Lock, CheckCircle2, Sparkles, Coins, Gift, RefreshCw, Star, Heart } from 'lucide-react';
import { CHARACTERS, AnimalCharacter } from '../data/characters';
import AnimalAvatar from './AnimalAvatar';
import { gameAudio } from '../utils/audio';

export default function AvatarLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedChar, setSelectedChar] = useState<AnimalCharacter | null>(null);
  const [activeBlookId, setActiveBlookId] = useState<string>('turtle');
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  
  // Pack Opener state (Gacha)
  const [userCoins, setUserCoins] = useState<number>(1000);
  const [openingPack, setOpeningPack] = useState(false);
  const [gachaReward, setGachaReward] = useState<AnimalCharacter | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    // Sync active blook from localStorage
    const saved = localStorage.getItem('studyplay_blook') || 'turtle';
    setActiveBlookId(saved);

    // Sync unlocked blooks list or initialize with all ones (User requested to unlock all)
    const savedUnlocked = localStorage.getItem('studyplay_unlocked_blooks');
    if (savedUnlocked) {
      setUnlockedIds(JSON.parse(savedUnlocked));
    } else {
      // All unlocked by default now
      const allIds = CHARACTERS.map(c => c.id);
      setUnlockedIds(allIds);
      localStorage.setItem('studyplay_unlocked_blooks', JSON.stringify(allIds));
    }

    // Sync coins
    const savedCoins = localStorage.getItem('studyplay_coins');
    if (savedCoins) {
      setUserCoins(parseInt(savedCoins, 10));
    } else {
      localStorage.setItem('studyplay_coins', '1000');
    }
  }, []);

  const handleSelectAvatar = (cid: string) => {
    gameAudio.playTick();
    setActiveBlookId(cid);
    localStorage.setItem('studyplay_blook', cid);
    // Dispatched event to let LandingPage refresh stats
    window.dispatchEvent(new Event('storage'));
  };

  const handleFlipCard = (cid: string) => {
    gameAudio.playTick();
    setFlippedCardId(flippedCardId === cid ? null : cid);
  };

  // Virtual Pack Opening Simulator
  const handleOpenPack = () => {
    if (userCoins < 150) {
      gameAudio.playTick();
      alert('សមតុល្យកាក់សំណាងមិនគ្រប់គ្រាន់ទេ! អ្នកត្រូវការកាក់ចំនួន ១៥០ ដើម្បីបើកកញ្ចប់សត្វថ្មី។ (លេងឆ្លើយសំណួរដើម្បីទទួលបានកាក់បន្ថែមភូរៗ!)');
      return;
    }

    setOpeningPack(true);
    setGachaReward(null);
    gameAudio.playTick();

    // Deduct coins
    const nextCoins = userCoins - 150;
    setUserCoins(nextCoins);
    localStorage.setItem('studyplay_coins', String(nextCoins));

    setTimeout(() => {
      // Roll based on probabilities:
      // Common: 50%
      // Rare: 30%
      // Epic: 13%
      // Legendary: 5%
      // Special: 2%
      const rand = Math.random() * 100;
      let targetRarity: string = 'common';
      
      if (rand < 2) {
        targetRarity = 'special';
      } else if (rand < 7) {
        targetRarity = 'legendary';
      } else if (rand < 20) {
        targetRarity = 'epic';
      } else if (rand < 50) {
        targetRarity = 'rare';
      } else {
        targetRarity = 'common';
      }

      const pool = CHARACTERS.filter(c => c.rarity === targetRarity);
      const chosen = pool[Math.floor(Math.random() * pool.length)] || CHARACTERS[0];
      
      setGachaReward(chosen);
      setOpeningPack(false);

      // Unlock it if not unlocked
      if (!unlockedIds.includes(chosen.id)) {
        const nextUnlocked = [...unlockedIds, chosen.id];
        setUnlockedIds(nextUnlocked);
        localStorage.setItem('studyplay_unlocked_blooks', JSON.stringify(nextUnlocked));
      }

      // Sync custom event
      window.dispatchEvent(new Event('storage'));
    }, 1500);
  };

  // Add free coins trigger so students can always try opening cards
  const handleGetBonusCoins = () => {
    gameAudio.playTick();
    const nextCoins = userCoins + 500;
    setUserCoins(nextCoins);
    localStorage.setItem('studyplay_coins', String(nextCoins));
  };

  // Filtered array
  const filteredChars = CHARACTERS.filter((char) => {
    const matchSearch = 
      char.nameKh.toLowerCase().includes(searchTerm.toLowerCase()) ||
      char.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      char.personality.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedRarity === 'all') return matchSearch;
    return char.rarity === selectedRarity && matchSearch;
  });

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-slate-700/50 text-slate-350 border-slate-700';
      case 'rare':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'epic':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'legendary':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-black animate-pulse';
      case 'special':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getCardBorder = (rarity: string, isUnlocked: boolean) => {
    if (!isUnlocked) return 'border-slate-800 opacity-65 grayscale';
    switch (rarity) {
      case 'common':
        return 'border-slate-800 hover:border-slate-600 bg-slate-900/40';
      case 'rare':
        return 'border-blue-500/20 hover:border-blue-500/60 bg-blue-950/10 shadow-blue-950/10';
      case 'epic':
        return 'border-purple-500/20 hover:border-purple-500/60 bg-purple-950/10 shadow-purple-900/10';
      case 'legendary':
        return 'border-amber-500/30 hover:border-amber-500 bg-amber-950/5 shadow-amber-900/5 ring-1 ring-amber-500/10';
      case 'special':
        return 'border-emerald-500/25 hover:border-emerald-500 bg-emerald-950/5 shadow-emerald-900/5';
      default:
        return 'border-slate-800';
    }
  };

  return (
    <div className="space-y-8 text-slate-200">
      
      {/* Visual Title Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/30 border border-slate-850 p-6 rounded-3xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1 bg-amber-500/10 text-amber-400 text-3xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>បណ្តុំរូបសត្វដើមចម្រុះពណ៌ (Original Chibi Avatars)</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white font-sans">
            បណ្ណាល័យសត្វសិក្សា (StudyPlay Blooks Marketplace)
          </h2>
          <p className="text-slate-400 text-2xs leading-relaxed max-w-2xl font-sans">
            ស្វែងយល់ពីសត្វ Chibi រាងមូលការ៉េ ភ្នែកធំៗក្រឡង់ ដូចតួអង្គហ្គេមបណ្ដុះបញ្ញាល្បីៗ។ កាតនីមួយៗផ្ទុកនូវឈ្មោះ ភាពកម្រ បុគ្គលិកលក្ខណៈ ពណ៌ចម្រុះ និងរចនាសម្ព័ន្ធរូបភាពវេទ័រច្បាស់ល្អ។
          </p>
        </div>

        {/* Coins System display */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center space-x-2 font-mono">
            <Coins className="w-5 h-5 text-amber-400 fill-current animate-bounce" />
            <div>
              <span className="text-4xs text-slate-500 block font-bold leading-none">កាក់មាស</span>
              <span className="text-base font-black text-white">{userCoins}</span>
            </div>
          </div>

          <button
            onClick={handleGetBonusCoins}
            className="p-2.5 bg-indigo-600/20 hover:bg-indigo-650/40 border border-indigo-500/30 rounded-xl text-indigo-400 text-2xs font-extrabold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            title="ទទួលបានកាក់បន្ថែមឥតគិតថ្លៃ"
          >
            <Gift className="w-4 h-4" />
            <span>កាក់ឥតគិតថ្លៃ</span>
          </button>
        </div>
      </div>

      {/* Simulator Pack Opener (Interactive Drawer) */}
      <div className="bg-gradient-to-r from-indigo-950/20 via-slate-900/20 to-teal-950/10 border border-indigo-500/15 p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-2 text-center md:text-left">
          <span className="text-4xs bg-indigo-500/10 text-indigo-400 font-extrabold px-2.5 py-1 rounded-full border border-indigo-500/20">
            សាកល្បងសំណាងរបស់អ្នក (Avatar Gacha Pack)
          </span>
          <h3 className="text-base md:text-lg font-black text-white flex items-center justify-center md:justify-start space-x-2">
            <span>🎁 បើកកញ្ចប់សត្វល្បងប្រាជ្ញា</span>
          </h3>
          <p className="text-3xs text-slate-400 leading-relaxed font-sans max-w-md">
            ចំណាយត្រឹមតែ <strong className="text-white">១៥០ កាក់</strong> ដើម្បីបើកប្រអប់សកល្បងសំណាង ទទួលបានសត្វ Chibi កម្រ (Rare) មហាកម្រ (Epic) ទេវកថា (Legendary) ឬតួអក្សរវិទ្យាសាស្ត្រ (Special Education)!
          </p>
        </div>

        {/* Pack Drawer Interactive Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {openingPack ? (
            <div className="flex flex-col items-center justify-center space-y-2 p-6 bg-slate-950/40 border border-indigo-550/10 rounded-2xl w-48 text-center animate-pulse">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-3xs text-indigo-400 font-bold">កំពុងបើកប្រអប់សត្វ...</span>
            </div>
          ) : gachaReward ? (
            <div className="flex items-center space-x-4 bg-slate-950/80 border border-amber-500/20 p-4 rounded-2xl w-full sm:w-64 animate-fade-in relative">
              <div className="p-1 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-indigo-500/10 border border-slate-800">
                <AnimalAvatar id={gachaReward.id} size={64} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-4xs text-amber-400 font-extrabold block">តួអង្គទើបរកឃើញ៖</span>
                <p className="text-xs font-black text-white truncate">{gachaReward.nameKh}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border border-transparent inline-block font-extrabold ${getRarityBadgeStyle(gachaReward.rarity)}`}>
                  {gachaReward.rarityKh}
                </span>
              </div>
              <button 
                onClick={() => setGachaReward(null)}
                className="absolute top-1 right-2 text-slate-500 hover:text-white text-xs"
                title="បិទ"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-center space-x-4 w-full sm:w-64 py-5">
              <span className="text-[32px] animate-bounce">🎁</span>
              <div className="text-left">
                <span className="text-3xs text-slate-400 block font-sans">តម្លៃក្នុងមួយកញ្ចប់៖</span>
                <span className="text-sm font-black text-amber-400 font-mono">150 កាក់មាស</span>
              </div>
            </div>
          )}

          <button
            onClick={handleOpenPack}
            disabled={openingPack}
            className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition active:translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer grow-0 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${openingPack ? 'animate-spin' : ''}`} />
            <span>បើកប្រអប់សត្វ (150 កាក់)</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS (TAB CONTROLLER) */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-slate-850 pb-5">
        
        {/* Rarity Filter Category Tabs */}
        <div className="flex overflow-x-auto pb-1.5 w-full lg:w-auto gap-1.5 scrollbar-thin">
          {[
            { id: 'all', label: 'ទាំងអស់ (All)' },
            { id: 'common', label: 'ធម្មតា (Common)' },
            { id: 'rare', label: 'កម្រ (Rare)' },
            { id: 'epic', label: 'មហាកម្រ (Epic)' },
            { id: 'legendary', label: 'ទេវកថា (Legendary)' },
            { id: 'special', label: 'វិជ្ជាជីវៈ (Special Edu)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                gameAudio.playTick();
                setSelectedRarity(tab.id);
              }}
              className={`px-4 py-2.5 rounded-xl text-3xs font-black whitespace-nowrap transition cursor-pointer border ${
                selectedRarity === tab.id
                  ? 'bg-indigo-600/95 text-white border-indigo-500 shadow-md shadow-indigo-950/20'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 border-slate-850 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះសត្វ, វិជ្ជាជីវៈ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wide font-sans"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* INVENTORY CARD GRID */}
      {filteredChars.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-850 rounded-2xl text-slate-500 font-sans text-xs">
          🚫 រកមិនឃើញតួអង្គសត្វដែលត្រូវនឹងការស្វែងរករបស់អ្នកឡើយ!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredChars.map((char) => {
            const isUnlocked = true; // All avatars are unlocked by default! (User requested to open all locks)
            const isActive = activeBlookId === char.id;
            const isFlipped = flippedCardId === char.id;

            return (
              <div 
                key={char.id}
                className="perspective-1000 relative h-[250px] w-full group select-none"
              >
                {/* Flipping Container Card */}
                <div 
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  
                  {/* FRONT OF THE CARD */}
                  <div 
                    onClick={() => handleFlipCard(char.id)}
                    className={`absolute w-full h-full backface-hidden border p-4 rounded-2xl flex flex-col justify-between transition-all duration-350 shadow-lg ${
                      getCardBorder(char.rarity, isUnlocked)
                    } ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : ''}`}
                  >
                    
                    {/* Header: Rarity & Selector Action */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black tracking-wider px-2 py-0.5 rounded-md border inline-block ${getRarityBadgeStyle(char.rarity)}`}>
                        {char.rarityKh}
                      </span>
                      {isActive && isUnlocked && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center space-x-1 font-sans">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>កំពុងប្រើ</span>
                        </span>
                      )}
                    </div>

                    {/* Animal Vector Graphic Frame */}
                    <div className="flex-1 flex items-center justify-center py-2">
                      {isUnlocked ? (
                        <div className="transform group-hover:scale-108 transition-all duration-300">
                          <AnimalAvatar id={char.id} size={105} />
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center justify-center text-slate-650">
                          <div className="p-1 grayscale opacity-45">
                            <AnimalAvatar id={char.id} size={90} />
                          </div>
                          <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center rounded-3xl">
                            <div className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-400 rounded-full flex items-center justify-center shadow-lg">
                              <Lock className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer: Card animal name */}
                    <div className="text-center space-y-0.5">
                      <p className="text-xs font-black text-slate-100 font-sans tracking-wide truncate">
                        {char.nameKh.replace(/\s*\(.*\)/g, '')}
                      </p>
                      <p className="text-[10px] text-slate-550 font-semibold uppercase tracking-wider font-mono">
                        {char.nameEn}
                      </p>
                    </div>

                    {/* Unlock hint or lock message */}
                    {!isUnlocked && (
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 text-[8px] text-amber-500 text-center py-1 rounded font-bold border border-slate-850">
                        🔒 បើកប្រអប់សកល្បងសំណាង!
                      </div>
                    )}
                  </div>

                  {/* BACK OF THE CARD: Personality, Palette, and Specs */}
                  <div 
                    onClick={() => handleFlipCard(char.id)}
                    className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-xl"
                  >
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-850">
                      <span className="text-[9px] font-black text-indigo-400 uppercase">លក្ខណៈសម្បត្តិ (Stats)</span>
                      <span className="text-3xs text-slate-500 font-bold">ចុចត្រឡប់</span>
                    </div>

                    {/* Stats List Info Column */}
                    <div className="flex-1 py-1.5 space-y-2 text-left text-2xs overflow-y-auto font-sans scrollbar-thin">
                      <div>
                        <span className="text-[9px] text-amber-400 font-black block">🦄 បុគ្គលិកលក្ខណៈ (Personality)</span>
                        <p className="text-slate-300 leading-normal font-sans pr-1 text-[10px]">{char.personality}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-pink-400 font-black block">🎨 ស្រមោលពណ៌ (Color Palette)</span>
                        <p className="text-slate-300 leading-normal font-sans text-[10px]">{char.colorPalette}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-teal-400 font-black block">✨ ចំណុចសម្គាល់ (Unique Traits)</span>
                        <p className="text-slate-300 leading-normal font-sans text-[10px]">{char.traits}</p>
                      </div>
                    </div>

                    {/* Switch Button Action if unlocked */}
                    {isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid card flipping trigger
                          handleSelectAvatar(char.id);
                        }}
                        disabled={isActive}
                        className={`w-full py-1.5 rounded-xl text-3xs font-black transition ${
                          isActive
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer hover:shadow-indigo-900/20 active:translate-y-0.5'
                        }`}
                      >
                        {isActive ? 'កំពុងប្រើប្រាស់' : 'ជ្រើសរើសប្រើប្រាស់'}
                      </button>
                    ) : (
                      <div className="text-center py-1.5 bg-slate-950/60 text-red-400 rounded-xl font-bold border border-slate-850 text-3xs">
                        🔒 មិនទាន់ដោះសោ
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS Styles for perspective card flipping */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
