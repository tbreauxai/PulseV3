import React, { useState, useEffect } from 'react';
import { Utensils, Droplets, Plus } from 'lucide-react';

export const LifestyleMealPrep = () => {
  const [water, setWater] = useState(() => {
    const saved = localStorage.getItem('pulseV3-hydration');
    const savedDate = localStorage.getItem('pulseV3-hydrationDate');
    const today = new Date().toLocaleDateString();
    // Reset to 0 if it's a new day or no data is saved
    if (saved !== null && savedDate === today) {
        return JSON.parse(saved);
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('pulseV3-hydration', JSON.stringify(water));
    localStorage.setItem('pulseV3-hydrationDate', new Date().toLocaleDateString());
  }, [water]);

  const waterGoal = 8;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nutrition</h2>
          <p className="text-emerald-500/80 font-medium text-sm mt-1">2,150 / 2,800 kcal</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Utensils className="text-emerald-500 h-5 w-5" />
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-4">MACROS</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-white">Protein</span>
              <span className="text-emerald-500">145g / 180g</span>
            </div>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[80%] rounded-full"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-white">Carbs</span>
              <span className="text-emerald-500">210g / 300g</span>
            </div>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[70%] rounded-full"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-white">Fats</span>
              <span className="text-emerald-500">65g / 85g</span>
            </div>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[76%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Droplets className="h-32 w-32 text-emerald-500" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Droplets className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-gray-500 tracking-wider">HYDRATION</span>
            </div>
            <div className="text-3xl font-black text-white">{water}<span className="text-lg text-gray-600">/{waterGoal}</span></div>
            <p className="text-xs font-medium text-emerald-500/80 mt-1">Glasses today</p>
          </div>
          <button 
            onClick={() => setWater(w => Math.min(w + 1, waterGoal))}
            className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            <Plus className="h-6 w-6 text-black" />
          </button>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full mt-5 overflow-hidden flex">
          {[...Array(waterGoal)].map((_, i) => (
            <div 
              key={i} 
              className={`h-full flex-1 border-r border-black last:border-0 transition-all duration-500 ${i < water ? 'bg-emerald-500' : 'bg-transparent'}`}
            ></div>
          ))}
        </div>
      </div>

      <button className="w-full bg-[#0a0a0a] border border-[#1a1a1a] hover:border-emerald-500/30 active:scale-[0.98] transition-all text-white font-medium py-4 rounded-xl flex items-center justify-center space-x-2">
        <Plus className="h-5 w-5 text-emerald-500" />
        <span>Log Meal</span>
      </button>
    </div>
  );
};
