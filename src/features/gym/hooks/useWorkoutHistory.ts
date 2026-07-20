import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useAlert } from '../../../contexts/AlertContext';

export const useWorkoutHistory = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['workoutHistory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        routineName: row.routine_name,
        date: row.created_at,
        duration: row.duration,
        completedSets: row.completed_sets,
        totalVolume: row.total_volume,
        exerciseDetails: row.exercise_details
      }));
    }
  });

  const { mutateAsync: addWorkout } = useMutation({
    mutationFn: async (newWorkout: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const dbWorkout = {
        user_id: user.id,
        routine_name: newWorkout.routineName,
        duration: newWorkout.duration,
        completed_sets: newWorkout.completedSets,
        total_volume: newWorkout.totalVolume,
        exercise_details: newWorkout.exerciseDetails
      };

      const { data, error } = await supabase
        .from('workout_history')
        .insert([dbWorkout])
        .select();

      if (error) throw error;
      
      return {
        id: data[0].id,
        routineName: data[0].routine_name,
        date: data[0].created_at,
        duration: data[0].duration,
        completedSets: data[0].completed_sets,
        totalVolume: data[0].total_volume,
        exerciseDetails: data[0].exercise_details
      };
    },
    onMutate: async (workout: any) => {
      await queryClient.cancelQueries({ queryKey: ['workoutHistory'] });
      const previousHistory = queryClient.getQueryData(['workoutHistory']);
      
      const tempId = `temp-${Date.now()}`;
      const optimisticWorkout = {
        id: tempId,
        routineName: workout.routineName,
        date: new Date().toISOString(),
        duration: workout.duration,
        completedSets: workout.completedSets,
        totalVolume: workout.totalVolume,
        exerciseDetails: workout.exerciseDetails
      };

      queryClient.setQueryData(['workoutHistory'], (old: any = []) => [optimisticWorkout, ...old]);
      return { previousHistory, tempId, workout };
    },
    onError: (err: any, newWorkout: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        const dbWorkout = {
          routine_name: newWorkout.routineName,
          duration: newWorkout.duration,
          completed_sets: newWorkout.completedSets,
          total_volume: newWorkout.totalVolume,
          exercise_details: newWorkout.exerciseDetails
        };
        queueMutation('insert', 'workout_history', [dbWorkout], null, context.tempId);
      } else {
        alert('Error saving workout. Reverting changes.');
        queryClient.setQueryData(['workoutHistory'], context.previousHistory);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.setQueryData(['workoutHistory'], (old: any = []) => 
        old.map((w: any) => w.id === context.tempId ? data : w)
      );
    }
  });

  const { mutateAsync: removeWorkout } = useMutation({
    mutationFn: async (id: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { error } = await supabase.from('workout_history').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id: any) => {
      await queryClient.cancelQueries({ queryKey: ['workoutHistory'] });
      const previousHistory = queryClient.getQueryData(['workoutHistory']);
      queryClient.setQueryData(['workoutHistory'], (old: any = []) => 
        old.filter((w: any) => String(w.id) !== String(id))
      );
      return { previousHistory, id };
    },
    onError: (err: any, id: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('delete', 'workout_history', null, { id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error deleting workout. Reverting changes.');
        queryClient.setQueryData(['workoutHistory'], context.previousHistory);
      }
    }
  });

  const clearHistory = async () => {
    // This was mostly a local operation for resetting state
    queryClient.setQueryData(['workoutHistory'], []);
  };

  const { mutateAsync: appendWorkoutExercise } = useMutation({
    mutationFn: async (payload: { dateStr: string, routineName: string, exerciseDetails: any[], volume: number, setsCount: number }) => {
      if (!navigator.onLine) throw new Error('NetworkError');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: existing } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const workout = existing[0];
        let currentDetails = workout.exercise_details || [];
        if (typeof currentDetails === 'string') {
           try { currentDetails = JSON.parse(currentDetails); } catch(e) { currentDetails = []; }
        }
        const updatedDetails = [...currentDetails, ...payload.exerciseDetails];

        const dbWorkout = {
          completed_sets: (workout.completed_sets || 0) + payload.setsCount,
          total_volume: (workout.total_volume || 0) + payload.volume,
          exercise_details: updatedDetails
        };

        const { data, error } = await supabase
          .from('workout_history')
          .update(dbWorkout)
          .eq('id', workout.id)
          .select();
        
        if (error) throw new Error("DB Update Error: " + error.message);
        if (!data || data.length === 0) throw new Error("Update silent failure: Data is empty, check RLS");
        
        return {
          id: data[0].id,
          routineName: data[0].routine_name,
          date: data[0].created_at,
          duration: data[0].duration,
          completedSets: data[0].completed_sets,
          totalVolume: data[0].total_volume,
          exerciseDetails: data[0].exercise_details,
          isUpdate: true
        };
      } else {
        const dbWorkout = {
          user_id: user.id,
          routine_name: payload.routineName,
          duration: 0,
          completed_sets: payload.setsCount,
          total_volume: payload.volume,
          exercise_details: payload.exerciseDetails
        };
        const { data, error } = await supabase
          .from('workout_history')
          .insert([dbWorkout])
          .select();
        
        if (error) throw new Error("DB Insert Error: " + error.message);
        if (!data || data.length === 0) throw new Error("Insert silent failure: Data is empty, check RLS");
        
        return {
          id: data[0].id,
          routineName: data[0].routine_name,
          date: data[0].created_at,
          duration: data[0].duration,
          completedSets: data[0].completed_sets,
          totalVolume: data[0].total_volume,
          exerciseDetails: data[0].exercise_details,
          isUpdate: false
        };
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['workoutHistory'] });
      const previousHistory = queryClient.getQueryData(['workoutHistory']);

      queryClient.setQueryData(['workoutHistory'], (old: any = []) => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Try to find today's workout
        const todayStr = payload.dateStr;
        const existingWorkoutIndex = old.findIndex((w: any) => {
           const d = new Date(w.date);
           return d >= startOfDay && d <= endOfDay;
        });

        if (existingWorkoutIndex !== -1) {
          // Optimistically update existing
          const w = old[existingWorkoutIndex];
          const newW = {
            ...w,
            completedSets: (w.completedSets || 0) + payload.setsCount,
            totalVolume: (w.totalVolume || 0) + payload.volume,
            exerciseDetails: [...(w.exerciseDetails || []), ...payload.exerciseDetails]
          };
          const newOld = [...old];
          newOld[existingWorkoutIndex] = newW;
          return newOld;
        } else {
          // Optimistically insert new
          const tempId = `temp-${Date.now()}`;
          const newW = {
            id: tempId,
            routineName: payload.routineName,
            date: new Date().toISOString(),
            duration: 0,
            completedSets: payload.setsCount,
            totalVolume: payload.volume,
            exerciseDetails: payload.exerciseDetails
          };
          return [newW, ...old];
        }
      });

      return { previousHistory };
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.setQueryData(['workoutHistory'], (old: any = []) => {
        // Only update if it's not a temp ID that got blown away by a refresh
        if (data.isUpdate) {
          return old.map((w: any) => w.id === data.id ? data : w);
        } else {
          // Replace temp with real
          const hasTemp = old.some((w: any) => String(w.id).startsWith('temp-'));
          if (hasTemp) {
             return old.map((w: any) => String(w.id).startsWith('temp-') ? data : w);
          } else {
             return [data, ...old];
          }
        }
      });
      // Force invalidate to ensure we have the real DB state
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    },
    onError: (err: any, variables: any, context: any) => {
      alert('Error saving exercise: ' + err.message);
      if (context?.previousHistory) {
         queryClient.setQueryData(['workoutHistory'], context.previousHistory);
      }
    }
  });

  const { mutateAsync: removeWorkoutExercise } = useMutation({
    mutationFn: async ({ workoutId, exerciseIndex }: { workoutId: string, exerciseIndex: number }) => {
      if (!navigator.onLine) throw new Error('NetworkError');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // 1. Fetch current workout
      const { data: existing, error: fetchErr } = await supabase
        .from('workout_history')
        .select('*')
        .eq('id', workoutId)
        .single();
      
      if (fetchErr) throw new Error("Could not fetch workout to delete exercise.");
      if (!existing) throw new Error("Workout not found.");

      let currentDetails = existing.exercise_details || [];
      if (typeof currentDetails === 'string') {
         try { currentDetails = JSON.parse(currentDetails); } catch(e) { currentDetails = []; }
      }

      if (exerciseIndex < 0 || exerciseIndex >= currentDetails.length) {
        throw new Error("Exercise index out of bounds.");
      }

      const exerciseToRemove = currentDetails[exerciseIndex];
      
      // Calculate volume and sets to subtract
      let volumeToSubtract = 0;
      let setsToSubtract = 0;
      if (exerciseToRemove && exerciseToRemove.sets) {
        exerciseToRemove.sets.forEach((set: any) => {
          if (set.completed) setsToSubtract++;
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          if (exerciseToRemove.type !== 'cardio' && exerciseToRemove.type !== 'timed') {
             volumeToSubtract += (weight * reps);
          }
        });
      }

      const newDetails = [...currentDetails];
      newDetails.splice(exerciseIndex, 1);

      if (newDetails.length === 0) {
        // Delete entire workout
        const { error: delErr } = await supabase
          .from('workout_history')
          .delete()
          .eq('id', workoutId);
        
        if (delErr) throw new Error("Error deleting empty workout.");
        return { workoutId, deletedCompletely: true };
      } else {
        // Update workout
        const newSets = Math.max(0, (existing.completed_sets || 0) - setsToSubtract);
        const newVol = Math.max(0, (existing.total_volume || 0) - volumeToSubtract);

        const { data, error: updErr } = await supabase
          .from('workout_history')
          .update({
            exercise_details: newDetails,
            completed_sets: newSets,
            total_volume: newVol
          })
          .eq('id', workoutId)
          .select();
        
        if (updErr) throw new Error("Error updating workout.");
        
        return {
          workoutId,
          deletedCompletely: false,
          updatedData: {
            id: data[0].id,
            routineName: data[0].routine_name,
            date: data[0].created_at,
            duration: data[0].duration,
            completedSets: data[0].completed_sets,
            totalVolume: data[0].total_volume,
            exerciseDetails: data[0].exercise_details
          }
        };
      }
    },
    onMutate: async ({ workoutId, exerciseIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['workoutHistory'] });
      const previousHistory = queryClient.getQueryData(['workoutHistory']);

      queryClient.setQueryData(['workoutHistory'], (old: any = []) => {
        return old.map((w: any) => {
          if (w.id === workoutId) {
            const newDetails = [...(w.exerciseDetails || [])];
            const exerciseToRemove = newDetails[exerciseIndex];
            
            let volSub = 0;
            let setsSub = 0;
            if (exerciseToRemove && exerciseToRemove.sets) {
              exerciseToRemove.sets.forEach((set: any) => {
                if (set.completed) setsSub++;
                const weight = parseFloat(set.weight) || 0;
                const reps = parseInt(set.reps) || 0;
                if (exerciseToRemove.type !== 'cardio' && exerciseToRemove.type !== 'timed') {
                  volSub += (weight * reps);
                }
              });
            }

            newDetails.splice(exerciseIndex, 1);
            return {
              ...w,
              completedSets: Math.max(0, (w.completedSets || 0) - setsSub),
              totalVolume: Math.max(0, (w.totalVolume || 0) - volSub),
              exerciseDetails: newDetails
            };
          }
          return w;
        }).filter((w: any) => w.exerciseDetails && w.exerciseDetails.length > 0);
      });

      return { previousHistory };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    },
    onError: (err: any, variables: any, context: any) => {
      alert('Error removing exercise: ' + err.message);
      if (context?.previousHistory) {
         queryClient.setQueryData(['workoutHistory'], context.previousHistory);
      }
    }
  });

  return { history, isLoading, addWorkout, removeWorkout, appendWorkoutExercise, removeWorkoutExercise, clearHistory };
};
