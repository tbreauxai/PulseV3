import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Play, X, ChevronDown, ChevronRight, Dumbbell, Activity, CheckCircle2, Plus, Check, Trash2, Search, RefreshCw, ClipboardList, Timer, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useRoutines } from '../hooks/useRoutines';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useExercises } from '../hooks/useExercises';
import { useAlert } from '../../../contexts/AlertContext';
import { ActiveExerciseCard } from './ActiveExerciseCard';
import { RoutineSelectorModal } from './RoutineSelectorModal';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { CardioEntryModal } from './CardioEntryModal';
import { groupMusclesByCategory } from './MuscleGroupSelectorModal';
import { calculateProgression } from '../hooks/useProgressiveOverload';

export const GymToday = () => {
  const { routines } = useRoutines();
  const { addWorkout, appendWorkoutExercise, history } = useWorkoutHistory();
  const { exercises: allExercises, updateExercise } = useExercises();
  const { alert, confirm } = useAlert();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isCardioModalOpen, setIsCardioModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState(null); // Track which exercise is being swapped
  
  const [activeSession, setActiveSession] = useState(() => {
    const saved = localStorage.getItem('pulseV3-activeSession');
    if (saved) return JSON.parse(saved);
    return null;
  });

  const activeSessionRef = useRef(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const [restTimer, setRestTimer] = useState<{ endTime: number, mode: 'set' | 'exercise' } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const loadTimer = () => {
      const saved = localStorage.getItem('pulse_rest_timer');
      if (saved) setRestTimer(JSON.parse(saved));
    };
    loadTimer();
    window.addEventListener('pulse_timer_updated', loadTimer);
    return () => window.removeEventListener('pulse_timer_updated', loadTimer);
  }, []);

  useEffect(() => {
    if (!restTimer) {
      setTimeRemaining(null);
      return;
    }
    
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((restTimer.endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0 && restTimer.mode === 'exercise') {
        setRestTimer(null);
        localStorage.removeItem('pulse_rest_timer');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

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

  useEffect(() => {
    const handleUpdateLiveWorkout = (e: any) => {
      const newExNames: string[] = e.detail?.exercises;
      if (!newExNames || !Array.isArray(newExNames)) return;

      setActiveSession((prev: any) => {
        if (!prev) return prev;

        const newExercises: any[] = [];
        const newSets: any = {};
        const usedOldIndices = new Set<number>();

        newExNames.forEach((name, i) => {
           const oldIndex = prev.exercises.findIndex((ex: any, idx: number) => 
               !usedOldIndices.has(idx) && 
               (ex.exerciseName || ex.name)?.toLowerCase() === name.toLowerCase()
           );

           if (oldIndex !== -1) {
              usedOldIndices.add(oldIndex);
              newExercises.push(prev.exercises[oldIndex]);
              newSets[i] = prev.sets[oldIndex];
           } else {
              const dbEx = allExercises.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
              const type = dbEx ? (dbEx.type || 'strength') : 'strength';
              newExercises.push({
                 exerciseName: dbEx ? dbEx.name : name,
                 type,
                 sets: 3,
                 reps: '8-12',
                 time: '',
                 distance: ''
              });
              
              newSets[i] = Array.from({ length: 3 }).map(() => {
                 if (type === 'cardio') return { time: '', distance: '', calories: '', completed: false };
                 if (type === 'timed') return { time: '', completed: false };
                 return { weight: '', reps: '8-12', completed: false };
              });
           }
        });

        return {
           ...prev,
           exercises: newExercises,
           sets: newSets
        };
      });
    };

    window.addEventListener('pulse_update_active_workout', handleUpdateLiveWorkout);
    
    const handleForceReload = () => {
       const saved = localStorage.getItem('pulseV3-activeSession');
       if (saved) setActiveSession(JSON.parse(saved));
    };
    window.addEventListener('pulse_force_reload_active_workout', handleForceReload);

    return () => {
      window.removeEventListener('pulse_update_active_workout', handleUpdateLiveWorkout);
      window.removeEventListener('pulse_force_reload_active_workout', handleForceReload);
    };
  }, [allExercises]);

  const generateRoutineData = useCallback((routine: any) => {
    const initialSets: any = {};
    const rawExercises = routine?.exercises || [];
    
    const sortedExercises = [...rawExercises].sort((a: any, b: any) => {
      const globalExA = allExercises.find((g: any) => g.name === a.exerciseName);
      const globalExB = allExercises.find((g: any) => g.name === b.exerciseName);
      const isCompoundA = globalExA?.movementType === 'Compound' ? 1 : 0;
      const isCompoundB = globalExB?.movementType === 'Compound' ? 1 : 0;
      return isCompoundB - isCompoundA;
    });

    const exercises = sortedExercises.map((ex: any, idx: number) => {
      const globalEx = allExercises.find((g: any) => g.name === ex.exerciseName);
      const actualType = ex.type || globalEx?.type || 'strength';
      const numSets = parseInt(ex.sets, 10) || 1;
      
      if (actualType === 'cardio') {
        initialSets[idx] = Array.from({ length: numSets }).map(() => ({
          time: globalEx?.time || ex.time || '',
          calories: globalEx?.calories || ex.calories || '',
          distance: globalEx?.distance || ex.distance || '',
          completed: false
        }));
      } else if (actualType === 'timed') {
        initialSets[idx] = Array.from({ length: numSets }).map(() => ({
          time: globalEx?.time || ex.time || '60',
          completed: false
        }));
      } else {
        initialSets[idx] = Array.from({ length: numSets }).map(() => ({
          weight: globalEx?.weight || '',
          reps: globalEx?.reps || ex.reps || '',
          completed: false
        }));
      }

      return {
        ...ex,
        type: actualType,
        sourceRoutineName: routine?.name || 'Free Workout'
      };
    });

    return { exercises, sets: initialSets };
  }, [allExercises]);

  const startRoutine = useCallback((routineId: any) => {
    const routine = routines.find((r: any) => String(r.id) === String(routineId));
    const { exercises, sets } = generateRoutineData(routine);

    setActiveSession({
      routineId: routineId,
      routineName: routine ? routine.name : "Free Day",
      startTime: Date.now(),
      exercises,
      sets
    });
    setIsModalOpen(false);
  }, [routines, generateRoutineData]);

  const addRoutineToSession = useCallback((routineId: any) => {
    const routine = routines.find((r: any) => String(r.id) === String(routineId));
    if (!routine || !activeSession) return;
    
    const { exercises: newExercises, sets: newSets } = generateRoutineData(routine);
    
    setActiveSession((prev: any) => {
      const startIndex = prev.exercises.length;
      const shiftedSets: any = {};
      
      Object.keys(newSets).forEach((key) => {
        shiftedSets[startIndex + parseInt(key, 10)] = newSets[key];
      });

      return {
        ...prev,
        routineName: `${prev.routineName} + ${routine.name}`,
        exercises: [...prev.exercises, ...newExercises],
        sets: {
          ...prev.sets,
          ...shiftedSets
        }
      };
    });
    
    setIsModalOpen(false);
  }, [routines, activeSession, generateRoutineData]);

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
        newExercises[swapExerciseIndex] = {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          type: exercise.type,
          sets: '-',
          reps: '-'
        };
        const globalEx = allExercises.find((g: any) => g.name === exercise.name);
        if (exercise.type === 'timed') {
          newSets[swapExerciseIndex] = [{ time: globalEx?.time || '60', completed: false }];
        } else {
          newSets[swapExerciseIndex] = [{ weight: globalEx?.weight || '', reps: globalEx?.reps || '', completed: false }];
        }
      } else {
        newExercises.push({
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          type: exercise.type,
          sets: '-',
          reps: '-'
        });
        const globalEx = allExercises.find((g: any) => g.name === exercise.name);
        if (exercise.type === 'timed') {
          newSets[newExercises.length - 1] = [{ time: globalEx?.time || '60', completed: false }];
        } else {
          newSets[newExercises.length - 1] = [{ weight: globalEx?.weight || '', reps: globalEx?.reps || '', completed: false }];
        }
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

  const handleCompleteExercise = useCallback(async (exerciseIndex: number) => {
    const currentSession = activeSessionRef.current;
    if (!currentSession) return;
    const exercise = currentSession.exercises[exerciseIndex];
    const exerciseSets = currentSession.sets[exerciseIndex] || [];
    const validSets = exerciseSets.filter((s: any) => s.completed);

    if (validSets.length === 0) {
      alert("Please complete at least one set before completing the exercise.");
      return;
    }

    let volume = 0;
    let setsCount = 0;
    let maxWeight = 0;
    let maxReps = 0;

    validSets.forEach((set: any) => {
      setsCount++;
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      if (exercise.type !== 'cardio' && exercise.type !== 'timed') {
        volume += (weight * reps);
        if (weight > maxWeight) {
          maxWeight = weight;
          maxReps = reps;
        }
      }
    });

    if (exercise.type !== 'cardio' && exercise.type !== 'timed' && maxWeight > 0) {
      const memory = getExerciseMemory(exercise.exerciseName || exercise.name);
      if (maxWeight > parseFloat(memory.weight || 0) || (maxWeight === parseFloat(memory.weight || 0) && maxReps > parseInt(memory.reps || 0))) {
        saveExerciseMemory(exercise.exerciseName || exercise.name, maxWeight, maxReps);
      }
    }

    const globalEx = allExercises.find((g: any) => g.name === exercise.exerciseName || g.name === exercise.name);
    if (globalEx) {
      if (exercise.type === 'cardio') {
        const firstSet = validSets[0];
        if (firstSet && (firstSet.time !== globalEx.time || firstSet.distance !== globalEx.distance || firstSet.calories !== globalEx.calories)) {
          updateExercise(
            globalEx.id, 
            { ...globalEx, time: firstSet.time, distance: firstSet.distance, calories: firstSet.calories }
          ).catch(console.error);
        }
      } else if (exercise.type === 'timed') {
        const lastSet = validSets[validSets.length - 1];
        if (lastSet && lastSet.time && lastSet.time.toString() !== globalEx.time) {
          updateExercise(
            globalEx.id,
            { ...globalEx, time: lastSet.time.toString() }
          ).catch(console.error);
        }
      } else {
        const lastSet = validSets[validSets.length - 1];
        if (lastSet) {
          const lastWeight = parseFloat(lastSet.weight) || 0;
          const lastReps = parseInt(lastSet.reps) || 0;
          if (lastWeight > 0 && (lastWeight.toString() !== globalEx.weight || lastReps.toString() !== globalEx.reps)) {
            updateExercise(
              globalEx.id,
              { ...globalEx, weight: lastWeight.toString(), reps: lastReps.toString() }
            ).catch(console.error);
          }
        }
      }
    }

    const payload = {
      dateStr: new Date().toISOString().split('T')[0],
      routineName: currentSession.routineName || "Free Day",
      volume,
      setsCount,
      exerciseDetails: [{
        exerciseName: exercise.exerciseName || exercise.name,
        type: exercise.type || 'strength',
        sets: validSets
      }]
    };

    try {
      await appendWorkoutExercise(payload);
    } catch (e: any) {
      alert("Error saving exercise: " + e.message);
      return;
    }

    setActiveSession((prev: any) => {
      if (!prev) return null;
      const newExercises = [...prev.exercises];
      newExercises.splice(exerciseIndex, 1);
      
      const newSets: any = {};
      newExercises.forEach((_, idx) => {
        newSets[idx] = prev.sets[idx >= exerciseIndex ? idx + 1 : idx];
      });

      if (newExercises.length === 0) {
        return null; // Automatically clear session
      }

      return {
        ...prev,
        exercises: newExercises,
        sets: newSets
      };
    });
  }, [appendWorkoutExercise, getExerciseMemory, saveExerciseMemory]);

  const handleSkipExercise = useCallback((exerciseIndex: number) => {
    setActiveSession((prev: any) => {
      if (!prev) return null;
      const newExercises = [...prev.exercises];
      newExercises.splice(exerciseIndex, 1);
      
      const newSets: any = {};
      newExercises.forEach((_, idx) => {
        newSets[idx] = prev.sets[idx >= exerciseIndex ? idx + 1 : idx];
      });

      if (newExercises.length === 0) {
        return null; // Automatically clear session
      }

      return {
        ...prev,
        exercises: newExercises,
        sets: newSets
      };
    });
  }, []);

  const handleSpineSafeFilter = useCallback(() => {
    setActiveSession((prev: any) => {
      if (!prev) return null;
      
      const newExercises: any[] = [];
      const newSets: any = {};
      let removedCount = 0;
      
      prev.exercises.forEach((ex: any, idx: number) => {
        const libraryEx = allExercises.find((g: any) => g.name === ex.exerciseName || g.name === ex.name);
        const risk = libraryEx?.spinalRisk || 'Supported / Safe';
        
        if (risk === 'Supported / Safe') {
          newExercises.push(ex);
          newSets[newExercises.length - 1] = prev.sets[idx];
        } else {
          removedCount++;
        }
      });
      
      if (removedCount > 0) {
        alert(`Filtered out ${removedCount} spine risk exercises.`);
      } else {
        alert(`No spine risk exercises found in your routine.`);
      }
      
      if (newExercises.length === 0) return null; // Automatically clear session if empty
      
      return {
        ...prev,
        exercises: newExercises,
        sets: newSets
      };
    });
  }, [allExercises, alert]);

  const finishWorkout = useCallback(async () => {
    if (await confirm('Are you sure you want to finish and save this workout?')) {
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
            if (exercise.type !== 'cardio' && exercise.type !== 'timed') {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              totalVolume += (weight * reps);
            }
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
        } else if (exercise && exercise.type === 'timed') {
          newSet = { time: memory.time || '', completed: false };
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

        // Timer Logic
        const isLastSet = updatedSets.every((s: any) => s.completed);
        const ex = prev.exercises[exerciseIndex];
        const isCompound = ex?.movementType === 'Compound';
        let durationSec = isCompound ? 120 : 60;
        let mode: 'set' | 'exercise' = 'set';
        
        if (isLastSet) {
          durationSec = 60;
          mode = 'exercise';
        }
        
        const newTimer = { endTime: Date.now() + durationSec * 1000, mode };
        localStorage.setItem('pulse_rest_timer', JSON.stringify(newTimer));
        window.dispatchEvent(new Event('pulse_timer_updated'));
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {timeRemaining !== null && (
        <div className="fixed top-20 right-4 z-[100] bg-black/90 backdrop-blur border border-[#222] px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center space-x-3">
          <Timer className="h-5 w-5 text-rose-500" />
          <span className={`font-mono font-bold text-lg ${timeRemaining === 0 && restTimer?.mode === 'set' ? 'text-red-500 animate-[pulse_1s_ease-in-out_infinite]' : 'text-white'}`}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
          <button 
            onClick={() => { setRestTimer(null); localStorage.removeItem('pulse_rest_timer'); setTimeRemaining(null); }}
            className="ml-2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
        <div className="space-y-6 pb-20">
          <div className="sticky top-[calc(61px+env(safe-area-inset-top))] z-40 bg-black/95 backdrop-blur-md pb-4 pt-4 border-b border-[#222] shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
            <div className="flex space-x-2">
              <button 
                onClick={async () => {
                  if(await confirm('Are you sure you want to cancel? No data will be saved.')) {
                    setActiveSession(null);
                  }
                }}
                className="flex-[0.8] bg-rose-950/40 hover:bg-rose-900/50 active:scale-[0.98] transition-all text-rose-500 font-bold py-2 rounded-xl flex flex-col items-center justify-center space-y-1 border border-rose-900/50"
              >
                <X className="h-5 w-5" />
                <span className="text-[10px] tracking-wider">CANCEL</span>
              </button>
              <button 
                onClick={() => handleOpenExerciseModal(null)}
                className="flex-1 bg-gray-900/50 hover:bg-gray-800/80 active:scale-[0.98] transition-all text-gray-400 font-bold py-2 rounded-xl flex flex-col items-center justify-center space-y-1 border border-gray-800"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px] tracking-wider">EXERCISE</span>
              </button>
              <button 
                onClick={() => handleOpenExerciseModal(null, 'Cardio')}
                className="flex-1 bg-emerald-900/30 hover:bg-emerald-900/50 active:scale-[0.98] transition-all text-emerald-500 font-bold py-2 rounded-xl flex flex-col items-center justify-center space-y-1 border border-emerald-900/50"
              >
                <Activity className="h-5 w-5" />
                <span className="text-[10px] tracking-wider">CARDIO</span>
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex-1 bg-indigo-900/30 hover:bg-indigo-900/50 active:scale-[0.98] transition-all text-indigo-400 font-bold py-2 rounded-xl flex flex-col items-center justify-center space-y-1 border border-indigo-900/50"
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-[10px] tracking-wider">ROUTINE</span>
              </button>
            </div>
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
              <button 
                onClick={handleSpineSafeFilter}
                className="w-full bg-emerald-950/40 hover:bg-emerald-900/50 active:scale-[0.98] transition-all text-emerald-500 font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 border border-emerald-900/50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs tracking-wider">SPINE SAFE FILTER</span>
              </button>
              <div className="flex gap-2">
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="flex-1 min-w-0 bg-black border border-[#222] rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-rose-600/50"
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
                  className="flex-1 min-w-0 bg-black border border-[#222] rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-rose-600/50"
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
              }).map((originalIndex: number, filteredIndex: number, filteredArray: number[]) => {
                const baseExercise = activeSession.exercises[originalIndex];
                const prevExercise = filteredIndex > 0 ? activeSession.exercises[filteredArray[filteredIndex - 1]] : null;
                const showHeader = baseExercise.sourceRoutineName && 
                                   (!prevExercise || prevExercise.sourceRoutineName !== baseExercise.sourceRoutineName) && 
                                   baseExercise.sourceRoutineName !== 'Free Workout';

                const globalEx = allExercises.find((g: any) => g.name === baseExercise.exerciseName || g.name === baseExercise.name);
                const exerciseName = baseExercise.exerciseName || baseExercise.name;
                const progression = calculateProgression(exerciseName, history);
                const exercise = {
                  ...baseExercise,
                  muscleGroup: baseExercise.muscleGroup || globalEx?.muscleGroup || '',
                  equipment: baseExercise.equipment || globalEx?.equipment || ''
                };
                return (
                  <React.Fragment key={originalIndex}>
                    {showHeader && (
                      <div className="flex items-center space-x-3 mt-8 mb-4">
                        <div className="h-[2px] bg-[#222] flex-1 rounded-full"></div>
                        <h4 className="text-xs font-black text-gray-400 tracking-[0.2em] px-2">{baseExercise.sourceRoutineName.toUpperCase()}</h4>
                        <div className="h-[2px] bg-[#222] flex-1 rounded-full"></div>
                      </div>
                    )}
                    <ActiveExerciseCard 
                      exercise={exercise}
                      progression={progression}
                      exerciseIndex={originalIndex}
                      sessionSets={activeSession.sets[originalIndex]}
                      onAddSet={addSet}
                      onUpdateSet={updateSet}
                      onToggleComplete={toggleSetComplete}
                      onRemoveSet={removeSet}
                      onSwap={handleOpenExerciseModal}
                      onCompleteExercise={handleCompleteExercise}
                      onSkipExercise={handleSkipExercise}
                    />
                  </React.Fragment>
                );
              })}
            </div>
            
          </div>
        </div>
      )}

      <RoutineSelectorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        routines={routines}
        onSelect={activeSession ? addRoutineToSession : startRoutine}
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
