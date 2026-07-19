import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Dumbbell, TrendingUp, Calendar, Plus } from 'lucide-react';
import { GymRoutine } from './components/GymRoutine';
import { GymExercises } from './components/GymExercises';
import { GymProgress } from './components/GymProgress';
import { GymToday } from './components/GymToday';
import { ExerciseEditorModal } from './components/ExerciseEditorModal';
import { useExercises } from './hooks/useExercises';
import { motion, AnimatePresence } from 'framer-motion';

const emptyFormState = { name: '', type: 'strength', muscleGroup: '', weight: '', reps: '', equipment: '', time: '', distance: '' };

export const GymView = () => {
  const [gymTab, setGymTab] = useState('today');
  const { addExercise, updateExercise, removeExercise } = useExercises();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState(emptyFormState);

  const openExerciseForm = (exercise: any = emptyFormState) => {
    setFormState({ ...emptyFormState, ...exercise });
    setEditingId(exercise.id || null);
    setIsFormOpen(true);
  };

  const closeExerciseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormState(emptyFormState);
  };

  const handleSaveExercise = (updatedExercise: any) => {
    if (!updatedExercise.name.trim()) return;
    if (editingId === null) {
      addExercise(updatedExercise);
    } else {
      updateExercise(editingId, updatedExercise);
    }
    closeExerciseForm();
  };

  return (
    <div className="pb-24">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={gymTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {gymTab === 'today' && <GymToday />}
            {gymTab === 'routine' && <GymRoutine />}
            {gymTab === 'exercises' && <GymExercises onEditExercise={openExerciseForm} />}
            {gymTab === 'progress' && <GymProgress />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-gray-900 z-40">
        <div className="flex items-center justify-around px-6 pt-4 pb-safe-nav max-w-md mx-auto">
          <button
            onClick={() => setGymTab('today')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'today' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">TODAY</span>
          </button>
          <button
            onClick={() => setGymTab('routine')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'routine' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">ROUTINE</span>
          </button>
          <button
            onClick={() => setGymTab('exercises')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'exercises' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <Dumbbell className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">EXERCISES</span>
          </button>
          <button
            onClick={() => setGymTab('progress')}
            className={`flex flex-col items-center space-y-1 transition-colors ${gymTab === 'progress' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-400'}`}
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-[10px] font-bold tracking-wider">PROGRESS</span>
          </button>
        </div>
      </nav>

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
    </div>
  );
};
