import React from 'react';

export const MacroProgress = ({ currentMacros, macroGoals }) => {
  const calcPercent = (current, goal) => Math.min(100, Math.round((current / goal) * 100)) || 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-white">Protein</span>
          <span className="text-emerald-500">{currentMacros.protein}g / {macroGoals.protein}g</span>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${calcPercent(currentMacros.protein, macroGoals.protein)}%` }}
          ></div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-white">Carbs</span>
          <span className="text-emerald-500">{currentMacros.carbs}g / {macroGoals.carbs}g</span>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${calcPercent(currentMacros.carbs, macroGoals.carbs)}%` }}
          ></div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-white">Fats</span>
          <span className="text-emerald-500">{currentMacros.fats}g / {macroGoals.fats}g</span>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${calcPercent(currentMacros.fats, macroGoals.fats)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
