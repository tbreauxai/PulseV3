import React, { useState } from 'react';
import { Flame, Plus, Dumbbell, X, Search, ChevronDown, Trash2, Save, ArrowLeft, Edit2 } from 'lucide-react';
import { useRoutines } from '../../hooks/useRoutines';
import { useExercises } from '../../hooks/useExercises';

export const GymRoutine = () => {
  const { routines, addRoutine, updateRoutine, removeRoutine } = useRoutines();
  const { exercises: allExercises } = useExercises();

  const [isCreating, setIsCreating] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  
  // Builder state
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftExercises, setDraftExercises] = useState([]);
  
  // Modal state
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState('All');
  const [filterEquipment, setFilterEquipment] = useState('All');

  const muscleGroupOptions = ['All', ...Array.from(new Set(allExercises.map(ex => ex.muscleGroup))).sort()];
  const equipmentOptions = ['All', ...Array.from(new Set(allExercises.map(ex => ex.equipment))).sort()];

  const filteredExercises = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) || 
                          ex.muscleGroup.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
    const matchesMuscle = filterMuscleGroup === 'All' || ex.muscleGroup === filterMuscleGroup;
    const matchesEquipment = filterEquipment === 'All' || ex.equipment === filterEquipment;
    return matchesSearch && matchesMuscle && matchesEquipment;
  });

  const handleAddCustomExercise = (ex) => {
    setDraftExercises([...draftExercises, {
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: '3',
      reps: '10'
    }]);
    setIsExerciseModalOpen(false);
    setExerciseSearchTerm('');
  };

  const updateDraftExercise = (index, field, value) => {
    const updated = [...draftExercises];
    updated[index][field] = value;
    setDraftExercises(updated);
  };

  const removeDraftExercise = (index) => {
    const updated = [...draftExercises];
    updated.splice(index, 1);
    setDraftExercises(updated);
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutineId(routine.id);
    setDraftName(routine.name);
    setDraftDesc(routine.description || '');
    // Map exercises to have the required structure for the form
    setDraftExercises(routine.exercises.map(ex => {
      // Find original exercise info if needed (like muscleGroup)
      const originalEx = allExercises.find(e => e.name === ex.exerciseName);
      return {
        id: originalEx ? originalEx.id : Date.now(),
        name: ex.exerciseName,
        muscleGroup: originalEx ? originalEx.muscleGroup : 'Custom',
        sets: ex.sets || '3',
        reps: ex.reps || '10'
      };
    }));
    setIsCreating(true);
  };

  const handleSaveRoutine = async () => {
    if (!draftName.trim()) {
      alert("Please enter a routine name.");
      return;
    }
    
    try {
      const routinePayload = {
        name: draftName,
        description: draftDesc,
        exercises: draftExercises.map(ex => ({
          exerciseName: ex.name,
          sets: ex.sets,
          reps: ex.reps
        }))
      };

      if (editingRoutineId) {
        await updateRoutine(editingRoutineId, routinePayload);
      } else {
        await addRoutine(routinePayload);
      }

      setIsCreating(false);
      setEditingRoutineId(null);
      setDraftName('');
      setDraftDesc('');
      setDraftExercises([]);
    } catch (e) {
      alert("Error saving routine: " + e.message);
      console.error(e);
    }
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setEditingRoutineId(null);
    setDraftName('');
    setDraftDesc('');
    setDraftExercises([]);
  };

  const renderExerciseSelectorModal = () => (
    isExerciseModalOpen && (
      <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl flex flex-col shadow-2xl relative h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
          <div className="p-6 pb-4 shrink-0 border-b border-[#222]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-white tracking-wider">ADD EXERCISE</h3>
                <p className="text-xs text-gray-400 mt-1">Select an exercise for your routine.</p>
              </div>
              <button
                onClick={() => setIsExerciseModalOpen(false)}
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
                  onClick={() => handleAddCustomExercise(ex)}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl cursor-pointer hover:border-rose-600/50 transition-colors group"
                >
                  <div>
                    <h4 className="text-white font-medium text-sm group-hover:text-rose-500 transition-colors">{ex.name}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{ex.muscleGroup} • {ex.equipment}</p>
                  </div>
                  <Plus className="h-4 w-4 text-gray-600 group-hover:text-rose-500 transition-colors" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  );

  if (isCreating) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex items-center space-x-3">
          <button 
            onClick={cancelCreating}
            className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#222] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {editingRoutineId ? 'Edit Routine' : 'Create Routine'}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 tracking-wider">ROUTINE NAME</label>
            <input 
              type="text" 
              placeholder="e.g. Push Day Heavy"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-rose-600 transition-colors"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 tracking-wider">DESCRIPTION (OPTIONAL)</label>
            <input 
              type="text" 
              placeholder="e.g. Focus on upper chest and side delts"
              value={draftDesc}
              onChange={e => setDraftDesc(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-rose-600 transition-colors"
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">EXERCISES</h3>
          <div className="space-y-3">
            {draftExercises.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6 border border-dashed border-[#222] rounded-xl">
                No exercises added yet.
              </p>
            ) : (
              draftExercises.map((ex, i) => (
                <div key={i} className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{ex.name}</h4>
                        <p className="text-xs text-gray-500">{ex.muscleGroup}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeDraftExercise(i)}
                      className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors bg-[#111] rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">SETS</label>
                      <input 
                        type="number" 
                        value={ex.sets}
                        onChange={e => updateDraftExercise(i, 'sets', e.target.value)}
                        className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-rose-600"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">REPS</label>
                      <input 
                        type="text" 
                        value={ex.reps}
                        onChange={e => updateDraftExercise(i, 'reps', e.target.value)}
                        className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-rose-600"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <button 
              onClick={() => setIsExerciseModalOpen(true)}
              className="w-full py-4 rounded-xl border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>ADD EXERCISE</span>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSaveRoutine}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-6"
        >
          <Save className="h-5 w-5" />
          <span>{editingRoutineId ? 'UPDATE ROUTINE' : 'SAVE ROUTINE'}</span>
        </button>

        {renderExerciseSelectorModal()}
      </div>
    );
  }

  // Library View
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Routines</h2>
          <p className="text-rose-600/80 font-medium text-sm mt-1">{routines.length} saved workouts</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-rose-600/10 flex items-center justify-center border border-rose-600/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]">
          <Flame className="text-rose-600 h-6 w-6" />
        </div>
      </div>

      <button 
        onClick={() => {
          setEditingRoutineId(null);
          setDraftName('');
          setDraftDesc('');
          setDraftExercises([]);
          setIsCreating(true);
        }}
        className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
      >
        <Plus className="h-5 w-5 stroke-[3]" />
        <span>CREATE ROUTINE</span>
      </button>

      <div>
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">SAVED ROUTINES</h3>
        <div className="space-y-3">
          {routines.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No routines saved yet. Create one to get started!
            </p>
          ) : (
            routines.map(routine => (
              <div key={routine.id} className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-start justify-between group hover:border-[#333] transition-colors">
                <div>
                  <h4 className="text-white font-bold">{routine.name}</h4>
                  {routine.description && (
                    <p className="text-xs text-gray-500 mt-1">{routine.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#1a1a1a] rounded-md text-gray-400 tracking-wider">
                      {routine.exercises?.length || 0} EXERCISES
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditRoutine(routine)}
                    className="h-8 w-8 rounded-lg bg-[#111] flex items-center justify-center text-gray-600 hover:text-emerald-500 hover:bg-emerald-950/20 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Delete this routine?')) {
                        removeRoutine(routine.id);
                      }
                    }}
                    className="h-8 w-8 rounded-lg bg-[#111] flex items-center justify-center text-gray-600 hover:text-rose-500 hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
