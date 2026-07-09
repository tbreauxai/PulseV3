import React, { useState } from 'react';
import {
  Dumbbell,
  Activity,
  Flame,
  Droplets,
  Moon,
  Footprints,
  Plus,
  Play,
  ChevronRight,
  Trophy,
  Timer,
  ClipboardList,
  TrendingUp,
  Search,
  Scale,
  Utensils,
  LineChart,
  Minus,
} from 'lucide-react';

const GymRoutine = () => (
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

const GymExercises = () => {
  const [exercises, setExercises] = useState([
    { name: 'Barbell Bench Press', muscleGroup: 'Chest • Shoulders • Triceps', weight: '225 lbs', reps: '8-12' },
    { name: 'Incline Dumbbell Press', muscleGroup: 'Chest • Shoulders • Triceps', weight: '85 lbs', reps: '8-12' },
    { name: 'Cable Crossovers', muscleGroup: 'Chest • Shoulders • Triceps', weight: '45 lbs', reps: '12-15' },
    { name: 'Overhead Press', muscleGroup: 'Shoulders • Triceps', weight: '95 lbs', reps: '6-10' },
    { name: 'Lateral Raises', muscleGroup: 'Shoulders', weight: '20 lbs', reps: '12-15' },
    { name: 'Tricep Pushdowns', muscleGroup: 'Triceps', weight: '70 lbs', reps: '10-12' },
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    weight: '',
    reps: '',
  });

  const openExerciseForm = (exercise = { name: '', muscleGroup: '', weight: '', reps: '' }, index = null) => {
    setFormData(exercise);
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const closeExerciseForm = () => {
    setIsFormOpen(false);
    setEditingIndex(null);
    setFormData({ name: '', muscleGroup: '', weight: '', reps: '' });
  };

  const handleSaveExercise = () => {
    if (!formData.name.trim()) {
      return;
    }

    if (editingIndex === null) {
      setExercises((current) => [...current, formData]);
    } else {
      setExercises((current) => current.map((exercise, i) => (i === editingIndex ? formData : exercise)));
    }

    closeExerciseForm();
  };

  const handleChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Library</h2>
        <button
          onClick={() => openExerciseForm()}
          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600/10 border border-rose-600/20 px-4 py-3 text-rose-500 hover:bg-rose-600/15 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Add exercise</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search exercises..." 
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-rose-600/50 transition-colors placeholder:text-gray-600"
        />
      </div>

      {isFormOpen && (
        <div className="space-y-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider">{editingIndex === null ? 'Add Exercise' : 'Edit Exercise'}</h3>
              <p className="text-xs text-gray-500 mt-1">Enter exercise details below.</p>
            </div>
            <button
              onClick={closeExerciseForm}
              className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3">
            <label className="space-y-2 text-sm text-gray-300">
              Name
              <input
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Exercise name"
                className="w-full rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:border-rose-600/50"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Muscle group
              <input
                value={formData.muscleGroup}
                onChange={handleChange('muscleGroup')}
                placeholder="Chest • Shoulders • Triceps"
                className="w-full rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:border-rose-600/50"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Weight
              <input
                value={formData.weight}
                onChange={handleChange('weight')}
                placeholder="225 lbs"
                className="w-full rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:border-rose-600/50"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Reps
              <input
                value={formData.reps}
                onChange={handleChange('reps')}
                placeholder="8-12"
                className="w-full rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white focus:outline-none focus:border-rose-600/50"
              />
            </label>
          </div>

          <button
            onClick={handleSaveExercise}
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl"
          >
            {editingIndex === null ? 'Add Exercise' : 'Save Exercise'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {exercises.map((ex, i) => (
          <div key={i} className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-center justify-between cursor-pointer hover:border-rose-600/30 transition-all active:scale-[0.98]">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-rose-600/80" />
              </div>
              <div>
                <h4 className="text-white font-medium">{ex.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{ex.muscleGroup}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ex.weight} • {ex.reps} reps</p>
              </div>
            </div>
            <button
              onClick={() => openExerciseForm(ex, i)}
              className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-rose-600 transition-colors group"
            >
              <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const GymProgress = () => (
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

const GymView = () => {
  const [gymTab, setGymTab] = useState('routine');

  return (
    <div className="pb-24">
      {gymTab === 'routine' && <GymRoutine />}
      {gymTab === 'exercises' && <GymExercises />}
      {gymTab === 'progress' && <GymProgress />}

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-gray-900 z-40 pb-safe">
        <div className="flex items-center justify-around px-6 py-4 max-w-md mx-auto">
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

const LifestyleWeighIn = () => {
  const [weight, setWeight] = useState(175.4);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Body Mass</h2>
          <p className="text-emerald-500/80 font-medium text-sm mt-1">Goal: 185.0 lbs</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Scale className="text-emerald-500 h-6 w-6" />
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 text-center">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-6">TODAY's WEIGHT</h3>
        
        <div className="flex items-center justify-center space-x-6 mb-8">
          <button 
            onClick={() => setWeight(w => +(w - 0.1).toFixed(1))}
            className="h-12 w-12 rounded-full bg-gray-900 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center text-emerald-500"
          >
            <Minus className="h-5 w-5" />
          </button>
          
          <div className="flex items-baseline space-x-1 w-32 justify-center">
            <span className="text-5xl font-black text-white">{weight}</span>
            <span className="text-lg text-emerald-500 font-bold">lbs</span>
          </div>

          <button 
            onClick={() => setWeight(w => +(w + 0.1).toFixed(1))}
            className="h-12 w-12 rounded-full bg-gray-900 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center text-emerald-500"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <button className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          LOG WEIGHT
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">RECENT LOGS</h3>
        <div className="space-y-3">
          {[
            { date: 'Today', weight: '175.4 lbs', diff: '+0.2' },
            { date: 'Yesterday', weight: '175.2 lbs', diff: '-0.5' },
            { date: 'Oct 24', weight: '175.7 lbs', diff: '+0.1' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
              <span className="text-white font-medium">{log.date}</span>
              <div className="flex items-center space-x-3">
                <span className="text-white font-bold">{log.weight}</span>
                <span className={`text-xs font-bold w-12 text-right ${log.diff.startsWith('+') ? 'text-emerald-500' : 'text-gray-500'}`}>
                  {log.diff}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LifestyleMealPrep = () => {
  const [water, setWater] = useState(3);
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

const LifestyleProgress = () => (
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

const LifestyleView = () => {
  const [lifeTab, setLifeTab] = useState('weigh-in');

  return (
    <div className="pb-24">
      {lifeTab === 'weigh-in' && <LifestyleWeighIn />}
      {lifeTab === 'meal-prep' && <LifestyleMealPrep />}
      {lifeTab === 'progress' && <LifestyleProgress />}

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-gray-900 z-40 pb-safe">
        <div className="flex items-center justify-around px-6 py-4 max-w-md mx-auto">
          <button
            onClick={() => setLifeTab('weigh-in')}
            className={`flex flex-col items-center space-y-1 transition-colors ${lifeTab === 'weigh-in' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Scale className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">WEIGH-IN</span>
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

export default function App() {
  const [activeTab, setActiveTab] = useState('gym');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-gray-800">
      <nav className="fixed top-0 w-full flex bg-black/90 backdrop-blur-lg z-50 border-b border-gray-900">
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
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]"></div>
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
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          )}
        </button>
      </nav>

      <main className="pt-24 px-6 max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center">
            PULSE
            <span className={`ml-1 transition-colors duration-500 ${activeTab === 'gym' ? 'text-rose-600' : 'text-emerald-500'}`}>
              V3
            </span>
          </h1>
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'gym' ? <GymView /> : <LifestyleView />}
        </div>
      </main>
    </div>
  );
}
