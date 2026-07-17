import React from 'react';
import { Trophy } from 'lucide-react';

export const GymProgress = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <h2 className="text-2xl font-bold text-white tracking-tight">Analytics</h2>

    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider">VOLUME LOAD</h3>
        <span className="text-rose-600 text-xs font-bold bg-rose-600/10 px-2 py-1 rounded">PAST 7 DAYS</span>
      </div>
      
      <div className="flex items-end justify-between h-32 gap-2">
        {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
          <div key={i} className="w-full bg-gray-900 rounded-sm relative group hover:bg-rose-600/20 transition-colors cursor-pointer flex flex-col justify-end" style={{ height: '100%' }}>
            <div className="w-full bg-rose-600 rounded-sm transition-all duration-700 ease-out" style={{ height: `${height}%` }}></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-[10px] font-bold text-gray-600">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
    </div>

    <div>
      <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">PERSONAL RECORDS</h3>
      <div className="space-y-3">
        {[
          { name: 'Bench Press', weight: '225 lbs', date: 'Oct 12' },
          { name: 'Squat', weight: '315 lbs', date: 'Oct 05' },
          { name: 'Deadlift', weight: '405 lbs', date: 'Sep 28' },
        ].map((pr, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-rose-600/10 rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-rose-600" />
              </div>
              <span className="text-white font-medium">{pr.name}</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">{pr.weight}</div>
              <div className="text-xs text-gray-500 mt-0.5">{pr.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
