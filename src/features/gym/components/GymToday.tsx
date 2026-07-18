import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Play, X, ChevronDown, ChevronRight, Dumbbell, Activity, CheckCircle2, Plus, Check, Trash2, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useRoutines } from '../hooks/useRoutines';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useExercises } from '../hooks/useExercises';
import { ActiveExerciseCard } from './ActiveExerciseCard';
import { RoutineSelectorModal } from './RoutineSelectorModal';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { CardioEntryModal } from './CardioEntryModal';
import { groupMusclesByCategory } from './MuscleGroupSelectorModal';

export const GymToday = () => {
  const { routines } = useRoutines();
  const { addWorkout } = useWorkoutHistory();
  const { exercises: allExercises } = useExercises();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isCardioModalOpen, setIsCardioModalOpen] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState(null); // Track which exercise is being swapped
  
  const [activeSession, setActiveSession] = useState(() => {
    const saved = localStorage.getItem('pulseV3-activeSession');
    return saved ? JSON.parse(saved) : null;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('pulseV3-activeSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('pulseV3-activeSession');
    }
  }, [activeSession]);

  const startRoutine = useCallback((routineId: any) => {
    const routine = routines.find((r: any) => String(r.id) === String(routineId));
    setActiveSession({
      routineId: routineId,
      routineName: routine ? routine.name : "Free Day",
      startTime: Date.now(),
      exercises: routine && routine.exercises ? [...routine.exercises] : [],
      sets: {} // Maps exerciseIndex -> array of set objects
    });
    setIsModalOpen(false);
  }, [routines]);

  const startFreeWorkout = useCallback(() => {
    setActiveSession({
      routineId: 'free',
      routineName: "Free Day",
      startTime: Date.now(),
      exercises: [],
      sets: {}
    });
  }, []);

  const [modalInitialFilter, setModalInitialFilter] = useState('All');

  const handleOpenExerciseModal = useCallback((swapIndex: any = null, filter: string = 'All') => {
    if (filter === 'Cardio') {
      setIsCardioModalOpen(true);
    } else {
      setSwapExerciseIndex(swapIndex);
      setModalInitialFilter(filter);
      setIsExerciseModalOpen(true);
    }
  }, []);

  const handleSaveCardio = (cardioData: any) => {
    setActiveSession((prev: any) => {
      const newExerciseIndex = prev.exercises.length;
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            exerciseName: cardioData.type,
            type: 'cardio',
            equipment: 'Cardio',
            muscleGroup: 'Cardio'
          }
        ],
        sets: {
          ...prev.sets,
          [newExerciseIndex]: [{
            time: cardioData.time,
            calories: cardioData.calories,
            distance: cardioData.distance,
            completed: true
          }]
        }
      };
    });
    setIsCardioModalOpen(false);
  };

  const addOrSwapCustomExercise = useCallback((exercise: any) => {
    setActiveSession((prev: any) => {
      const newExercises = [...prev.exercises];
      const newSets = { ...prev.sets };

      if (swapExerciseIndex !== null) {
        // Swapping an existing exercise
        newExercises[swapExerciseIndex] = {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          type: exercise.type,
          sets: '-',
          reps: '-'
        };
        newSets[swapExerciseIndex] = []; // Clear out sets for the new exercise
      } else {
        // Appending a new exercise
        newExercises.push({
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          type: exercise.type,
          sets: '-',
          reps: '-'
        });
      }

      return {
        ...prev,
        exercises: newExercises,
        sets: newSets
      };
    });
    
    setIsExerciseModalOpen(false);
    setSwapExerciseIndex(null);
  }, [swapExerciseIndex]);

  const finishWorkout = useCallback(async () => {
    if (window.confirm('Are you sure you want to finish and save this workout?')) {
      let totalVolume = 0;
      let completedSetsCount = 0;
      const completedExercises = [];

      activeSession.exercises.forEach((exercise: any, i: number) => {
        const exerciseSets = activeSession.sets[i] || [];
        const validSets = exerciseSets.filter((s: any) => s.completed);
        
        if (validSets.length > 0) {
          completedExercises.push({
            exerciseName: exercise.exerciseName || exercise.name,
            type: exercise.type || 'strength',
            sets: validSets
          });
          
          validSets.forEach(set => {
            completedSetsCount++;
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            totalVolume += (weight * reps);
          });
        }
      });

      if (completedSetsCount > 0) {
        try {
          await addWorkout({
            routineName: activeSession.routineName || "Free Day",
            duration: Date.now() - activeSession.startTime,
            completedSets: completedSetsCount,
            totalVolume: totalVolume,
            exerciseDetails: completedExercises
          });
        } catch (e: any) {
          alert("Error saving workout: " + e.message);
          return;
        }
      }

      setActiveSession(null);
    }
  }, [activeSession, addWorkout]);

  const [exerciseMemoryCache, setExerciseMemoryCache] = useState({});

  useEffect(() => {
    const fetchMemory = async () => {
      const { data, error } = await supabase.from('exercise_memory').select('*');
      if (data) {
        const cache: any = {};
        data.forEach(item => {
          cache[item.exercise_name] = { weight: item.weight, reps: item.reps };
        });
        setExerciseMemoryCache(cache);
      }
    };
    fetchMemory();
  }, []);

  const getExerciseMemory = useCallback((exerciseName: any) => {
    return (exerciseMemoryCache as any)[exerciseName] || { weight: '', reps: '' };
  }, [exerciseMemoryCache]);

  const saveExerciseMemory = useCallback(async (exerciseName: any, weight: any, reps: any) => {
    setExerciseMemoryCache((prev: any) => ({
      ...prev,
      [exerciseName]: { weight, reps }
    }));

    try {
      const payload = { 
        exercise_name: exerciseName, 
        weight: weight.toString(), 
        reps: reps.toString(),
        updated_at: new Date().toISOString()
      };

      if (!navigator.onLine) {
        queueMutation('upsert', 'exercise_memory', payload);
        return;
      }

      const { error } = await supabase
        .from('exercise_memory')
        .upsert(payload);
      if (error) console.error(error);
    } catch (e: any) {
      if (e.message === 'Failed to fetch' || (e.message && e.message.includes('NetworkError'))) {
        const payload = { 
          exercise_name: exerciseName, 
          weight: weight.toString(), 
          reps: reps.toString(),
          updated_at: new Date().toISOString()
        };
        queueMutation('upsert', 'exercise_memory', payload);
      } else {
        console.error(e);
      }
    }
  }, []);

  const addSet = useCallback((exerciseIndex: any, exerciseName: any) => {
    setActiveSession((prev: any) => {
      const currentSets = prev.sets[exerciseIndex] || [];
      const lastSet = currentSets[currentSets.length - 1];
      
      let newSet;
      if (lastSet) {
        newSet = { 
          weight: lastSet.weight || '', 
          reps: lastSet.reps || '', 
          time: lastSet.time || '',
          distance: lastSet.distance || '',
          completed: false 
        };
      } else {
        const memory = getExerciseMemory(exerciseName);
        const exercise = prev.exercises[exerciseIndex];
        if (exercise && exercise.type === 'cardio') {
          newSet = { weight: '', reps: '', time: memory.time || '30:00', distance: memory.distance || '3.0', completed: false };
        } else {
          newSet = { weight: memory.weight || '', reps: memory.reps || '', completed: false };
        }
      }

      return {
        ...prev,
        sets: {
          ...prev.sets,
          [exerciseIndex]: [...currentSets, newSet]
        }
      };
    });
  }, [getExerciseMemory]);

  const updateSet = useCallback((exerciseIndex: any, setIndex: any, field: any, value: any) => {
    setActiveSession((prev: any) => {
      const updatedSets = [...(prev.sets[exerciseIndex] || [])];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      return {
        ...prev,
        sets: { ...prev.sets, [exerciseIndex]: updatedSets }
      };
    });
  }, []);

  const toggleSetComplete = useCallback((exerciseIndex: any, setIndex: any, exerciseName: any) => {
    setActiveSession((prev: any) => {
      const updatedSets = [...(prev.sets[exerciseIndex] || [])];
      const isNowComplete = !updatedSets[setIndex].completed;
      
      updatedSets[setIndex] = { 
        ...updatedSets[setIndex], 
        completed: isNowComplete
      };

      if (isNowComplete) {
        saveExerciseMemory(
          exerciseName, 
          updatedSets[setIndex].weight, 
          updatedSets[setIndex].reps
        );
      }

      return {
        ...prev,
        sets: { ...prev.sets, [exerciseIndex]: updatedSets }
      };
    });
  }, [saveExerciseMemory]);
  
  const removeSet = useCallback((exerciseIndex: any, setIndex: any) => {
    setActiveSession((prev: any) => {
      const updatedSets = [...(prev.sets[exerciseIndex] || [])];
      updatedSets.splice(setIndex, 1);
      return {
        ...prev,
        sets: { ...prev.sets, [exerciseIndex]: updatedSets }
      };
    });
  }, []);



  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {activeSession ? activeSession.routineName : "Today's Workout"}
          </h2>
          <p className="text-rose-600/80 font-medium text-sm mt-1">
            {activeSession ? "In Progress" : "Ready to crush it?"}
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-rose-600/10 flex items-center justify-center border border-rose-600/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]">
          <Calendar className="text-rose-600 h-6 w-6" />
        </div>
      </div>

      {!activeSession ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-6 py-12">
          <div className="h-24 w-24 rounded-full bg-[#111] border border-[#222] flex items-center justify-center">
            <Dumbbell className="h-10 w-10 text-gray-700" />
          </div>
          <p className="text-gray-500 text-center px-8">
            You don't have an active workout for today. Select a routine or start a free day to get started.
          </p>
          <div className="w-full space-y-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>START ROUTINE</span>
            </button>
            <button 
              onClick={startFreeWorkout}
              className="w-full bg-[#1a1a1a] hover:bg-[#222] active:scale-[0.98] transition-all text-gray-300 font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 border border-[#333]"
            >
              <Plus className="h-5 w-5" />
              <span>FREE WORKOUT</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                if(window.confirm('Are you sure you want to cancel? No data will be saved.')) {
                  setActiveSession(null);
                }
              }}
              className="flex-1 bg-black hover:bg-rose-950/20 active:scale-[0.98] transition-all text-rose-500 font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 border border-rose-500/20"
            >
              <X className="h-5 w-5" />
              <span>CANCEL</span>
            </button>
            <button 
              onClick={finishWorkout}
              className="flex-[2] bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>FINISH WORKOUT</span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-500 tracking-wider">EXERCISES</h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-500 transition-colors"
              >
                CHANGE ROUTINE
              </button>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search exercises..." 
                  className="w-full bg-black border border-[#222] rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-rose-600/50"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="flex-1 bg-black border border-[#222] rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-rose-600/50"
                >
                  <option value="All">All Muscles</option>
                  {(() => {
                    const unique = Array.from(new Set(activeSession.exercises.flatMap((e: any) => {
                      const libraryEx = allExercises.find((libEx: any) => libEx.name === e.exerciseName);
                      return libraryEx?.muscleGroup?.split(',').map((s: string) => s.trim()) || [];
                    }))).filter(Boolean) as string[];
                    const { grouped, uncategorized } = groupMusclesByCategory(unique);
                    return (
                      <>
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
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="flex-1 bg-black border border-[#222] rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-rose-600/50"
                >
                  <option value="All">All Modes</option>
                  {Array.from(new Set(activeSession.exercises.map((e: any) => {
                    const libraryEx = allExercises.find((libEx: any) => libEx.name === e.exerciseName);
                    return libraryEx?.equipment;
                  }))).filter(Boolean).sort().map(eq => (
                    <option key={eq as string} value={eq as string}>{eq as string}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-3">
              {activeSession.exercises.map((exercise: any, i: number) => i).filter((i: number) => {
                const ex = activeSession.exercises[i];
                const matchSearch = ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase());
                
                let matchMuscle = true;
                if (selectedMuscleGroup !== 'All') {
                  const libraryEx = allExercises.find((libEx: any) => libEx.name === ex.exerciseName);
                  const muscles = libraryEx?.muscleGroup ? libraryEx.muscleGroup.split(',').map((s: string) => s.trim()) : [];
                  matchMuscle = muscles.includes(selectedMuscleGroup);
                }
                
                let matchMode = true;
                if (selectedMode !== 'All') {
                  const libraryEx = allExercises.find((e: any) => e.name === ex.exerciseName);
                  if (libraryEx) {
                    matchMode = libraryEx.equipment === selectedMode;
                  } else {
                    matchMode = false;
                  }
                }
                
                return matchSearch && matchMuscle && matchMode;
              }).map((originalIndex: number) => {
                const exercise = activeSession.exercises[originalIndex];
                return (
                  <ActiveExerciseCard 
                    key={originalIndex}
                    exercise={exercise}
                    exerciseIndex={originalIndex}
                    sessionSets={activeSession.sets[originalIndex]}
                    onAddSet={addSet}
                    onUpdateSet={updateSet}
                    onToggleComplete={toggleSetComplete}
                    onRemoveSet={removeSet}
                    onSwap={handleOpenExerciseModal}
                  />
                );
              })}
              
            <div className="flex space-x-3">
              <button 
                onClick={() => handleOpenExerciseModal(null)}
                className="flex-1 py-4 rounded-xl border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>ADD EXERCISE</span>
              </button>
              <button 
                onClick={() => handleOpenExerciseModal(null, 'Cardio')}
                className="flex-1 py-4 rounded-xl border border-dashed border-emerald-900/30 text-emerald-600/70 font-bold hover:text-emerald-500 hover:border-emerald-700 transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>ADD CARDIO</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <RoutineSelectorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        routines={routines}
        onSelect={startRoutine}
        activeRoutineId={activeSession?.routineId}
      />

      <ExerciseSelectorModal
        isOpen={isExerciseModalOpen}
        onClose={() => {
          setIsExerciseModalOpen(false);
          setSwapExerciseIndex(null);
        }}
        onSelect={(exercise) => {
          addOrSwapCustomExercise(exercise);
        }}
        title={swapExerciseIndex !== null ? "SWAP EXERCISE" : "ADD EXERCISE"}
        isSwap={swapExerciseIndex !== null}
        targetSwapExercise={swapExerciseIndex !== null && activeSession ? activeSession.exercises[swapExerciseIndex] : null}
        initialMuscleGroup={modalInitialFilter}
        excludeExercises={activeSession?.exercises.map((e: any) => e.exerciseName) || []}
      />

      <CardioEntryModal
        isOpen={isCardioModalOpen}
        onClose={() => setIsCardioModalOpen(false)}
        onSave={handleSaveCardio}
      />
    </div>
  );
};
