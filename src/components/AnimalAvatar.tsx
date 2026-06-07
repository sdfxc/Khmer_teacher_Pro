/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimalCharacter } from '../data/characters';

interface AvatarProps {
  id: string;
  size?: number;
  showShadows?: boolean;
}

export default function AnimalAvatar({ id, size = 150, showShadows = true }: AvatarProps) {
  // Common visual constants across chibi avatars
  const strokeColor = '#0f172a'; // Deep slate almost black for clean premium outlines
  const strokeWidth = 3;

  // Render character visual details inside SVG
  const renderSpecialTraits = (cid: string) => {
    switch (cid) {
      // --- COMMON ---
      case 'chicken':
        return (
          <>
            {/* Crest on top */}
            <path d="M 40 10 Q 50 -10 60 10 Q 70 -10 80 10" fill="#ef4444" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Beak */}
            <polygon points="45,60 55,60 50,70" fill="#f97316" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Cheeks */}
            <circle cx="25" cy="65" r="8" fill="#fca5a5" opacity="0.6" />
            <circle cx="75" cy="65" r="8" fill="#fca5a5" opacity="0.6" />
          </>
        );
      case 'duck':
        return (
          <>
            {/* Wide bill */}
            <path d="M 35 55 Q 50 48 65 55 Q 68 65 50 65 Q 32 65 35 55 Z" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Cheeks */}
            <circle cx="22" cy="58" r="7" fill="#fca5a5" opacity="0.6" />
            <circle cx="78" cy="58" r="7" fill="#fca5a5" opacity="0.6" />
          </>
        );
      case 'cow':
        return (
          <>
            {/* Horns */}
            <path d="M 18 12 Q 10 2 5 15" fill="#f5f5f4" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <path d="M 82 12 Q 90 2 95 15" fill="#f5f5f4" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Spots */}
            <path d="M 15 25 Q 25 35 22 45 Q 12 40 15 25 Z" fill="#292929" />
            <path d="M 75 20 Q 82 28 85 40 Q 70 35 75 20 Z" fill="#292929" />
            {/* Cow Muzzle/Snout */}
            <rect x="30" y="55" width="40" height="22" rx="10" fill="#fda4af" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="42" cy="65" r="3" fill="#e11d48" />
            <circle cx="58" cy="65" r="3" fill="#e11d48" />
          </>
        );
      case 'hamster':
        return (
          <>
            {/* Teeth */}
            <rect x="46" y="62" width="4" height="6" rx="1" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
            <rect x="50" y="62" width="4" height="6" rx="1" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
            {/* Snout */}
            <circle cx="44" cy="58" r="7" fill="#f3f4f6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="56" cy="58" r="7" fill="#f3f4f6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <polygon points="48,54 52,54 50,58" fill="#fda4af" />
            {/* Cheeks */}
            <circle cx="20" cy="60" r="9" fill="#f87171" opacity="0.7" />
            <circle cx="80" cy="60" r="9" fill="#f87171" opacity="0.7" />
          </>
        );
      case 'horse':
        return (
          <>
            {/* Hair mane */}
            <path d="M 40 5 Q 50 -8 60 5 L 50 35 Z" fill="#27272a" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Snout */}
            <rect x="35" y="56" width="30" height="24" rx="8" fill="#e7e5e4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="44" cy="68" r="3.5" fill="#57534e" />
            <circle cx="56" cy="68" r="3.5" fill="#57534e" />
            {/* White forehead stripe */}
            <rect x="46" y="15" width="8" height="35" rx="4" fill="#ffffff" />
          </>
        );
      case 'pig':
        return (
          <>
            {/* Ears */}
            <path d="M 10 15 Q 12 0 25 10" fill="#f43f5e" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 90 15 Q 88 0 75 10" fill="#f43f5e" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Large Snout */}
            <rect x="32" y="52" width="36" height="24" rx="12" fill="#f472b6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="44" cy="64" r="4.5" fill="#be185d" />
            <circle cx="56" cy="64" r="4.5" fill="#be185d" />
            {/* Cheeks */}
            <circle cx="18" cy="58" r="8" fill="#f472b6" opacity="0.6" />
            <circle cx="82" cy="58" r="8" fill="#f472b6" opacity="0.6" />
          </>
        );
      case 'buffalo':
        return (
          <>
            {/* Crescent horns */}
            <path d="M 12 25 Q -10 10 5 -5 Q 15 15 25 20" fill="#a8a29e" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 88 25 Q 110 10 95 -5 Q 85 15 75 20" fill="#a8a29e" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Big nostrils muzzle */}
            <rect x="30" y="55" width="40" height="24" rx="10" fill="#44403c" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="42" cy="67" r="4" fill="#1c1917" />
            <circle cx="58" cy="67" r="4" fill="#1c1917" />
          </>
        );
      case 'parrot':
        return (
          <>
            {/* Crest feathers */}
            <path d="M 33 10 Q 50 -10 40 -15" fill="#ef4444" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 50 10 Q 65 -5 60 -12" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Large beak */}
            <path d="M 38 50 Q 50 35 62 50 Q 50 82 38 50 Z" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 38 50 Q 50 56 62 50" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
            {/* White around eyes */}
            <circle cx="28" cy="46" r="14" fill="#ffffff" opacity="0.3" />
            <circle cx="72" cy="46" r="14" fill="#ffffff" opacity="0.3" />
          </>
        );
      case 'cat':
        return (
          <>
            {/* Whisker whiskers */}
            <line x1="8" y1="58" x2="24" y2="58" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="64" x2="22" y2="62" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="92" y1="58" x2="76" y2="58" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="94" y1="64" x2="78" y2="62" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Tiny nose & muzzle */}
            <polygon points="46,54 54,54 50,59" fill="#fda4af" stroke={strokeColor} strokeWidth="1.5" />
            <path d="M 45 61 Q 50 64 50 59 Q 50 64 55 61" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Pointy Cat ears */}
            <polygon points="5,20 22,2 35,22" fill="#ea580c" stroke={strokeColor} strokeWidth={strokeWidth} />
            <polygon points="95,20 78,2 65,22" fill="#ea580c" stroke={strokeColor} strokeWidth={strokeWidth} />
          </>
        );
      case 'dog':
        return (
          <>
            {/* Floppy ears */}
            <rect x="-2" y="15" width="16" height="42" rx="8" fill="#b45309" stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="86" y="15" width="16" height="42" rx="8" fill="#b45309" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Tongue sticking out */}
            <rect x="44" y="62" width="12" height="15" rx="6" fill="#f43f5e" stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1="50" y1="62" x2="50" y2="73" stroke="#be185d" strokeWidth="2" />
            {/* Cute black nose & cheeks */}
            <ellipse cx="50" cy="54" rx="7" ry="5" fill="#1e293b" />
            <circle cx="24" cy="62" r="8" fill="#fecdd3" opacity="0.7" />
            <circle cx="76" cy="62" r="8" fill="#fecdd3" opacity="0.7" />
          </>
        );
      case 'rabbit':
        return (
          <>
            {/* Long rabbit ears */}
            <rect x="18" y="-35" width="18" height="55" rx="9" fill="#f3f4f6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="23" y="-30" width="8" height="40" rx="4" fill="#fda4af" />
            <rect x="64" y="-35" width="18" height="55" rx="9" fill="#f3f4f6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="69" y="-30" width="8" height="40" rx="4" fill="#fda4af" />
            {/* Cute front teeth */}
            <rect x="45" y="63" width="5" height="7" rx="1.5" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
            <rect x="50" y="63" width="5" height="7" rx="1.5" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
            {/* Tiny nose */}
            <polygon points="46,55 54,55 50,59" fill="#fda4af" />
          </>
        );
      case 'fish':
        return (
          <>
            {/* Orange Fins on sides */}
            <path d="M -15 45 Q -25 35 -10 25 Z" fill="#f97316" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 115 45 Q 125 35 110 25 Z" fill="#f97316" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Back fish tail */}
            <path d="M 50 95 Q 35 115 25 110 Q 50 102 75 110 Q 65 115 50 95 Z" fill="#f97316" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Shiny scales */}
            <path d="M 30 70 Q 35 60 40 70 M 60 70 Q 65 60 70 70" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'turtle':
        return (
          <>
            {/* Simple hexagon patterned shield on body */}
            <path d="M 20 82 Q 50 86 80 82" stroke="#047857" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 30 25 L 70 25 L 85 50 L 70 75 L 30 75 L 15 50 Z" stroke="#34d399" strokeWidth="2" strokeDasharray="4" fill="none" opacity="0.4" />
            {/* Happy small smiley mouth */}
            <path d="M 44 60 Q 50 66 56 60" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case 'frog':
        return (
          <>
            {/* Bulging top eyes */}
            <circle cx="25" cy="18" r="13" fill="#4ade80" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="25" cy="18" r="7" fill="#ffffff" />
            <circle cx="26" cy="18" r="4.5" fill="#1e293b" />

            <circle cx="75" cy="18" r="13" fill="#4ade80" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="75" cy="18" r="7" fill="#ffffff" />
            <circle cx="74" cy="18" r="4.5" fill="#1e293b" />

            {/* Giant smile mouth */}
            <path d="M 30 55 Q 50 72 70 55" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Cheeks */}
            <circle cx="20" cy="54" r="8" fill="#fda4af" opacity="0.8" />
            <circle cx="80" cy="54" r="8" fill="#fda4af" opacity="0.8" />
          </>
        );

      // --- RARE ---
      case 'fox':
        return (
          <>
            {/* Huge ears */}
            <polygon points="5,22 -3,-5 25,12" fill="#ea580c" stroke={strokeColor} strokeWidth={strokeWidth} />
            <polygon points="12,-1 19,8 7,9" fill="#ffffff" />
            <polygon points="95,22 103,-5 75,12" fill="#ea580c" stroke={strokeColor} strokeWidth={strokeWidth} />
            <polygon points="88,-1 81,8 93,9" fill="#ffffff" />
            {/* White cheeks */}
            <path d="M 12 55 Q 30 55 35 68 L 12 68 Z" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 88 55 Q 70 55 65 68 L 88 68 Z" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Pointy cute black nose */}
            <polygon points="46,58 54,58 50,65" fill="#1c1917" />
          </>
        );
      case 'raccoon':
        return (
          <>
            {/* Bandit eye mask */}
            <path d="M 15 40 H 85 Q 85 58 75 58 H 25 Q 15 58 15 40 Z" fill="#1e293b" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Cute white highlights on mask for the big eyes */}
            <circle cx="30" cy="48" r="10" fill="#ffffff" opacity="0.1" />
            <circle cx="70" cy="48" r="10" fill="#ffffff" opacity="0.1" />
            {/* Snout */}
            <polygon points="47,56 53,56 50,61" fill="#0f172a" />
          </>
        );
      case 'deer':
        return (
          <>
            {/* Antlers/Horns */}
            <path d="M 22 10 L 15 -18 L 8 -12 M 15 -18 L 15 -5" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
            <path d="M 78 10 L 85 -18 L 92 -12 M 85 -18 L 85 -5" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
            {/* White spots */}
            <circle cx="50" cy="18" r="2.5" fill="#ffffff" />
            <circle cx="40" cy="22" r="2.5" fill="#ffffff" />
            <circle cx="60" cy="22" r="2.5" fill="#ffffff" />
            {/* Deer nose */}
            <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#1c1917" />
          </>
        );
      case 'owl':
        return (
          <>
            {/* Huge spectacles rings around eyes */}
            <circle cx="30" cy="45" r="18" fill="none" stroke="#d97706" strokeWidth="4.5" />
            <circle cx="70" cy="45" r="18" fill="none" stroke="#d97706" strokeWidth="4.5" />
            {/* Curved bill */}
            <path d="M 47 48 Q 50 63 53 48 Z" fill="#d97706" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Feather details on belly */}
            <path d="M 35 72 Q 40 68 45 72 M 55 72 Q 60 68 65 72" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'panda':
        return (
          <>
            {/* Dark Panda circles */}
            <ellipse cx="30" cy="48" rx="14" ry="11" transform="rotate(-15, 30, 48)" fill="#1c1917" />
            <ellipse cx="70" cy="48" rx="14" ry="11" transform="rotate(15, 70, 48)" fill="#1c1917" />
            {/* Black round ears */}
            <circle cx="10" cy="12" r="14" fill="#1c1917" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="90" cy="12" r="14" fill="#1c1917" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Small nose */}
            <ellipse cx="50" cy="58" rx="5" ry="3" fill="#000000" />
          </>
        );
      case 'penguin':
        return (
          <>
            {/* White facial heart shape mask */}
            <path d="M 50 15 Q 12 18 20 62 Q 50 82 80 62 Q 88 18 50 15 Z" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Pointy orange bill */}
            <polygon points="44,52 56,52 50,64" fill="#f59e0b" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Blush cheeks */}
            <circle cx="26" cy="56" r="6" fill="#fecdd3" />
            <circle cx="74" cy="56" r="6" fill="#fecdd3" />
          </>
        );
      case 'koala':
        return (
          <>
            {/* Giant fluffy ears */}
            <circle cx="4" cy="22" r="18" fill="#d1d5db" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="4" cy="22" r="11" fill="#ffffff" />
            <circle cx="96" cy="22" r="18" fill="#d1d5db" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="96" cy="22" r="11" fill="#ffffff" />
            {/* Huge black oval nose */}
            <rect x="42" y="46" width="16" height="26" rx="8" fill="#1f2937" stroke={strokeColor} strokeWidth={strokeWidth} />
          </>
        );

      // --- EPIC ---
      case 'tiger':
        return (
          <>
            {/* Forehead Tiger Stripes */}
            <path d="M 50 10 L 50 20 M 44 14 L 56 14 M 40 8 L 60 8" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            {/* Left and Right side cheek stripes */}
            <polygon points="5,45 18,48 5,51" fill="#1f2937" />
            <polygon points="95,45 82,48 95,51" fill="#1f2937" />
            {/* Tiny fangs */}
            <polygon points="40,58 44,58 42,64" fill="#ffffff" />
            <polygon points="56,58 60,58 58,64" fill="#ffffff" />
            {/* Nose pink / black overlay */}
            <polygon points="46,52 54,52 50,57" fill="#f43f5e" />
          </>
        );
      case 'lion':
        return (
          <>
            {/* Massive framing curly mane */}
            <path d="M 50 -15 Q 15 -10 -10 25 Q -15 65 15 102 Q 50 115 85 102 Q 115 65 110 25 Q 85 -10 50 -15 Z" fill="#b45309" stroke={strokeColor} strokeWidth={strokeWidth} opacity="0.85" />
            {/* Re-draw inner body bounds so the mane is background */}
            <rect x="8" y="8" width="84" height="84" rx="30" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Whiskers dots */}
            <circle cx="44" cy="58" r="1.5" fill="#4b5563" />
            <circle cx="56" cy="58" r="1.5" fill="#4b5563" />
            <polygon points="46,51 54,51 50,56" fill="#1e293b" />
          </>
        );
      case 'snow_leopard':
        return (
          <>
            {/* Graceful leopard spots */}
            <circle cx="22" cy="22" r="3" fill="#4b5563" />
            <circle cx="78" cy="22" r="3" fill="#4b5563" />
            <circle cx="15" cy="58" r="4.5" fill="#4b5563" />
            <circle cx="85" cy="58" r="4.5" fill="#4b5563" />
            <path d="M 45 15 Q 50 18 55 15" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Nose */}
            <polygon points="47,55 53,55 50,60" fill="#312e81" />
          </>
        );
      case 'wolf':
        return (
          <>
            {/* Sharp wolf cheeks */}
            <polygon points="4,55 -5,68 18,65" fill="#4b5563" stroke={strokeColor} strokeWidth={strokeWidth} />
            <polygon points="96,55 105,68 82,65" fill="#4b5563" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Sharp eyes styling - redraw glowing yellow iris */}
            <circle cx="31" cy="45" r="5" fill="#fbbf24" />
            <circle cx="69" cy="45" r="5" fill="#fbbf24" />
            <polygon points="46,55 54,55 50,61" fill="#111827" />
          </>
        );

      // --- LEGENDARY ---
      case 'golden_dragon':
        return (
          <>
            {/* Mythic Horns */}
            <path d="M 24 10 Q 10 -25 -2 -18 Q 12 -12 18 2" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 76 10 Q 90 -25 102 -18 Q 88 -12 82 2" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Fire whiskers */}
            <path d="M 32 55 Q 15 50 8 64" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
            <path d="M 68 55 Q 85 50 92 64" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
            <polygon points="45,52 55,52 50,58" fill="#ea580c" />
            {/* Glowing red mark on forehead */}
            <polygon points="50,14 53,20 50,26 47,20" fill="#ef4444" />
          </>
        );
      case 'phoenix':
        return (
          <>
            {/* Crown of Fire */}
            <path d="M 35 10 Q 50 -32 40 -12 Q 50 -44 60 -12 Q 50 -25 65 10" fill="#f97316" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Re-draw glowing yellow beak */}
            <polygon points="43,48 57,48 50,65" fill="#fbbf24" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="28" cy="54" r="7" fill="#f97316" opacity="0.6" />
            <circle cx="72" cy="54" r="7" fill="#f97316" opacity="0.6" />
          </>
        );
      case 'unicorn':
        return (
          <>
            {/* Spiral Horn with glowing rings */}
            <polygon points="45,10 55,10 50,-35" fill="#f472b6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <ellipse cx="50" cy="-10" rx="4" ry="2" fill="#a78bfa" />
            <ellipse cx="50" cy="0" rx="5" ry="2" fill="#67e8f9" />
            {/* Rainbow hair mane */}
            <path d="M 18 12 Q 5 -15 30 -5" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
            <path d="M 82 12 Q 95 -15 70 -5" fill="none" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round" />
          </>
        );
      case 'white_tiger':
        return (
          <>
            {/* Elegant greyish markings */}
            <line x1="50" y1="10" x2="50" y2="24" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="43" y1="16" x2="57" y2="16" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <polygon points="2,40 18,44 2,48" fill="#475569" />
            <polygon points="98,40 82,44 98,48" fill="#475569" />
            {/* Blue mystical eyes (glowing aura) */}
            <circle cx="31" cy="45" r="5" fill="#38bdf8" />
            <circle cx="69" cy="45" r="5" fill="#38bdf8" />
            <polygon points="46,55 54,55 50,60" fill="#475569" />
          </>
        );
      case 'celestial_fox':
        return (
          <>
            {/* Crescent moon representation in forehead */}
            <path d="M 44 14 Q 50 18 50 25 Q 44 25 44 14 Z" fill="#fbbf24" transform="rotate(-15, 47, 20)" />
            {/* Cloud ears tips */}
            <circle cx="12" cy="18" r="6" fill="#f472b6" opacity="0.6" />
            <circle cx="88" cy="18" r="6" fill="#f472b6" opacity="0.6" />
          </>
        );
      case 'thunder_eagle':
        return (
          <>
            {/* Lightning insignia */}
            <path d="M 50 8 L 56 18 H 44 L 50 28" fill="#facc15" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            {/* Blue glowing mask overlay */}
            <path d="M 20 40 L 45 46 L 50 55 L 55 46 L 80 40 L 50 32 Z" fill="#60a5fa" opacity="0.3" />
          </>
        );

      // --- SPECIAL EDUCATION CHARACTERS ---
      case 'math_owl':
        return (
          <>
            {/* Thick golden spectacles forming infinite symbol '8' */}
            <path d="M 20 45 Q 35 32 50 45 Q 65 32 80 45 Q 90 58 80 58 Q 65 58 50 45 Q 35 58 20 58 Q 10 58 20 45" fill="none" stroke="#eab308" strokeWidth="4.5" />
            {/* Math Symbols Plus & Minus drifting */}
            <path d="M 12 18 H 22 M 17 13 V 23" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 78 18 H 88" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="46,49 54,49 50,56" fill="#eab308" />
          </>
        );
      case 'physics_fox':
        return (
          <>
            {/* Orbiting electron rings surrounding the character */}
            <ellipse cx="50" cy="50" rx="45" ry="16" fill="none" stroke="#f97316" strokeWidth="2" transform="rotate(25, 50, 50)" strokeDasharray="3" />
            <circle cx="15" cy="35" r="4" fill="#fbbf24" />
            <circle cx="85" cy="65" r="4" fill="#67e8f9" />
            {/* Atomic center or light bulb representation */}
            <circle cx="50" cy="18" r="6" fill="#eab308" />
            <line x1="50" y1="24" x2="50" y2="28" stroke="#eab308" strokeWidth="2" />
          </>
        );
      case 'science_panda':
        return (
          <>
            {/* Goggles visor style */}
            <rect x="15" y="36" width="70" height="18" rx="6" fill="#14b8a6" opacity="0.4" stroke="#115e59" strokeWidth="2" />
            {/* Laboratory collar coat */}
            <path d="M 25 80 L 35 94 M 75 80 L 65 94" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            {/* Floating green bubble beaker inside avatar */}
            <circle cx="50" cy="65" r="5" fill="#34d399" />
            <circle cx="43" cy="58" r="3" fill="#34d399" opacity="0.6" />
          </>
        );
      case 'coding_penguin':
        return (
          <>
            {/* Cool coder spectacles with green matrix filter */}
            <rect x="20" y="38" width="25" height="15" rx="3" fill="#22c55e" opacity="0.25" stroke="#16a34a" strokeWidth="2" />
            <rect x="55" y="38" width="25" height="15" rx="3" fill="#22c55e" opacity="0.25" stroke="#16a34a" strokeWidth="2" />
            <line x1="45" y1="45" x2="55" y2="45" stroke="#16a34a" strokeWidth="2.5" />
            {/* Giant headset around head */}
            <path d="M 8 45 Q 8 8 50 8 Q 92 8 92 45" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
            <rect x="2" y="38" width="8" height="16" rx="3" fill="#1d4ed8" />
            <rect x="90" y="38" width="8" height="16" rx="3" fill="#1d4ed8" />
          </>
        );
      case 'chemistry_cat':
        return (
          <>
            {/* Wild bubbly hair points */}
            <path d="M 30 10 L 32 -5 L 40 8 L 50 -10 L 60 8 L 68 -5 L 70 10" fill="none" stroke="#ec4899" strokeWidth="3" />
            {/* Goggles spectacles with liquid levels */}
            <circle cx="31" cy="44" r="13" fill="#f472b6" opacity="0.3" stroke="#db2777" strokeWidth="2" />
            <circle cx="69" cy="44" r="13" fill="#f472b6" opacity="0.3" stroke="#db2777" strokeWidth="2" />
            <line x1="44" y1="44" x2="56" y2="44" stroke="#db2777" strokeWidth="2" />
            {/* Whiskers */}
            <line x1="10" y1="58" x2="22" y2="58" stroke={strokeColor} strokeWidth="2" />
            <line x1="90" y1="58" x2="78" y2="58" stroke={strokeColor} strokeWidth="2" />
          </>
        );
      case 'astronomy_wolf':
        return (
          <>
            {/* Wizard Starry Hat */}
            <polygon points="50,-35 30,10 70,10" fill="#312e81" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="50" cy="-10" r="3" fill="#fbbf24" />
            {/* Star sparkles */}
            <path d="M 12 18 L 14 14 L 18 12 L 14 10 L 12 6 L 10 10 L 6 12 L 10 14 Z" fill="#fbbf24" />
            <path d="M 88 18 L 90 14 L 94 12 L 90 10 L 88 6 L 86 10 L 82 12 L 86 14 Z" fill="#fbbf24" />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Gradient Color Mapping */}
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {id === 'chicken' && (
              <>
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            )}
            {id === 'duck' && (
              <>
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </>
            )}
            {id === 'cow' && (
              <>
                <stop offset="0%" stopColor="#f5f5f4" />
                <stop offset="100%" stopColor="#d6d3d1" />
              </>
            )}
            {id === 'hamster' && (
              <>
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="100%" stopColor="#f97316" />
              </>
            )}
            {id === 'horse' && (
              <>
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </>
            )}
            {id === 'pig' && (
              <>
                <stop offset="0%" stopColor="#fbcfe8" />
                <stop offset="100%" stopColor="#f472b6" />
              </>
            )}
            {id === 'buffalo' && (
              <>
                <stop offset="0%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#1f2937" />
              </>
            )}
            {id === 'parrot' && (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </>
            )}
            {id === 'cat' && (
              <>
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            )}
            {id === 'dog' && (
              <>
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#f97316" />
              </>
            )}
            {id === 'rabbit' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e5e7eb" />
              </>
            )}
            {id === 'fish' && (
              <>
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#06b6d4" />
              </>
            )}
            {id === 'turtle' && (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </>
            )}
            {id === 'frog' && (
              <>
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
              </>
            )}

            {/* Rares */}
            {id === 'fox' && (
              <>
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </>
            )}
            {id === 'raccoon' && (
              <>
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </>
            )}
            {id === 'deer' && (
              <>
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </>
            )}
            {id === 'owl' && (
              <>
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </>
            )}
            {id === 'panda' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e5e7eb" />
              </>
            )}
            {id === 'penguin' && (
              <>
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </>
            )}
            {id === 'koala' && (
              <>
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </>
            )}
            {id === 'dolphin' && (
              <>
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </>
            )}
            {id === 'seal' && (
              <>
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </>
            )}
            {id === 'peacock' && (
              <>
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </>
            )}

            {/* Epics */}
            {id === 'tiger' && (
              <>
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </>
            )}
            {id === 'lion' && (
              <>
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </>
            )}
            {id === 'snow_leopard' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </>
            )}
            {id === 'eagle' && (
              <>
                <stop offset="0%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </>
            )}
            {id === 'polar_bear' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </>
            )}
            {id === 'wolf' && (
              <>
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </>
            )}
            {id === 'gorilla' && (
              <>
                <stop offset="0%" stopColor="#374151" />
                <stop offset="100%" stopColor="#1f2937" />
              </>
            )}
            {id === 'rhino' && (
              <>
                <stop offset="0%" stopColor="#78716c" />
                <stop offset="100%" stopColor="#44403c" />
              </>
            )}

            {/* Legendaries */}
            {id === 'golden_dragon' && (
              <>
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#d97706" />
              </>
            )}
            {id === 'phoenix' && (
              <>
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </>
            )}
            {id === 'unicorn' && (
              <>
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#c084fc" />
              </>
            )}
            {id === 'white_tiger' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </>
            )}
            {id === 'celestial_fox' && (
              <>
                <stop offset="0%" stopColor="#4338ca" />
                <stop offset="100%" stopColor="#c084fc" />
              </>
            )}
            {id === 'thunder_eagle' && (
              <>
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </>
            )}

            {/* Special Edu */}
            {id === 'math_owl' && (
              <>
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </>
            )}
            {id === 'physics_fox' && (
              <>
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#9a3412" />
              </>
            )}
            {id === 'science_panda' && (
              <>
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#065f46" />
              </>
            )}
            {id === 'coding_penguin' && (
              <>
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#121824" />
              </>
            )}
            {id === 'chemistry_cat' && (
              <>
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#701a75" />
              </>
            )}
            {id === 'astronomy_wolf' && (
              <>
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#4c1d95" />
              </>
            )}
          </linearGradient>

          {/* Soft Drop shadow filter */}
          {showShadows && (
            <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" floodColor="#020617" />
            </filter>
          )}
        </defs>

        {/* Chibi base body: Rounded square shape as popular in premium gamified interfaces */}
        <g filter={showShadows ? "url(#soft-shadow)" : undefined}>
          <rect 
            x="10" 
            y="10" 
            width="80" 
            height="80" 
            rx="26" 
            fill={`url(#grad-${id})`}
            stroke={strokeColor} 
            strokeWidth={strokeWidth}
          />
        </g>

        {/* Big expressive anime/chibi eyes (Default if not custom overlayed) */}
        {/* Left Eye */}
        <circle cx="31" cy="45" r="9" fill="#1e293b" />
        <circle cx="28" cy="42" r="3" fill="#ffffff" />
        <circle cx="33" cy="47" r="1.5" fill="#ffffff" />

        {/* Right Eye */}
        <circle cx="69" cy="45" r="9" fill="#1e293b" />
        <circle cx="66" cy="42" r="3" fill="#ffffff" />
        <circle cx="71" cy="47" r="1.5" fill="#ffffff" />

        {/* Custom Chibi overlay decorations based on character ID */}
        {renderSpecialTraits(id)}

        {/* Standard happy smiley mouth for characters that do not define custom mouth/muzzle */}
        {!['duck', 'cow', 'hamster', 'horse', 'pig', 'buffalo', 'parrot', 'cat', 'dog', 'rabbit', 'penguin', 'koala', 'frog', 'lion', 'eagle', 'math_owl', 'science_panda'].includes(id) && (
          <path d="M 44 58 Q 50 63 56 58" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}
      </svg>
    </div>
  );
}
