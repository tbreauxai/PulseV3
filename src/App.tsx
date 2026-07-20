import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useAuth } from './features/auth/context/AuthContext';
import { LogOut, Loader2, Settings, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsModal } from './components/SettingsModal';
import { AICoachChat } from './components/AICoachChat';

const AuthScreen = lazy(() => import('./features/auth/components/AuthScreen').then(module => ({ default: module.AuthScreen })));
const GymView = lazy(() => import('./features/gym/GymView').then(module => ({ default: module.GymView })));
const LifestyleView = lazy(() => import('./features/lifestyle/LifestyleView').then(module => ({ default: module.LifestyleView })));
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('gym');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const { session } = useAuth() as any;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session) {
      // Proactively fetch all major queries in the background so tabs load instantly
      queryClient.prefetchQuery({ queryKey: ['routines'] });
      queryClient.prefetchQuery({ queryKey: ['workoutHistory'] });
      queryClient.prefetchQuery({ queryKey: ['weighIns'] });
      queryClient.prefetchQuery({ queryKey: ['macroGoals'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] }); // Force re-run to trigger recovery
    }
  }, [session, queryClient]);

  if (!session) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-rose-600 animate-spin" /></div>}>
        <AuthScreen />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-gray-800">
      <nav className="fixed top-0 w-full flex bg-black/90 backdrop-blur-lg z-50 border-b border-gray-900 pt-safe">
        <button
          onClick={() => setActiveTab('gym')}
          className={`flex-1 py-5 text-center font-black tracking-widest text-sm transition-all duration-300 relative ${
            activeTab === 'gym'
              ? 'text-rose-600'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          GYM
          {activeTab === 'gym' && (
            <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]"></motion.div>
          )}
        </button>
        
        <div className="w-px bg-gray-900 my-4"></div>
        
        <button
          onClick={() => setActiveTab('lifestyle')}
          className={`flex-1 py-5 text-center font-black tracking-widest text-sm transition-all duration-300 relative ${
            activeTab === 'lifestyle'
              ? 'text-emerald-500'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          LIFESTYLE
          {activeTab === 'lifestyle' && (
            <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></motion.div>
          )}
        </button>
      </nav>

      <main className="pt-safe-main px-6 pb-8 max-w-md mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center">
            PULSE
            <span className={`ml-1 transition-colors duration-500 ${activeTab === 'gym' ? 'text-rose-600' : 'text-emerald-500'}`}>
              V3
            </span>
          </h1>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Suspense fallback={<div className="flex justify-center items-center py-32"><Loader2 className="w-8 h-8 text-gray-800 animate-spin" /></div>}>
                {activeTab === 'gym' ? <GymView /> : <LifestyleView />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <button
        onClick={() => setIsCoachOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-tr from-rose-600 to-purple-600 shadow-[0_0_20px_rgba(225,29,72,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <AnimatePresence>
        {isCoachOpen && <AICoachChat isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
