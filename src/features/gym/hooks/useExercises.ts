import { usePersistentState } from '../../../hooks/usePersistentState';
import { exercises as defaultExercises } from '../data/exercises';

const STORAGE_KEY = 'pulse_app_exercises';

export const useExercises = () => {
  const [exercises, setExercises, isLoaded] = usePersistentState(STORAGE_KEY, defaultExercises);

  // Add a new exercise to the list
  const addExercise = (newExercise) => {
    const exercise = {
      ...newExercise,
      id: Date.now().toString(), // Generate a simple unique ID based on timestamp
    };
    setExercises(prev => [...prev, exercise]);
  };

  // Remove an exercise by its ID
  const removeExercise = (id) => {
    setExercises(prev => prev.filter(ex => String(ex.id) !== String(id)));
  };

  // Update an existing exercise
  const updateExercise = (id, updatedData) => {
    setExercises(prev => prev.map(ex => String(ex.id) === String(id) ? { ...ex, ...updatedData } : ex));
  };

  // Helper to filter by muscle group
  const getExercisesByMuscleGroup = (muscleGroup) => {
    return exercises.filter(ex => ex.muscleGroup.toLowerCase() === muscleGroup.toLowerCase());
  };

  // Helper to find a specific exercise
  const getExerciseById = (id) => {
    return exercises.find(ex => String(ex.id) === String(id));
  };

  return {
    exercises,
    isLoaded,
    addExercise,
    removeExercise,
    updateExercise,
    getExercisesByMuscleGroup,
    getExerciseById
  };
};
