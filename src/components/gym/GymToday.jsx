import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Play, X, ChevronDown, ChevronRight, Dumbbell, CheckCircle2, Plus, Check, Trash2, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useExercises } from '../../hooks/useExercises';

const ActiveExerciseCard = ({ exercise, exerciseIndex, sessionSets, onAddSet, onUpdateSet, onToggleComplete, onRemoveSet, onSwap }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sets = sessionSets || [];

  // Swipe logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleStart = (clientX) => {
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    const deltaX = clientX - startX.current;
    if (deltaX < 0) { // Only swipe left
      setSwipeOffset(Math.max(deltaX, -100)); // Max drag visual 100px
    } else if (deltaX > 0 && swipeOffset < 0) {
      setSwipeOffset(Math.min(0, -80 + deltaX)); // Allow dragging back if open
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (swipeOffset < -40) {
      setSwipeOffset(-80); // Snap open to reveal Swap button
    } else {
      setSwipeOffset(0); // Snap closed
    }
  };

  const onTouchStart = e => handleStart(e.touches[0].clientX);
  const onTouchMove = e => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  const onMouseDown = e => handleStart(e.clientX);
  const onMouseMove = e => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { if(isDragging) handleEnd() };

  const handleHeaderClick = (e) => {
    if (Math.abs(swipeOffset) > 10) return; // Prevent click if we were swiping
    if (swipeOffset === -80) {
      setSwipeOffset(0); // Clicking while open closes it
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (!isExpanded) setIsExpanded(true);
    onAddSet(exerciseIndex, exercise.exerciseName || exercise.name);
  };

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Hidden Action Button */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end w-20 pr-4 bg-rose-600 rounded-xl">
        <button 
          onClick={() => {
            setSwipeOffset(0);
            onSwap(exerciseIndex);
          }} 
          className="text-white font-bold text-xs flex flex-col items-center hover:scale-110 transition-transform active:scale-95"
        >
          <RefreshCw className="h-5 w-5 mb-1" />
          SWAP
        </button>
      </div>

      {/* Main Card Content */}
      <div 
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden transition-transform ${isDragging ? 'duration-0' : 'duration-300'}`}
      >
        {/* Card Header (Swipeable and Clickable) */}
        <div 
          onClick={handleHeaderClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group select-none"
        >
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-rose-600/10 transition-colors shrink-0">
              <Dumbbell className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
            </div>
            <div>
              <h4 className="text-white font-medium line-clamp-1">{exercise.exerciseName || exercise.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Target: {exercise.sets || '-'} Sets • {exercise.reps || '-'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0 pl-2">
            <button 
              onClick={handleQuickAdd}
              className="h-8 w-8 rounded-full bg-rose-600/10 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-700" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-700 group-hover:text-rose-600 transition-colors" />
            )}
          </div>
        </div>

        {/* Expanded Sets List */}
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-[#1a1a1a] bg-black/20">
            {sets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No sets logged yet.
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                <div className="flex text-xs font-bold text-gray-600 px-2 pb-1">
                  <div className="w-10 text-center">SET</div>
                  <div className="flex-1 text-center">LBS</div>
                  <div className="flex-1 text-center">REPS</div>
                  <div className="w-20"></div>
                </div>
                
                {sets.map((set, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${set.completed ? 'bg-emerald-900/20 border border-emerald-900/30' : 'bg-gray-900'}`}
                  >
                    <div className="w-10 text-center font-bold text-gray-400 text-sm">
                      {idx + 1}
                    </div>
                    <input 
                      type="number" 
                      placeholder="--"
                      value={set.weight}
                      onChange={(e) => onUpdateSet(exerciseIndex, idx, 'weight', e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                    />
                    <input 
                      type="number" 
                      placeholder="--"
                      value={set.reps}
                      onChange={(e) => onUpdateSet(exerciseIndex, idx, 'reps', e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                    />
                    <div className="w-20 flex space-x-1 justify-end">
                      <button 
                        onClick={() => onRemoveSet(exerciseIndex, idx)}
                        className="w-9 h-9 rounded-md flex items-center justify-center bg-gray-800/80 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onToggleComplete(exerciseIndex, idx, exercise.exerciseName || exercise.name)}
                        className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                          set.completed 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={() => onAddSet(exerciseIndex, exercise.exerciseName || exercise.name)}
              className="w-full mt-4 py-3 rounded-lg border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SET</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const GymToday = () => {
  const { routines } = useRoutines();
  const { addWorkout } = useWorkoutHistory();
  const { exercises: allExercises } = useExercises();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState('All');
  const [filterEquipment, setFilterEquipment] = useState('All');
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

  const finishWorkout = () => {
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
        addWorkout({
          id: String(Date.now()),
          routineName: activeSession.routineName || "Free Day",
          date: new Date().toISOString(),
          duration: Date.now() - activeSession.startTime,
          completedSets: completedSetsCount,
          totalVolume: totalVolume,
          exerciseDetails: completedExercises
        });
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
      const { error } = await supabase
        .from('exercise_memory')
        .upsert({ 
          exercise_name: exerciseName, 
          weight: weight.toString(), 
          reps: reps.toString(),
          updated_at: new Date().toISOString()
        });
      if (error) console.error(error);
    } catch (e) {
      console.error(e);
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

  const filteredExercises = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) || 
                          ex.muscleGroup.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
    const matchesMuscle = filterMuscleGroup === 'All' || ex.muscleGroup === filterMuscleGroup;
    const matchesEquipment = filterEquipment === 'All' || ex.equipment === filterEquipment;
    return matchesSearch && matchesMuscle && matchesEquipment;
  });

  const muscleGroupOptions = ['All', ...Array.from(new Set(allExercises.map(ex => ex.muscleGroup))).sort()];
  const equipmentOptions = ['All', ...Array.from(new Set(allExercises.map(ex => ex.equipment))).sort()];

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

      {/* Routine Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-white tracking-wider">SELECT ROUTINE</h3>
                <p className="text-xs text-gray-400 mt-1">Choose a saved workout to begin.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {routines.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No routines found.</p>
              ) : (
                routines.map(routine => (
                  <div 
                    key={routine.id}
                    onClick={() => startRoutine(routine.id)}
                    className={`p-4 bg-[#0a0a0a] border ${activeSession?.routineId === routine.id ? 'border-rose-600' : 'border-[#1a1a1a]'} rounded-xl cursor-pointer hover:border-rose-600/50 transition-all active:scale-[0.98]`}
                  >
                    <h4 className="text-white font-bold">{routine.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{routine.description}</p>
                    <p className="text-xs text-rose-600/80 mt-2 font-medium">
                      {routine.exercises?.length || 0} exercises
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Selection Modal (Used for Adding OR Swapping) */}
      {isExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
            <div className="p-6 pb-4 shrink-0 border-b border-[#222]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white tracking-wider">
                    {swapExerciseIndex !== null ? "SWAP EXERCISE" : "ADD EXERCISE"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Select an exercise from your library.</p>
                </div>
                <button
                  onClick={() => {
                    setIsExerciseModalOpen(false);
                    setSwapExerciseIndex(null);
                  }}
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
                    {muscleGroupOptions.map(mg => <option key={mg} value={mg}>{mg === 'All' ? 'All Muscles' : mg}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={filterEquipment}
                    onChange={e => setFilterEquipment(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:border-rose-600 transition-all appearance-none"
                  >
                    {equipmentOptions.map(eq => <option key={eq} value={eq}>{eq === 'All' ? 'All Equipment' : eq}</option>)}
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
                filteredExercises.map(ex => (
                  <div 
                    key={ex.id}
                    onClick={() => addOrSwapCustomExercise(ex)}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl cursor-pointer hover:border-rose-600/50 transition-colors group"
                  >
                    <div>
                      <h4 className="text-white font-medium text-sm group-hover:text-rose-500 transition-colors">{ex.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{ex.muscleGroup} • {ex.equipment}</p>
                    </div>
                    {swapExerciseIndex !== null ? (
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
      )}
    </div>
  );
};
