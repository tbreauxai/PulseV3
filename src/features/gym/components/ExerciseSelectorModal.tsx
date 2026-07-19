import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, RefreshCw, X } from 'lucide-react';
import { useExercises } from '../hooks/useExercises';
import { groupMusclesByCategory } from './MuscleGroupSelectorModal';

export const ExerciseSelectorModal = ({ isOpen, onClose, onSelect, title = "ADD EXERCISE", isSwap = false, targetSwapExercise = null, initialMuscleGroup = 'All', excludeExercises = [] }: any) => {
  const { exercises: allExercises } = useExercises();
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState('All');
  const [filterEquipment, setFilterEquipment] = useState('All');

  useEffect(() => {
    if (isOpen) {
      if (isSwap && targetSwapExercise) {
        const GENERAL_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];
        const targetMuscles = (targetSwapExercise.muscleGroup || '').split(/[,|]/).map((s: string) => s.trim()).filter(Boolean);
        const generalMatch = targetMuscles.find((m: string) => GENERAL_GROUPS.includes(m));
        
        if (generalMatch) {
          setFilterMuscleGroup(generalMatch);
        } else if (targetMuscles.length > 0) {
          setFilterMuscleGroup(targetMuscles[0]);
        } else {
          const allMuscles = Array.from(new Set(
            allExercises.flatMap((ex: any) => (ex.muscleGroup || '').split(/[,|]/).map((m: string) => m.trim()).filter(Boolean))
          )).sort() as string[];
          setFilterMuscleGroup(allMuscles.length > 0 ? allMuscles[0] : 'All');
        }
      } else {
        setFilterMuscleGroup(initialMuscleGroup);
      }
    }
  }, [isOpen, initialMuscleGroup, isSwap, targetSwapExercise, allExercises]);

  if (!isOpen) return null;

  const uniqueMuscles = Array.from(new Set(
    allExercises.flatMap((ex: any) => (ex.muscleGroup || '').split(/[,|]/).map((m: string) => m.trim()).filter(Boolean))
  )).sort() as string[];
  const muscleGroupOptions = isSwap ? uniqueMuscles : ['All', ...uniqueMuscles];
  
  const equipmentOptions = ['All', ...Array.from(new Set(allExercises.map((ex: any) => ex.equipment).filter(Boolean))).sort()];

  const getMatchScore = (ex: any, target: any) => {
    if (!target) return 0;
    const targetMuscles = (target.muscleGroup || '').toLowerCase().split(/[,|]/).map((m: string) => m.trim()).filter(Boolean);
    const exMuscles = (ex.muscleGroup || '').toLowerCase().split(/[,|]/).map((m: string) => m.trim()).filter(Boolean);
    
    if (targetMuscles.length === 0 || exMuscles.length === 0) return 0;
    
    // Count exact intersections
    const intersection = exMuscles.filter((m: string) => targetMuscles.includes(m));
    return intersection.length;
  };

  const filteredExercises = allExercises.filter((ex: any) => {
    const search = exerciseSearchTerm.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(search) || 
                          (ex.muscleGroup || '').toLowerCase().includes(search);
                          
    const muscleGroups = (ex.muscleGroup || '').split(/[,|]/).map((m: string) => m.trim().toLowerCase()).filter(Boolean);
    const matchesMuscle = filterMuscleGroup === 'All' || muscleGroups.includes(filterMuscleGroup.toLowerCase());
    
    const matchesEquipment = filterEquipment === 'All' || ex.equipment === filterEquipment;
    const isExcluded = excludeExercises.includes(ex.name);
    return matchesSearch && matchesMuscle && matchesEquipment && !isExcluded;
  }).sort((a: any, b: any) => {
    if (isSwap && targetSwapExercise) {
      const scoreA = getMatchScore(a, targetSwapExercise);
      const scoreB = getMatchScore(b, targetSwapExercise);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Descending order (highest matches first)
      }
    }
    // Alphabetical fallback
    return a.name.localeCompare(b.name);
  });

  const handleSelect = (ex) => {
    onSelect(ex);
    // Reset state for next open
    setExerciseSearchTerm('');
    setFilterMuscleGroup('All');
    setFilterEquipment('All');
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setExerciseSearchTerm('');
    setFilterMuscleGroup('All');
    setFilterEquipment('All');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
        <div className="p-6 pb-4 shrink-0 border-b border-[#222]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">{title}</h3>
              <p className="text-xs text-gray-400 mt-1">Select an exercise from your library.</p>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={exerciseSearchTerm}
              onChange={(e) => setExerciseSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
            />
          </div>

          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <select 
                value={filterMuscleGroup}
                onChange={e => setFilterMuscleGroup(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:border-rose-600 transition-all appearance-none"
              >
                {(() => {
                  const hasAll = muscleGroupOptions.includes('All');
                  const optionsToGroup = muscleGroupOptions.filter(m => m !== 'All');
                  const { grouped, uncategorized } = groupMusclesByCategory(optionsToGroup);
                  
                  return (
                    <>
                      {hasAll && <option value="All">All Muscles</option>}
                      {grouped.map(g => (
                        <optgroup key={g.category} label={g.category.toUpperCase()}>
                          {g.muscles.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      ))}
                      {uncategorized.length > 0 && (
                        <optgroup label="OTHER">
                          {uncategorized.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            <div className="flex-1 relative">
              <select 
                value={filterEquipment}
                onChange={e => setFilterEquipment(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:border-rose-600 transition-all appearance-none"
              >
                {equipmentOptions.map((eq: any) => <option key={eq} value={eq}>{eq === 'All' ? 'All Equipment' : eq}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredExercises.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No exercises found matching your filters.
            </div>
          ) : (
            filteredExercises.map((ex: any) => (
              <div 
                key={ex.id}
                onClick={() => handleSelect(ex)}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl cursor-pointer hover:border-rose-600/50 transition-colors group"
              >
                <div>
                  <h4 className="text-white font-medium text-sm group-hover:text-rose-500 transition-colors">{ex.name}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{ex.muscleGroup} • {ex.equipment}</p>
                </div>
                {isSwap ? (
                  <RefreshCw className="h-4 w-4 text-gray-600 group-hover:text-rose-500 transition-colors" />
                ) : (
                  <Plus className="h-4 w-4 text-gray-600 group-hover:text-rose-500 transition-colors" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
