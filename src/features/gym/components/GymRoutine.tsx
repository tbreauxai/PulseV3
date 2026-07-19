import React, { useState } from 'react';
import { Flame, Plus, Dumbbell, Activity, X, Search, ChevronDown, Trash2, Save, ArrowLeft, Edit2 } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { useExercises } from '../hooks/useExercises';
import { useAlert } from '../../../contexts/AlertContext';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { ExerciseEditorModal } from './ExerciseEditorModal';

export const GymRoutine = () => {
  const { routines, addRoutine, updateRoutine, removeRoutine } = useRoutines();
  const { exercises: allExercises, updateExercise } = useExercises();
  const { alert, confirm } = useAlert();

  const [isCreating, setIsCreating] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  
  // Builder state
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftExercises, setDraftExercises] = useState([]);
  
  // Modal state
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  const handleAddCustomExercise = (ex) => {
    setDraftExercises([...draftExercises, {
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      type: ex.type || 'strength',
      sets: ex.type === 'cardio' ? '1' : '3',
      reps: ex.type === 'cardio' || ex.type === 'timed' ? '-' : '10',
      time: ex.time || (ex.type === 'cardio' ? '30:00' : (ex.type === 'timed' ? '60' : '')),
      distance: ex.distance || (ex.type === 'cardio' ? '3.0' : '')
    }]);
    setIsExerciseModalOpen(false);
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

  const handleOpenExerciseEditor = (ex) => {
    const originalEx = allExercises.find((e: any) => e.name === ex.name);
    if (originalEx) {
      setEditingExercise(originalEx);
    } else {
      // Fallback if somehow missing
      setEditingExercise({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        type: ex.type,
        equipment: 'Barbell' // default fallback
      });
    }
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
        type: originalEx ? (originalEx.type || 'strength') : 'strength',
        sets: ex.sets || (originalEx?.type === 'cardio' ? '1' : '3'),
        reps: ex.reps || (originalEx?.type === 'cardio' ? '-' : '10'),
        time: ex.time || '',
        distance: ex.distance || ''
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
        exercises: draftExercises.map((ex: any) => ({
          exerciseName: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          time: ex.time,
          distance: ex.distance
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
    <ExerciseSelectorModal
      isOpen={isExerciseModalOpen}
      onClose={() => setIsExerciseModalOpen(false)}
      onSelect={handleAddCustomExercise}
      title="ADD EXERCISE"
      excludeExercises={draftExercises.map((e: any) => e.name)}
    />
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
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${ex.type === 'cardio' ? 'bg-emerald-900/50' : 'bg-gray-900'}`}>
                        {ex.type === 'cardio' ? (
                          <Activity className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{ex.name}</h4>
                        <p className="text-xs text-gray-500">{ex.muscleGroup}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleOpenExerciseEditor(ex)}
                        className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors bg-[#111] rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => removeDraftExercise(i)}
                        className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors bg-[#111] rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {ex.type === 'cardio' ? (
                      <>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">TIME (MIN)</label>
                          <input 
                            type="number" 
                            value={ex.time || ''}
                            onChange={e => updateDraftExercise(i, 'time', e.target.value)}
                            className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">CALORIES</label>
                          <input 
                            type="number" 
                            value={ex.calories || ''}
                            onChange={e => updateDraftExercise(i, 'calories', e.target.value)}
                            className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">DIST (MI)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={ex.distance || ''}
                            onChange={e => updateDraftExercise(i, 'distance', e.target.value)}
                            className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </>
                    ) : ex.type === 'timed' ? (
                      <>
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
                          <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">DURATION (SEC)</label>
                          <input 
                            type="text" 
                            value={ex.time || ''}
                            onChange={e => updateDraftExercise(i, 'time', e.target.value)}
                            className="w-full bg-black border border-[#222] rounded-lg py-2 text-center text-white font-bold text-sm focus:outline-none focus:border-rose-600"
                          />
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
        <ExerciseEditorModal
          isOpen={!!editingExercise}
          onClose={() => setEditingExercise(null)}
          initialData={editingExercise}
          onSave={(updatedEx) => {
            updateExercise(editingExercise.id, updatedEx);
            
            setDraftExercises(prev => prev.map((ex: any) => {
              if (ex.name === editingExercise.name) {
                return {
                  ...ex,
                  name: updatedEx.name,
                  muscleGroup: updatedEx.muscleGroup,
                  type: updatedEx.type
                };
              }
              return ex;
            }));
            
            setEditingExercise(null);
          }}
        />
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
              <div 
                key={routine.id} 
                onClick={() => handleEditRoutine(routine)}
                className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-start justify-between group hover:border-[#333] transition-colors cursor-pointer active:scale-[0.98]"
              >
                <div>
                  <h4 className="text-white font-bold group-hover:text-rose-500 transition-colors">{routine.name}</h4>
                  {routine.description && (
                    <p className="text-xs text-gray-500 mt-1">{routine.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#1a1a1a] rounded-md text-gray-400 tracking-wider">
                      {routine.exercises?.length || 0} EXERCISES
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2 shrink-0">
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirm('Delete this routine?')) {
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
