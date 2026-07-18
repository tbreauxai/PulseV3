import React, { useState } from 'react';
import { ClipboardList, Dumbbell, TrendingUp, Calendar } from 'lucide-react';
import { GymRoutine } from './components/GymRoutine';
import { GymExercises } from './components/GymExercises';
import { GymProgress } from './components/GymProgress';
import { GymToday } from './components/GymToday';
import { motion, AnimatePresence } from 'framer-motion';

export const GymView = () => {
  const [gymTab, setGymTab] = useState('today');

  return (
    <div className="pb-24">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={gymTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {gymTab === 'today' && <GymToday />}
            {gymTab === 'routine' && <GymRoutine />}
            {gymTab === 'exercises' && <GymExercises />}
            {gymTab === 'progress' && <GymProgress />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-gray-900 z-40">
        <div className="flex items-center justify-around px-6 pt-4 pb-safe-nav max-w-md mx-auto">
          <button
            onClick={() => setGymTab('today')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'today' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">TODAY</span>
          </button>
          <button
            onClick={() => setGymTab('routine')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'routine' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">ROUTINE</span>
          </button>
          <button
            onClick={() => setGymTab('exercises')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'exercises' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Dumbbell className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">EXERCISES</span>
          </button>
          <button
            onClick={() => setGymTab('progress')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'progress' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">PROGRESS</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
