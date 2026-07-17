import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { usePersistentState } from '../../../hooks/usePersistentState';

export const useWorkoutHistory = () => {
  const [history, setHistory] = usePersistentState('pulse_workout_history', []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(row => ({
        id: row.id,
        routineName: row.routine_name,
        date: row.created_at,
        duration: row.duration,
        completedSets: row.completed_sets,
        totalVolume: row.total_volume,
        exerciseDetails: row.exercise_details
      }));
      setHistory(mappedData);
    } catch (e) {
      console.error('Error fetching workout history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkout = async (workout) => {
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

    const previousHistory = [...history];
    setHistory(prev => [optimisticWorkout, ...prev]);

    try {
      const dbWorkout = {
        routine_name: workout.routineName,
        duration: workout.duration,
        completed_sets: workout.completedSets,
        total_volume: workout.totalVolume,
        exercise_details: workout.exerciseDetails,
      };

      if (!navigator.onLine) {
        queueMutation('insert', 'workout_history', [dbWorkout], null, tempId);
        return;
      }

      const { data, error } = await supabase
        .from('workout_history')
        .insert([dbWorkout])
        .select();

      if (error) throw error;
      if (data) {
        const mappedData = {
          id: data[0].id,
          routineName: data[0].routine_name,
          date: data[0].created_at,
          duration: data[0].duration,
          completedSets: data[0].completed_sets,
          totalVolume: data[0].total_volume,
          exerciseDetails: data[0].exercise_details
        };
        setHistory(prev => prev.map(w => w.id === tempId ? mappedData : w));
      }
    } catch (e) {
      console.error('Error adding workout:', e);
      if (e.message === 'Failed to fetch' || (e.message && e.message.includes('NetworkError'))) {
        queueMutation('insert', 'workout_history', [dbWorkout], null, tempId);
      } else {
        alert('Error saving workout. Reverting changes.');
        setHistory(previousHistory);
      }
    }
  };

  const removeWorkout = async (id) => {
    const previousHistory = [...history];
    setHistory(prev => prev.filter(w => w.id !== id));

    try {
      if (!navigator.onLine) {
        queueMutation('delete', 'workout_history', null, { id });
        return;
      }

      const { error } = await supabase
        .from('workout_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Error removing workout:', e);
      if (e.message === 'Failed to fetch' || (e.message && e.message.includes('NetworkError'))) {
        queueMutation('delete', 'workout_history', null, { id });
      } else {
        alert('Error deleting workout. Reverting changes.');
        setHistory(previousHistory);
      }
    }
  };

  const clearHistory = async () => {
    setHistory([]);
  };

  return { history, isLoading, addWorkout, removeWorkout, clearHistory };
};
