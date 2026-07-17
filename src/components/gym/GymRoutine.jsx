import React from 'react';
import { Flame, Play, Trophy, Timer, Dumbbell, ChevronRight } from 'lucide-react';

export const GymRoutine = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Today's Split</h2>
        <p className="text-rose-600/80 font-medium text-sm mt-1">Push Day (Chest, Shoulders, Triceps)</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-rose-600/10 flex items-center justify-center border border-rose-600/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]">
        <Flame className="text-rose-600 h-6 w-6" />
      </div>
    </div>

    <button className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
      <Play className="h-5 w-5 fill-current" />
      <span>START WORKOUT</span>
    </button>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Trophy className="h-4 w-4 text-rose-600" />
          <span className="text-xs font-bold text-gray-500 tracking-wider">WEEKLY GOAL</span>
        </div>
        <div className="text-3xl font-black text-white">4<span className="text-lg text-gray-600">/5</span></div>
        <div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-rose-600 h-full w-4/5 rounded-full"></div>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Timer className="h-4 w-4 text-rose-600" />
          <span className="text-xs font-bold text-gray-500 tracking-wider">LAST SESSION</span>
        </div>
        <div className="text-xl font-bold text-white mt-1">1h 15m</div>
        <div className="text-sm font-medium text-gray-500 mt-1">12,400 lbs volume</div>
      </div>
    </div>

    <div>
      <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">UP NEXT</h3>
      <div className="space-y-3">
        {['Heavy Bench Press', 'Incline Dumbbell Press', 'Lateral Raises'].map((exercise, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-rose-600/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-rose-600/10 transition-colors">
                <Dumbbell className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
              </div>
              <div>
                <h4 className="text-white font-medium">{exercise}</h4>
                <p className="text-xs text-gray-500 mt-0.5">3 Sets • 8-12 Reps</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-700 group-hover:text-rose-600 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
