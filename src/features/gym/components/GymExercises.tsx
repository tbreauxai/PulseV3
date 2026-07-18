import React, { useState, useCallback, useMemo } from 'react';
import { useExercises } from '../hooks/useExercises';
import { Plus, Search, Dumbbell, Activity } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useDebounce } from '../../../hooks/useDebounce';

const emptyFormState = { name: '', type: 'strength', muscleGroup: '', weight: '', reps: '', equipment: '', time: '', distance: '' };

const ExerciseRow = React.memo(({ ex, onOpenForm }: any) => {
  return (
    <div className="pb-3">
      <div 
        onClick={() => onOpenForm(ex)}
        className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-center justify-between cursor-pointer hover:border-rose-600/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center space-x-4">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${ex.type === 'cardio' ? 'bg-emerald-900' : 'bg-gray-900'}`}>
            {ex.type === 'cardio' ? (
              <Activity className="h-5 w-5 text-emerald-500/80" />
            ) : (
              <Dumbbell className="h-5 w-5 text-rose-600/80" />
            )}
          </div>
          <div>
            <h4 className="text-white font-medium">{ex.name}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{ex.muscleGroup} {ex.equipment ? `• ${ex.equipment}` : ''}</p>
            {ex.type === 'cardio' ? (
              (ex.time || ex.distance) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {ex.time ? `${ex.time} ` : ''}{ex.distance ? `• ${ex.distance}` : ''}
                </p>
              )
            ) : (
              (ex.weight || ex.reps) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {ex.weight ? `${ex.weight} ` : ''}{ex.reps ? `• ${ex.reps} reps` : ''}
                </p>
              )
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenForm(ex);
          }}
          className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-rose-600 transition-colors group"
        >
          <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
});

export const GymExercises = () => {
  const { exercises, addExercise, updateExercise } = useExercises();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const filteredExercises = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return exercises;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return exercises.filter((ex: any) => 
      ex.name.toLowerCase().includes(lowerSearch) || 
      (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(lowerSearch))
    );
  }, [exercises, debouncedSearchTerm]);

  const openExerciseForm = useCallback((exercise: any = emptyFormState) => {
    setFormState({ ...emptyFormState, ...exercise });
    setEditingId(exercise.id || null);
    setIsFormOpen(true);
  }, []);

  const closeExerciseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormState(emptyFormState);
  };

  const handleSaveExercise = () => {
    if (!formState.name.trim()) {
      return;
    }

    if (editingId === null) {
      addExercise(formState);
    } else {
      updateExercise(editingId, formState);
    }

    closeExerciseForm();
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState((current) => ({ ...current, [field]: event.target.value }));
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
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder="Search exercises..." 
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-rose-600/50 transition-colors placeholder:text-gray-600"
        />
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-black text-white tracking-wider">{editingId === null ? 'ADD EXERCISE' : 'EDIT EXERCISE'}</h3>
                <p className="text-xs text-gray-400 mt-1">Update the details below.</p>
              </div>
              <button
                onClick={closeExerciseForm}
                className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-400 rotate-45" />
              </button>
            </div>

            <div className="grid gap-4 mt-4">
              <label className="space-y-2 text-sm font-bold text-gray-300">
                NAME
                <input
                  value={formState.name || ''}
                  onChange={handleChange('name')}
                  placeholder="Exercise name"
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                />
              </label>
              
              <label className="space-y-2 text-sm font-bold text-gray-300">
                MUSCLE GROUP
                <select
                  value={formState.muscleGroup || ''}
                  onChange={handleChange('muscleGroup')}
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                >
                  <option value="" disabled className="text-gray-500">Select muscle group...</option>
                  <option value="Chest">Chest</option>
                  <option value="Back">Back</option>
                  <option value="Legs">Legs</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Arms">Arms</option>
                  <option value="Core">Core</option>
                  <option value="Full Body">Full Body</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-bold text-gray-300">
                WEIGHT
                <input
                  value={formState.weight || ''}
                  onChange={handleChange('weight')}
                  placeholder="225 lbs"
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                />
              </label>
              
              <label className="space-y-2 text-sm font-bold text-gray-300">
                REPS
                <input
                  value={formState.reps || ''}
                  onChange={handleChange('reps')}
                  placeholder="8-12"
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                />
              </label>

              <label className="space-y-2 text-sm font-bold text-gray-300">
                MODE (EQUIPMENT)
                <select
                  value={formState.equipment || ''}
                  onChange={handleChange('equipment')}
                  className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
                >
                  <option value="" disabled className="text-gray-500">Select mode...</option>
                  <option value="Barbell">Barbell</option>
                  <option value="Dumbbell">Dumbbell</option>
                  <option value="Machine">Machine</option>
                  <option value="Cable">Cable</option>
                  <option value="Bodyweight">Bodyweight</option>
                </select>
              </label>
            </div>

            <button
              onClick={handleSaveExercise}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-white font-black tracking-widest py-4 rounded-2xl mt-4"
            >
              {editingId === null ? 'ADD EXERCISE' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      )}

      <div>
        <Virtuoso
          useWindowScroll
          data={filteredExercises}
          itemContent={(index, ex) => (
            <ExerciseRow ex={ex} onOpenForm={openExerciseForm} />
          )}
        />
      </div>
    </div>
  );
};
