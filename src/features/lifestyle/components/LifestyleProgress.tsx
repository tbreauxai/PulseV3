import React from 'react';
import { Activity, Footprints, Moon } from 'lucide-react';

export const LifestyleProgress = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Daily Readiness</h2>
        <p className="text-emerald-500/80 font-medium text-sm mt-1">Optimal Recovery Status</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
        <Activity className="text-emerald-500 h-6 w-6" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col justify-between h-32">
        <div className="flex items-center space-x-2">
          <Footprints className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold text-gray-500 tracking-wider">STEPS</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">8,432</div>
          <div className="text-xs font-medium text-emerald-500/80 mt-1">of 10,000 goal</div>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col justify-between h-32">
        <div className="flex items-center space-x-2">
          <Moon className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold text-gray-500 tracking-wider">SLEEP</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">7h 20m</div>
          <div className="text-xs font-medium text-emerald-500/80 mt-1">Score: 88/100</div>
        </div>
      </div>
    </div>

    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider">RECOVERY TREND</h3>
        <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">PAST 7 DAYS</span>
      </div>
      
      <div className="flex items-end justify-between h-32 gap-2">
        {[88, 92, 75, 85, 95, 80, 88].map((height, i) => (
          <div key={i} className="w-full bg-gray-900 rounded-sm relative group hover:bg-emerald-500/20 transition-colors cursor-pointer flex flex-col justify-end" style={{ height: '100%' }}>
            <div 
              className={`w-full rounded-sm transition-all duration-700 ease-out ${height >= 85 ? 'bg-emerald-500' : height >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} 
              style={{ height: `${height}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-[10px] font-bold text-gray-600">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
    </div>
  </div>
);
