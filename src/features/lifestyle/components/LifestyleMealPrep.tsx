import React, { useState, useEffect } from 'react';
import { Utensils, Droplets, Plus, X } from 'lucide-react';
import { useHydration } from '../hooks/useHydration';
import { useMacros } from '../hooks/useMacros';
import { MacroProgress } from './MacroProgress';
import { LogMealModal } from './LogMealModal';

export const LifestyleMealPrep = () => {
  const todayDate = new Date().toLocaleDateString('en-US');

  const { water, isLoading: loading, logWater, waterGoal, saveWaterGoal } = useHydration(todayDate);
  const { macroGoals, currentMacros, saveMacroGoals, logMeal } = useMacros(todayDate);

  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [editGoals, setEditGoals] = useState(macroGoals);
  const [editWaterGoal, setEditWaterGoal] = useState(waterGoal);
  const [isEditingWater, setIsEditingWater] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (isEditingMacros === false) {
        setEditGoals(macroGoals);
    }
  }, [macroGoals, isEditingMacros]);

  const handleLogWater = async () => {
    const newWater = Math.min(water + 1, waterGoal);
    logWater(newWater);
  };

  const handleSaveMacroGoals = async () => {
    saveMacroGoals(editGoals);
    setIsEditingMacros(false);
  };

  const handleLogMeal = async (mealData) => {
    const newMacros = {
      calories: currentMacros.calories + Number(mealData.calories),
      protein: currentMacros.protein + Number(mealData.protein),
      carbs: currentMacros.carbs + Number(mealData.carbs),
      fats: currentMacros.fats + Number(mealData.fats),
    };
    logMeal(newMacros);
  };

  const calcPercent = (current, goal) => Math.min(100, Math.round((current / goal) * 100)) || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nutrition</h2>
          <p className="text-emerald-500/80 font-medium text-sm mt-1">{currentMacros.calories} / {macroGoals.calories} kcal</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Utensils className="text-emerald-500 h-5 w-5" />
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-500 tracking-wider">MACROS</h3>
          <button 
            onClick={() => {
              if (isEditingMacros) handleSaveMacroGoals();
              else {
                setEditGoals(macroGoals);
                setIsEditingMacros(true);
              }
            }}
            className="text-xs font-bold text-emerald-500 hover:text-emerald-400"
          >
            {isEditingMacros ? 'SAVE GOALS' : 'EDIT GOALS'}
          </button>
        </div>

        {isEditingMacros ? (
          <div className="space-y-4">
            {[
              { label: 'Calories (kcal)', key: 'calories' },
              { label: 'Protein (g)', key: 'protein' },
              { label: 'Carbs (g)', key: 'carbs' },
              { label: 'Fats (g)', key: 'fats' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-white text-sm font-bold">{item.label}</span>
                <input 
                  type="number" 
                  value={editGoals[item.key]}
                  onChange={e => setEditGoals({...editGoals, [item.key]: Number(e.target.value)})}
                  className="w-24 bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white text-right outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            ))}
          </div>
        ) : (
          <MacroProgress currentMacros={currentMacros} macroGoals={macroGoals} />
        )}
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
              <button 
                onClick={() => {
                  if (isEditingWater) {
                    saveWaterGoal(editWaterGoal);
                    setIsEditingWater(false);
                  } else {
                    setEditWaterGoal(waterGoal);
                    setIsEditingWater(true);
                  }
                }} 
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 ml-2"
              >
                {isEditingWater ? 'SAVE' : 'EDIT'}
              </button>
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '-' : water}
              {isEditingWater ? (
                <input 
                  type="number" 
                  value={editWaterGoal} 
                  onChange={e => setEditWaterGoal(Number(e.target.value))} 
                  className="w-16 ml-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-lg text-white text-center outline-none focus:border-emerald-500 transition-colors inline-block align-middle"
                />
              ) : (
                <span className="text-lg text-gray-600">/{waterGoal}</span>
              )}
            </div>
            <p className="text-xs font-medium text-emerald-500/80 mt-1">Glasses today</p>
          </div>
          <button 
            onClick={handleLogWater}
            disabled={loading || water >= waterGoal}
            className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
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

      <button 
        onClick={() => setShowLogModal(true)}
        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] hover:border-emerald-500/30 active:scale-[0.98] transition-all text-white font-medium py-4 rounded-xl flex items-center justify-center space-x-2"
      >
        <Plus className="h-5 w-5 text-emerald-500" />
        <span>Log Meal</span>
      </button>

      <LogMealModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
        onLogMeal={handleLogMeal} 
      />
    </div>
  );
};
