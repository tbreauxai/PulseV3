import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useExercises } from '../hooks/useExercises';
import { Plus, Search, Dumbbell, Activity, Trash2 } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useDebounce } from '../../../hooks/useDebounce';
import { motion, useAnimation } from 'framer-motion';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { groupMusclesByCategory } from './MuscleGroupSelectorModal';

const emptyFormState = { name: '', type: 'strength', muscleGroup: '', weight: '', reps: '', equipment: '', time: '', distance: '' };

const ExerciseRow = React.memo(({ ex, onOpenForm, onDelete }: any) => {
  const controls = useAnimation();
  
  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -60) {
      controls.start({ x: -80 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="pb-3 relative">
      <div className="absolute inset-0 pb-3 z-0">
        <div className="w-full h-full bg-red-900/20 border border-red-900/30 rounded-xl flex items-center justify-end px-6">
          <button onClick={() => onDelete(ex.id)} className="text-red-500 hover:text-red-400 p-2 active:scale-95 transition-transform">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <motion.div 
        drag="x"
        dragConstraints={{ right: 0, left: -80 }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={handleDragEnd}
        onClick={() => {
          controls.start({ x: 0 });
          onOpenForm(ex);
        }}
        className="relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-center justify-between p-4 cursor-pointer hover:border-rose-600/30 transition-colors z-10 touch-pan-y"
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
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 pr-2">{ex.muscleGroup} {ex.equipment ? `• ${ex.equipment}` : ''}</p>
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
          className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-rose-600 transition-colors group flex-shrink-0"
        >
          <Plus className="h-4 w-4 text-gray-400 group-hover:text-white" />
        </button>
      </motion.div>
    </div>
  );
});

export const GymExercises = () => {
  const { exercises, addExercise, updateExercise, removeExercise } = useExercises();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const filteredExercises = useMemo(() => {
    let result = exercises;

    if (debouncedSearchTerm.trim()) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter((ex: any) => 
        ex.name.toLowerCase().includes(lowerSearch) || 
        (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedMuscleGroup !== 'All') {
      result = result.filter((ex: any) => {
        const muscles = ex.muscleGroup ? ex.muscleGroup.split(',').map((s: string) => s.trim()) : [];
        return muscles.includes(selectedMuscleGroup);
      });
    }

    if (selectedMode !== 'All') {
      result = result.filter((ex: any) => ex.equipment === selectedMode);
    }

    return result;
  }, [exercises, debouncedSearchTerm, selectedMuscleGroup, selectedMode]);

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

  const handleSaveExercise = (updatedExercise: any) => {
    if (!updatedExercise.name.trim()) {
      return;
    }

    if (editingId === null) {
      addExercise(updatedExercise);
    } else {
      updateExercise(editingId, updatedExercise);
    }

    closeExerciseForm();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Library</h2>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            placeholder="Search exercises..." 
            className="w-full bg-black border border-[#222] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-rose-600/50 transition-colors placeholder:text-gray-600"
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
              const unique = Array.from(new Set(exercises.flatMap((e: any) => e.muscleGroup?.split(',').map((s: string) => s.trim()) || []))).filter(Boolean) as string[];
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
            {Array.from(new Set(exercises.map((e: any) => e.equipment).filter(Boolean))).sort().map((eq: any) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      <ExerciseEditorModal 
        isOpen={isFormOpen}
        onClose={closeExerciseForm}
        onSave={handleSaveExercise}
        onDelete={(id) => {
          removeExercise(id);
          closeExerciseForm();
        }}
        initialData={formState}
      />

      <div>
        <Virtuoso
          useWindowScroll
          data={filteredExercises}
          itemContent={(index, ex) => (
            <ExerciseRow ex={ex} onOpenForm={openExerciseForm} onDelete={removeExercise} />
          )}
        />
      </div>

      {createPortal(
        <div className="fixed bottom-24 right-6 z-50">
          <button 
            onClick={() => openExerciseForm()}
            className="bg-rose-600 text-white rounded-full p-5 shadow-[0_0_20px_rgba(225,29,72,0.6)] flex items-center justify-center hover:bg-rose-500 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="h-7 w-7 transition-transform duration-300" />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
