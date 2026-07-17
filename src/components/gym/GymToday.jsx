import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Play, X, ChevronDown, ChevronRight, Dumbbell, Activity, CheckCircle2, Plus, Check, Trash2, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { queueMutation } from '../../lib/offlineSync';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useExercises } from '../../hooks/useExercises';
import { ActiveExerciseCard } from './components/ActiveExerciseCard';
import { RoutineSelectorModal } from './components/RoutineSelectorModal';
import { ExerciseSelectorModal } from '../ui/ExerciseSelectorModal';

export const GymToday = () => {
  const { routines } = useRoutines();
  const { addWorkout } = useWorkoutHistory();
  const { exercises: allExercises } = useExercises();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState(null); // Track which exercise is being swapped
  
  const [activeSession, setActiveSession] = useState(() => {
    const saved = localStorage.getItem('pulseV3-activeSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('pulseV3-activeSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('pulseV3-activeSession');
    }
  }, [activeSession]);

  const startRoutine = (routineId) => {
    const routine = routines.find(r => String(r.id) === String(routineId));
    setActiveSession({
      routineId: routineId,
      routineName: routine ? routine.name : "Free Day",
      startTime: Date.now(),
      exercises: routine && routine.exercises ? [...routine.exercises] : [],
      sets: {} // Maps exerciseIndex -> array of set objects
    });
    setIsModalOpen(false);
  };

  const startFreeWorkout = () => {
    setActiveSession({
      routineId: 'free',
      routineName: "Free Day",
      startTime: Date.now(),
      exercises: [],
      sets: {}
    });
  };

  const handleOpenExerciseModal = (swapIndex = null) => {
    setSwapExerciseIndex(swapIndex);
    setIsExerciseModalOpen(true);
  };

  const addOrSwapCustomExercise = (exercise) => {
    setActiveSession(prev => {
      const newExercises = [...prev.exercises];
      const newSets = { ...prev.sets };

      if (swapExerciseIndex !== null) {
        // Swapping an existing exercise
        newExercises[swapExerciseIndex] = {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: '-',
          reps: '-'
        };
        newSets[swapExerciseIndex] = []; // Clear out sets for the new exercise
      } else {
        // Appending a new exercise
        newExercises.push({
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
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
    setExerciseSearchTerm('');
  };

  const finishWorkout = async () => {
    if (window.confirm('Are you sure you want to finish and save this workout?')) {
      let totalVolume = 0;
      let completedSetsCount = 0;
      const completedExercises = [];

      activeSession.exercises.forEach((exercise, i) => {
        const exerciseSets = activeSession.sets[i] || [];
        const validSets = exerciseSets.filter(s => s.completed);
        
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
            id: String(Date.now()),
            routineName: activeSession.routineName || "Free Day",
            date: new Date().toISOString(),
            duration: Date.now() - activeSession.startTime,
            completedSets: completedSetsCount,
            totalVolume: totalVolume,
            exerciseDetails: completedExercises
          });
        } catch (e) {
          alert("Error saving workout: " + e.message);
          return;
        }
      }

      setActiveSession(null);
    }
  };

  const [exerciseMemoryCache, setExerciseMemoryCache] = useState({});

  useEffect(() => {
    const fetchMemory = async () => {
      const { data, error } = await supabase.from('exercise_memory').select('*');
      if (data) {
        const cache = {};
        data.forEach(item => {
          cache[item.exercise_name] = { weight: item.weight, reps: item.reps };
        });
        setExerciseMemoryCache(cache);
      }
    };
    fetchMemory();
  }, []);

  const getExerciseMemory = (exerciseName) => {
    return exerciseMemoryCache[exerciseName] || { weight: '', reps: '' };
  };

  const saveExerciseMemory = async (exerciseName, weight, reps) => {
    setExerciseMemoryCache(prev => ({
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
    } catch (e) {
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
  };

  const addSet = (exerciseIndex, exerciseName) => {
    setActiveSession(prev => {
      const currentSets = prev.sets[exerciseIndex] || [];
      const lastSet = currentSets[currentSets.length - 1];
      
      let newSet;
      if (lastSet) {
        newSet = { weight: lastSet.weight, reps: lastSet.reps, completed: false };
      } else {
        const memory = getExerciseMemory(exerciseName);
        newSet = { weight: memory.weight, reps: memory.reps, completed: false };
      }

      return {
        ...prev,
        sets: {
          ...prev.sets,
          [exerciseIndex]: [...currentSets, newSet]
        }
      };
    });
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setActiveSession(prev => {
      const updatedSets = [...(prev.sets[exerciseIndex] || [])];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      return {
        ...prev,
        sets: { ...prev.sets, [exerciseIndex]: updatedSets }
      };
    });
  };

  const toggleSetComplete = (exerciseIndex, setIndex, exerciseName) => {
    setActiveSession(prev => {
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
  };
  
  const removeSet = (exerciseIndex, setIndex) => {
    setActiveSession(prev => {
      const updatedSets = [...(prev.sets[exerciseIndex] || [])];
      updatedSets.splice(setIndex, 1);
      return {
        ...prev,
        sets: { ...prev.sets, [exerciseIndex]: updatedSets }
      };
    });
  };



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
            
            <div className="space-y-3">
              {activeSession.exercises.map((exercise, i) => (
                <ActiveExerciseCard 
                  key={i}
                  exercise={exercise}
                  exerciseIndex={i}
                  sessionSets={activeSession.sets[i]}
                  onAddSet={addSet}
                  onUpdateSet={updateSet}
                  onToggleComplete={toggleSetComplete}
                  onRemoveSet={removeSet}
                  onSwap={handleOpenExerciseModal}
                />
              ))}
              
              <button 
                onClick={() => handleOpenExerciseModal(null)}
                className="w-full py-4 rounded-xl border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>ADD EXERCISE</span>
              </button>
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
        onSelect={addOrSwapCustomExercise}
        title={swapExerciseIndex !== null ? "SWAP EXERCISE" : "ADD EXERCISE"}
        isSwap={swapExerciseIndex !== null}
      />
    </div>
  );
};
