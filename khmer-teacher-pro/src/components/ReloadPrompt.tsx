/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReloadPrompt() {
  const rs = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered');
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Handle case where hook might return undefined or incomplete object
  const offlineReadyState = rs?.offlineReady ?? [false, () => {}];
  const needUpdateState = rs?.needUpdate ?? [false, () => {}];
  
  const [offlineReady, setOfflineReady] = offlineReadyState;
  const [needUpdate, setNeedUpdate] = needUpdateState;
  const updateServiceWorker = rs?.updateServiceWorker;

  const close = () => {
    if (typeof setOfflineReady === 'function') setOfflineReady(false);
    if (typeof setNeedUpdate === 'function') setNeedUpdate(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needUpdate) && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[210] w-[90%] max-w-sm"
        >
          <div className="glass p-4 rounded-2xl border-primary/30 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold khmer-text">
                {offlineReady 
                  ? 'App អាចប្រើប្រាស់ Offline បានហើយ!' 
                  : 'មានកំណែថ្មី (Update) អាចប្រើប្រាស់បាន'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {needUpdate && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Update
                </button>
              )}
              <button
                onClick={close}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
