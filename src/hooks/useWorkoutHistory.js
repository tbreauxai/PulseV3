import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useWorkoutHistory = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const dbWorkout = {
        routine_name: workout.routineName,
        duration: workout.duration,
        completed_sets: workout.completedSets,
        total_volume: workout.totalVolume,
        exercise_details: workout.exerciseDetails,
      };

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
        setHistory(prev => [mappedData, ...prev]);
      }
    } catch (e) {
      console.error('Error adding workout:', e);
      throw e;
    }
  };

  const removeWorkout = async (id) => {
    try {
      const { error } = await supabase
        .from('workout_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHistory(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      console.error('Error removing workout:', e);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
  };

  return { history, isLoading, addWorkout, removeWorkout, clearHistory };
};
