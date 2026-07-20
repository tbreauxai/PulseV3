import React, { useState } from 'react';
import { Scale, Utensils, LineChart, User } from 'lucide-react';
import { LifestyleWeighIn } from './components/LifestyleWeighIn';
import { LifestyleMealPrep } from './components/LifestyleMealPrep';
import { LifestyleMetrics } from './components/LifestyleMetrics';
import { LifestyleProgress } from './components/LifestyleProgress';
import { motion, AnimatePresence } from 'framer-motion';

export const LifestyleView = () => {
  const [lifeTab, setLifeTab] = useState('weigh-in');

  return (
    <div className="pb-24">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={lifeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {lifeTab === 'weigh-in' && <LifestyleWeighIn />}
            {lifeTab === 'metrics' && <LifestyleMetrics />}
            {lifeTab === 'meal-prep' && <LifestyleMealPrep />}
            {lifeTab === 'progress' && <LifestyleProgress />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-gray-900 z-40">
        <div className="flex items-center justify-around px-6 pt-4 pb-safe-nav max-w-md mx-auto">
          <button
            onClick={() => setLifeTab('weigh-in')}
            className={`flex flex-col items-center space-y-1 transition-colors ${lifeTab === 'weigh-in' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Scale className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">WEIGH-IN</span>
          </button>
          <button
            onClick={() => setLifeTab('metrics')}
            className={`flex flex-col items-center space-y-1 transition-colors ${lifeTab === 'metrics' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <User className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">METRICS</span>
          </button>
          <button
            onClick={() => setLifeTab('meal-prep')}
            className={`flex flex-col items-center space-y-1 transition-colors ${lifeTab === 'meal-prep' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Utensils className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">MEAL-PREP</span>
          </button>
          <button
            onClick={() => setLifeTab('progress')}
            className={`flex flex-col items-center space-y-1 transition-colors ${lifeTab === 'progress' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <LineChart className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">PROGRESS</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
