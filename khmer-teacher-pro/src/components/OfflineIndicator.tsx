/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]"
        >
          <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700">
            <WifiOff className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold khmer-text">អ្នកកំពុងប្រើប្រាស់ Offline</span>
            <div className="w-1 h-1 bg-slate-700 rounded-full mx-1"></div>
            <span className="text-[10px] text-slate-400">ទិន្នន័យនឹងរក្សាទុកក្នុងម៉ាស៊ីន</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
