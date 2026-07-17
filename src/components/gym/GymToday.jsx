import React, { useState, useEffect } from 'react';
import { Calendar, Play, X, ChevronDown, ChevronRight, Dumbbell, CheckCircle2, Plus, Check, Trash2, Search } from 'lucide-react';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useExercises } from '../../hooks/useExercises';

const ActiveExerciseCard = ({ exercise, exerciseIndex, sessionSets, onAddSet, onUpdateSet, onToggleComplete, onRemoveSet }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sets = sessionSets || [];

  const handleQuickAdd = (e) => {
    e.stopPropagation(); // Prevent card from toggling expand if it was collapsed
    if (!isExpanded) setIsExpanded(true);
    onAddSet(exerciseIndex, exercise.exerciseName || exercise.name);
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden transition-all duration-300">
      {/* Card Header (Click to Expand) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-rose-600/10 transition-colors">
            <Dumbbell className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
          </div>
          <div>
            <h4 className="text-white font-medium">{exercise.exerciseName || exercise.name}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Target: {exercise.sets || '-'} Sets • {exercise.reps || '-'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
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
  );
};

export const GymToday = () => {
  const { routines } = useRoutines();
  const { addWorkout } = useWorkoutHistory();
  const { exercises: allExercises } = useExercises();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  
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

  const addCustomExercise = (exercise) => {
    setActiveSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: '-',
        reps: '-'
      }]
    }));
    setIsExerciseModalOpen(false);
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

  // Helper to read/write exercise history
  const getExerciseMemory = (exerciseName) => {
    try {
      const memory = JSON.parse(localStorage.getItem('pulseV3-exerciseMemory') || '{}');
      return memory[exerciseName] || { weight: '', reps: '' };
    } catch {
      return { weight: '', reps: '' };
    }
  };

  const saveExerciseMemory = (exerciseName, weight, reps) => {
    try {
      const memory = JSON.parse(localStorage.getItem('pulseV3-exerciseMemory') || '{}');
      memory[exerciseName] = { weight, reps };
      localStorage.setItem('pulseV3-exerciseMemory', JSON.stringify(memory));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Set Tracking Logic ---
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

  const filteredExercises = allExercises.filter(ex => 
    ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) || 
    ex.muscleGroup.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
  );

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
                />
              ))}
              
              <button 
                onClick={() => setIsExerciseModalOpen(true)}
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

      {/* Exercise Selection Modal */}
      {isExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
            <div className="p-6 pb-4 shrink-0 border-b border-[#222]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white tracking-wider">ADD EXERCISE</h3>
                  <p className="text-xs text-gray-400 mt-1">Select an exercise to add to your workout.</p>
                </div>
                <button
                  onClick={() => setIsExerciseModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={exerciseSearchTerm}
                  onChange={(e) => setExerciseSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No exercises found matching "{exerciseSearchTerm}"
                </div>
              ) : (
                filteredExercises.map(ex => (
                  <div 
                    key={ex.id}
                    onClick={() => addCustomExercise(ex)}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl cursor-pointer hover:border-rose-600/50 transition-colors group"
                  >
                    <div>
                      <h4 className="text-white font-medium text-sm group-hover:text-rose-500 transition-colors">{ex.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{ex.muscleGroup}</p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-600 group-hover:text-rose-500 transition-colors" />
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
