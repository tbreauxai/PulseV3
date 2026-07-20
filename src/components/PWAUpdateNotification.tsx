import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdateNotification = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Setup periodic checks for updates (every hour)
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -50, x: "-50%" }}
          className="fixed top-4 left-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-gradient-to-r from-rose-900/90 to-purple-900/90 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-rose-400 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Update Available</h4>
                  <p className="text-rose-200 text-xs">A new version of Pulse is ready.</p>
                </div>
              </div>
              <button 
                onClick={() => setNeedRefresh(false)}
                className="text-white/50 hover:text-white transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={() => updateServiceWorker(true)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(225,29,72,0.4)]"
            >
              Update Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
