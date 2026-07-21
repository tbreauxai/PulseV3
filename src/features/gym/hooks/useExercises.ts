import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { exercises as defaultExercises } from '../data/exercises';
import { get, set } from 'idb-keyval';
import { useAlert } from '../../../contexts/AlertContext';

const STORAGE_KEY = 'pulse_app_exercises';

export const useExercises = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return defaultExercises;

      const { data, error } = await supabase
        .from('user_exercises')
        .select('*');

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw error;
      }

      // Auto-restore missing custom exercises from routines if they were lost
      try {
        const { data: routinesData, error: routinesError } = await supabase.from('routines').select('exercises');
        if (routinesError) console.error("Routines query error:", routinesError);
        
        if (routinesData) {
          const uniqueMissingExercises = new Map();
          routinesData.forEach(r => {
            if (r.exercises && Array.isArray(r.exercises)) {
              r.exercises.forEach(ex => {
                const isCustom = !defaultExercises.some(d => d.name.toLowerCase() === ex.exerciseName.toLowerCase());
                const isSaved = data && data.some(d => d.name.toLowerCase() === ex.exerciseName.toLowerCase());
                if (ex.exerciseName && isCustom && !isSaved) {
                  uniqueMissingExercises.set(ex.exerciseName, {
                    user_id: user.id,
                    exercise_id: String(Date.now() + Math.random()),
                    name: ex.exerciseName,
                    type: ex.type || 'strength',
                    muscle_group: 'Restored',
                    movement_type: ex.movementType || 'Compound',
                    weight: '', reps: '', equipment: '', time: '', distance: ''
                  });
                }
              });
            }
          });
          
          if (uniqueMissingExercises.size > 0) {
            const payloads = Array.from(uniqueMissingExercises.values());
            await supabase.from('user_exercises').insert(payloads);
            if (data) {
              data.push(...payloads.map((p: any) => ({
                exercise_id: p.exercise_id, name: p.name, type: p.type, muscle_group: p.muscle_group, movement_type: p.movement_type, weight: p.weight, reps: p.reps, equipment: p.equipment, time: p.time, distance: p.distance
              })));
            }
          }
        }
      } catch (err) { 
        console.error("Error restoring missing exercises", err); 
      }

      // If we have exercises in Supabase, format and return them
      if (data && data.length > 0) {
        const formatted = data.map(ex => ({
          id: ex.exercise_id,
          name: ex.name,
          type: ex.type,
          movementType: ex.movement_type || 'Compound',
          muscleGroup: ex.muscle_group,
          weight: ex.weight,
          reps: ex.reps,
          equipment: ex.equipment,
          time: ex.time,
          distance: ex.distance
        }));
        await set(STORAGE_KEY, formatted);
        return formatted;
      }

      // If no exercises in Supabase, we migrate local ones or use defaults
      const localData = await get(STORAGE_KEY);
      const exercisesToMigrate = localData && localData.length > 0 ? localData : defaultExercises;
      
      // Attempt to migrate them to Supabase in the background
      if (navigator.onLine) {
        const payload = exercisesToMigrate.map((ex: any) => ({
          user_id: user.id,
          exercise_id: ex.id || String(Date.now() + Math.random()),
          name: ex.name,
          type: ex.type || 'strength',
          movement_type: ex.movementType || 'Compound',
          muscle_group: ex.muscleGroup,
          weight: ex.weight || '',
          reps: ex.reps || '',
          equipment: ex.equipment || '',
          time: ex.time || '',
          distance: ex.distance || ''
        }));
        
        // Fire and forget migration
        supabase.from('user_exercises').insert(payload).then(({ error }) => {
          if (!error) {
            set(STORAGE_KEY, exercisesToMigrate);
          }
        });
      }
      
      return exercisesToMigrate;
    }
  });

  const { mutateAsync: addExercise } = useMutation({
    mutationFn: async (newExercise: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const exerciseId = Date.now().toString();
      const payload = {
        user_id: user.id,
        exercise_id: exerciseId,
        name: newExercise.name,
        type: newExercise.type || 'strength',
        movement_type: newExercise.movementType || 'Compound',
        muscle_group: newExercise.muscleGroup || '',
        weight: newExercise.weight || '',
        reps: newExercise.reps || '',
        equipment: newExercise.equipment || '',
        time: newExercise.time || '',
        distance: newExercise.distance || ''
      };

      if (!navigator.onLine) throw new Error('NetworkError');

      const { error } = await supabase.from('user_exercises').insert([payload]);
      if (error) throw error;
      
      return { ...newExercise, id: exerciseId };
    },
    onMutate: async (newExercise: any) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const previousExercises = queryClient.getQueryData(['exercises']);
      
      const tempId = `temp-${Date.now()}`;
      const optimisticExercise = { ...newExercise, id: tempId };
      
      queryClient.setQueryData(['exercises'], (old: any = []) => [...old, optimisticExercise]);
      return { previousExercises, tempId, optimisticExercise };
    },
    onError: (err: any, newExercise: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const payload = {
              user_id: user.id,
              exercise_id: context.tempId,
              name: newExercise.name,
              type: newExercise.type || 'strength',
              movement_type: newExercise.movementType || 'Compound',
              muscle_group: newExercise.muscleGroup || '',
              weight: newExercise.weight || '',
              reps: newExercise.reps || '',
              equipment: newExercise.equipment || '',
              time: newExercise.time || '',
              distance: newExercise.distance || ''
            };
            queueMutation('insert', 'user_exercises', [payload], null, context.tempId);
          }
        });
      } else {
        alert('Error saving exercise. Reverting changes.');
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.setQueryData(['exercises'], (old: any = []) => 
        old.map((ex: any) => ex.id === context.tempId ? data : ex)
      );
    }
  });

  const { mutateAsync: updateExercise } = useMutation({
    mutationFn: async ({ id, updatedData, oldName }: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!navigator.onLine) throw new Error('NetworkError');

      const payload: any = {
        name: updatedData.name,
        type: updatedData.type,
        movement_type: updatedData.movementType,
        weight: updatedData.weight,
        reps: updatedData.reps,
        equipment: updatedData.equipment,
        time: updatedData.time,
        distance: updatedData.distance
      };
      if (updatedData.muscleGroup !== undefined) payload.muscle_group = updatedData.muscleGroup;

      const { error } = await supabase.from('user_exercises').update(payload).eq('exercise_id', id).eq('user_id', user.id);
      if (error) throw error;
      
      let cascadeOccurred = false;
      if (oldName && oldName !== updatedData.name) {
        const { data: routines } = await supabase.from('routines').select('*').eq('user_id', user.id);
        if (routines) {
          for (const routine of routines) {
            let modified = false;
            const updatedExercises = routine.exercises.map((ex: any) => {
              if (ex.exerciseName === oldName) {
                modified = true;
                return { ...ex, exerciseName: updatedData.name };
              }
              return ex;
            });
            if (modified) {
              await supabase.from('routines').update({ exercises: updatedExercises }).eq('id', routine.id);
              cascadeOccurred = true;
            }
          }
        }

        // Cascade to workout history
        const { data: history } = await supabase.from('workout_history').select('*').eq('user_id', user.id);
        if (history) {
          for (const workout of history) {
            let modified = false;
            const updatedDetails = workout.exercise_details.map((ex: any) => {
              if (ex.exerciseName === oldName) {
                modified = true;
                return { ...ex, exerciseName: updatedData.name, type: updatedData.type || ex.type };
              }
              return ex;
            });
            if (modified) {
              await supabase.from('workout_history').update({ exercise_details: updatedDetails }).eq('id', workout.id);
              cascadeOccurred = true;
            }
          }
        }
      }

      return { id, updatedData, cascadeOccurred };
    },
    onMutate: async ({ id, updatedData }: any) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const previousExercises = queryClient.getQueryData(['exercises']);
      
      queryClient.setQueryData(['exercises'], (old: any = []) => 
        old.map((ex: any) => String(ex.id) === String(id) ? { ...ex, ...updatedData } : ex)
      );
      return { previousExercises, id, updatedData };
    },
    onError: (err: any, { id, updatedData }: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        const payload: any = {
            name: updatedData.name,
            type: updatedData.type,
            movement_type: updatedData.movementType,
            weight: updatedData.weight,
            reps: updatedData.reps,
            equipment: updatedData.equipment,
            time: updatedData.time,
            distance: updatedData.distance
        };
        if (updatedData.muscleGroup !== undefined) payload.muscle_group = updatedData.muscleGroup;
        queueMutation('update', 'user_exercises', payload, { exercise_id: id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error updating exercise. Reverting changes.');
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
    },
    onSuccess: (data: any) => {
      if (data && data.cascadeOccurred) {
        queryClient.invalidateQueries({ queryKey: ['routines'] });
        queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      }
    }
  });

  const { mutateAsync: removeExercise } = useMutation({
    mutationFn: async (id: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!navigator.onLine) throw new Error('NetworkError');

      const { error } = await supabase.from('user_exercises').delete().eq('exercise_id', id).eq('user_id', user.id);
      if (error) throw error;
      
      return id;
    },
    onMutate: async (id: any) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const previousExercises = queryClient.getQueryData(['exercises']);
      
      queryClient.setQueryData(['exercises'], (old: any = []) => 
        old.filter((ex: any) => String(ex.id) !== String(id))
      );
      return { previousExercises, id };
    },
    onError: (err: any, id: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('delete', 'user_exercises', null, { exercise_id: id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error deleting exercise. Reverting changes.');
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
    }
  });

  const getExercisesByMuscleGroup = (muscleGroup: string) => {
    return exercises.filter((ex: any) => ex.muscleGroup?.toLowerCase() === muscleGroup.toLowerCase());
  };

  const getExerciseById = (id: string) => {
    return exercises.find((ex: any) => String(ex.id) === String(id));
  };

  return {
    exercises,
    isLoaded: !isLoading,
    addExercise,
    removeExercise,
    updateExercise: (id: any, updatedData: any) => {
      const previousExercises: any = queryClient.getQueryData(['exercises']) || [];
      const oldExercise = previousExercises.find((e: any) => String(e.id) === String(id));
      const oldName = oldExercise ? oldExercise.name : null;
      return updateExercise({ id, updatedData, oldName });
    },
    getExercisesByMuscleGroup,
    getExerciseById
  };
};
