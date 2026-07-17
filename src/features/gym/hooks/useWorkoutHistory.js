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
    mutationFn: async (workout) => {
      const dbWorkout = {
        routine_name: workout.routineName,
        duration: workout.duration,
        completed_sets: workout.completedSets,
        total_volume: workout.totalVolume,
        exercise_details: workout.exerciseDetails,
      };

      if (!navigator.onLine) throw new Error('NetworkError');

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
    onMutate: async (workout) => {
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

      queryClient.setQueryData(['workoutHistory'], (old = []) => [optimisticWorkout, ...old]);
      return { previousHistory, tempId, workout };
    },
    onError: (err, workout, context) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        const dbWorkout = {
          routine_name: workout.routineName,
          duration: workout.duration,
          completed_sets: workout.completedSets,
          total_volume: workout.totalVolume,
          exercise_details: workout.exerciseDetails,
        };
        queueMutation('insert', 'workout_history', [dbWorkout], null, context.tempId);
      } else {
        alert('Error saving workout. Reverting changes.');
        queryClient.setQueryData(['workoutHistory'], context.previousHistory);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(['workoutHistory'], (old = []) => 
        old.map(w => w.id === context.tempId ? data : w)
      );
    }
  });

  const { mutateAsync: removeWorkout } = useMutation({
    mutationFn: async (id) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { error } = await supabase.from('workout_history').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['workoutHistory'] });
      const previousHistory = queryClient.getQueryData(['workoutHistory']);
      queryClient.setQueryData(['workoutHistory'], (old = []) => 
        old.filter(w => String(w.id) !== String(id))
      );
      return { previousHistory, id };
    },
    onError: (err, id, context) => {
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
