import React, { useMemo, useState } from 'react';
import Model from 'react-body-highlighter';
import { useExercises } from '../hooks/useExercises';

const genericMuscleMap: Record<string, string> = {
  // Chest
  'Chest': 'chest',
  'Upper Chest': 'chest',
  'Mid Chest': 'chest',
  'Lower Chest': 'chest',
  'Inner Chest': 'chest',

  // Back
  'Back': 'upper-back',
  'Lats': 'upper-back',
  'Upper Lats': 'upper-back',
  'Mid Back': 'upper-back',
  'Mid-back (Rhomboids)': 'upper-back',
  'Lower Back': 'lower-back',
  'Rhomboids': 'upper-back',
  'Levator Scapulae': 'upper-back',

  // Traps
  'Traps': 'trapezius',
  'Upper Traps': 'trapezius',
  'Mid Traps': 'trapezius',
  'Lower Traps': 'trapezius',

  // Shoulders
  'Shoulders': 'front-deltoids', 
  'Front Delts': 'front-deltoids',
  'Side Delts': 'front-deltoids',
  'Rear Delts': 'back-deltoids',

  // Arms
  'Arms': 'biceps',
  'General Biceps': 'biceps',
  'Biceps Brachii (Short Head Emphasis)': 'biceps',
  'Biceps Brachii (Long Head Emphasis)': 'biceps',
  'Brachialis': 'biceps',
  'Triceps': 'triceps',
  'Triceps (Lateral Head)': 'triceps',
  'Triceps (Medial Head)': 'triceps',
  'Triceps (Long head)': 'triceps',

  // Forearms
  'Forearms': 'forearm',
  'Forearm Flexors': 'forearm',
  'Forearm Extensors': 'forearm',
  'Grip Stabilizers': 'forearm',
  'Brachioradialis': 'forearm',

  // Core
  'Core': 'abs',
  'Upper Abs': 'abs',
  'Lower Abs': 'abs',
  'Transverse Abdominis': 'abs',
  'Hip Flexors': 'abs',
  'Obliques': 'obliques',

  // Legs
  'Legs': 'quadriceps',
  'Quads': 'quadriceps',
  'Hamstrings': 'hamstring',
  'Glutes': 'gluteal',
  'Gluteus Maximus': 'gluteal',
  'Gluteus Minimus': 'gluteal',
  'Gluteus Medius': 'gluteal',
  'Calves': 'calves',
  'Soleus (Underlying Calf Muscle)': 'calves',
  'Gastrocnemius (Outer Calf Muscle)': 'calves',
  'Adductors': 'adductor',
  'Abductors': 'abductors',
  'Tensor Faciae Latae (Outer Hip)': 'abductors'
};

const highlightedColors = [
  '#4c0519', // very low (rose-950)
  '#881337', // low (rose-900)
  '#be123c', // medium (rose-700)
  '#e11d48', // high (rose-600)
  '#fb7185', // very high (rose-400)
];

export const MuscleHeatmap = ({ history }: { history: any[] }) => {
  const { exercises: allExercises } = useExercises();
  const [viewType, setViewType] = useState<'anterior' | 'posterior'>('anterior');

  const heatmapData = useMemo(() => {
    // 1. Filter history for the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayNormalized = normalizeDate(now);
    
    const recentHistory = history.filter(workout => {
      const wDate = new Date(workout.date);
      return wDate >= sevenDaysAgo;
    });

    // 2. Accumulate sets per generic muscle
    const muscleSetCounts: Record<string, number> = {};

    recentHistory.forEach(workout => {
      const wDateNormalized = normalizeDate(new Date(workout.date));
      const diffDays = Math.floor((todayNormalized.getTime() - wDateNormalized.getTime()) / (1000 * 60 * 60 * 24));
      
      let timeMultiplier = 0;
      if (diffDays <= 1) timeMultiplier = 1.0;
      else if (diffDays === 2) timeMultiplier = 0.75;
      else if (diffDays === 3) timeMultiplier = 0.5;
      else if (diffDays === 4) timeMultiplier = 0.25;
      else timeMultiplier = 0;

      if (timeMultiplier === 0 || !workout.exerciseDetails) return;

      workout.exerciseDetails.forEach((ex: any) => {
        // Find global exercise to determine muscle group
        const globalEx = allExercises.find((g: any) => g.name === ex.exerciseName);
        if (!globalEx || !globalEx.muscleGroup) return;

        // Parse Primary | Secondary or comma-separated
        const muscleGroups = globalEx.muscleGroup.split(/[|,]/).map((s: string) => s.trim());
        
        // Count completed sets
        const completedSets = ex.sets ? ex.sets.filter((s: any) => s.completed).length : 0;
        
        if (completedSets > 0) {
          const processedGenerics = new Set<string>();
          
          muscleGroups.forEach((mg: string, index: number) => {
            const generic = genericMuscleMap[mg];
            if (!generic || processedGenerics.has(generic)) return;
            
            processedGenerics.add(generic);
            const isPrimary = index === 0;
            const baseHeat = isPrimary ? completedSets : (completedSets * 0.5);
            const addedHeat = baseHeat * timeMultiplier;
            
            muscleSetCounts[generic] = (muscleSetCounts[generic] || 0) + addedHeat;
          });
        }
      });
    });

    // 3. Format data for react-body-highlighter
    // It expects: [{ name: 'Workout', muscles: ['chest'], frequency: 1 }]
    return Object.entries(muscleSetCounts).map(([muscle, count]) => {
      let freq = 1;
      if (count > 2) freq = 2;
      if (count > 5) freq = 3;
      if (count > 9) freq = 4;
      if (count > 14) freq = 5;

      return {
        name: `Heat Score: ${count.toFixed(1)}`,
        muscles: [muscle],
        frequency: freq
      };
    });

  }, [history, allExercises]);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider">MUSCLE HEATMAP</h3>
        <span className="text-rose-600 text-xs font-bold bg-rose-600/10 px-2 py-1 rounded">ACTIVE RECOVERY</span>
      </div>



      <div className="flex justify-center mb-6">
        <div className="bg-[#111] border border-[#222] rounded-lg flex p-1">
          <button 
            onClick={() => setViewType('anterior')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${viewType === 'anterior' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            FRONT
          </button>
          <button 
            onClick={() => setViewType('posterior')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${viewType === 'posterior' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            BACK
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden">
        <Model
          data={heatmapData}
          style={{ width: '15rem', padding: '1rem' }}
          type={viewType}
          bodyColor="#222"
          highlightedColors={highlightedColors}
        />
      </div>

      <div className="flex items-center justify-center space-x-1 mt-6">
        <span className="text-[10px] text-gray-600 mr-2">Low</span>
        {highlightedColors.map((color, i) => (
          <div key={i} className="h-2 w-6 rounded-sm" style={{ backgroundColor: color }}></div>
        ))}
        <span className="text-[10px] text-gray-600 ml-2">High</span>
      </div>
    </div>
  );
};
