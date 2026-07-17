import React, { useState, useEffect } from 'react';
import { Utensils, Droplets, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePersistentState } from '../../hooks/usePersistentState';

export const LifestyleMealPrep = () => {
  const todayDate = new Date().toLocaleDateString('en-US');

  // Hydration state
  const [water, setWater] = usePersistentState(`pulse_water_${todayDate}`, 0);
  const [loading, setLoading] = useState(false);
  const waterGoal = 8;

  // Macros state
  const [macroGoals, setMacroGoals] = usePersistentState('pulse_macro_goals', { calories: 2800, protein: 180, carbs: 300, fats: 85 });
  const [currentMacros, setCurrentMacros] = usePersistentState(`pulse_current_macros_${todayDate}`, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [editGoals, setEditGoals] = useState(macroGoals);

  const [showLogModal, setShowLogModal] = useState(false);
  const [mealInput, setMealInput] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  useEffect(() => {
    fetchHydration();
    fetchMacroGoals();
    fetchDailyMacros();
  }, []);

  const fetchHydration = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('date', todayDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setWater(data.water_glasses);
      } else {
        setWater(0);
      }
    } catch (e) {
      console.error('Error fetching hydration:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMacroGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('calories_goal, protein_goal, carbs_goal, fats_goal')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // Only log actual errors, not "table undefined" or "no rows" if they haven't run the SQL yet
        if (error.code !== '42P01') console.error('Error fetching macro goals:', error);
        return;
      }
      
      if (data) {
        const dbGoals = {
          calories: data.calories_goal,
          protein: data.protein_goal,
          carbs: data.carbs_goal,
          fats: data.fats_goal
        };
        setMacroGoals(dbGoals);
        setEditGoals(dbGoals);
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const fetchDailyMacros = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_macros')
        .select('calories, protein, carbs, fats')
        .eq('date', todayDate)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        if (error.code !== '42P01') console.error('Error fetching daily macros:', error);
        return;
      }
      
      if (data) {
        setCurrentMacros(data);
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const handleLogWater = async () => {
    const newWater = Math.min(water + 1, waterGoal);
    setWater(newWater);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('hydration_logs')
        .upsert({ 
          user_id: user.id,
          date: todayDate, 
          water_glasses: newWater 
        }, { onConflict: 'user_id, date' });

      if (error) throw error;
    } catch (e) {
      console.error('Error logging water:', e);
      setWater(water);
    }
  };

  const saveMacroGoals = async () => {
    setMacroGoals(editGoals);
    setIsEditingMacros(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          calories_goal: editGoals.calories,
          protein_goal: editGoals.protein,
          carbs_goal: editGoals.carbs,
          fats_goal: editGoals.fats
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (e) {
      console.error('Error saving macro goals:', e);
      alert('Error saving to database. Did you run the SQL script?');
    }
  };

  const handleLogMeal = async () => {
    const newMacros = {
      calories: currentMacros.calories + Number(mealInput.calories),
      protein: currentMacros.protein + Number(mealInput.protein),
      carbs: currentMacros.carbs + Number(mealInput.carbs),
      fats: currentMacros.fats + Number(mealInput.fats),
    };
    
    setCurrentMacros(newMacros);
    setShowLogModal(false);
    setMealInput({ calories: 0, protein: 0, carbs: 0, fats: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('daily_macros')
        .upsert({
          user_id: user.id,
          date: todayDate,
          calories: newMacros.calories,
          protein: newMacros.protein,
          carbs: newMacros.carbs,
          fats: newMacros.fats
        }, { onConflict: 'user_id, date' });

      if (error) throw error;
    } catch (e) {
      console.error('Error saving daily macros:', e);
      alert('Error saving to database. Did you run the SQL script?');
      setCurrentMacros(currentMacros);
    }
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
              if (isEditingMacros) saveMacroGoals();
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
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '-' : water}<span className="text-lg text-gray-600">/{waterGoal}</span>
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

      {/* Log Meal Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Log Meal</h3>
              <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              {[
                { label: 'Calories', key: 'calories', placeholder: 'kcal' },
                { label: 'Protein', key: 'protein', placeholder: 'g' },
                { label: 'Carbs', key: 'carbs', placeholder: 'g' },
                { label: 'Fats', key: 'fats', placeholder: 'g' }
              ].map(item => (
                <div key={item.key} className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 tracking-wider mb-1.5">{item.label}</label>
                  <input 
                    type="number" 
                    value={mealInput[item.key] || ''}
                    onChange={e => setMealInput({...mealInput, [item.key]: e.target.value})}
                    placeholder={item.placeholder}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleLogMeal}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              ADD TO DAILY TOTAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
