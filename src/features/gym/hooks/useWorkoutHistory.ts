import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';

export const useWorkoutHistory = () => {
  const queryClient = useQueryClient();

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

      const dbWorkout = {
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

  return { history, isLoading, addWorkout, removeWorkout, clearHistory };
};
