import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePersistentState } from './usePersistentState';

export const useRoutines = () => {
  const [routines, setRoutines] = usePersistentState('pulse_routines', []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutines(data || []);
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRoutine = async (routine) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticRoutine = { ...routine, id: tempId };
    
    // --- OPTIMISTIC UPDATE ---
    const previousRoutines = [...routines];
    setRoutines(prev => [optimisticRoutine, ...prev]);

    try {
      const { data, error } = await supabase
        .from('routines')
        .insert([routine])
        .select();

      if (error) throw error;
      if (data) {
        // Swap temp ID for real ID silently
        setRoutines(prev => prev.map(r => r.id === tempId ? data[0] : r));
      }
    } catch (error) {
      console.error('Error adding routine:', error);
      alert('Error saving routine. Reverting changes.');
      setRoutines(previousRoutines);
    }
  };

  const updateRoutine = async (id, updatedRoutine) => {
    // --- OPTIMISTIC UPDATE ---
    const previousRoutines = [...routines];
    setRoutines(prev => prev.map(r => String(r.id) === String(id) ? { ...r, ...updatedRoutine } : r));

    try {
      const { data, error } = await supabase
        .from('routines')
        .update(updatedRoutine)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setRoutines(prev => prev.map(r => String(r.id) === String(id) ? data[0] : r));
      }
    } catch (error) {
      console.error('Error updating routine:', error);
      alert('Error updating routine. Reverting changes.');
      setRoutines(previousRoutines);
    }
  };

  const removeRoutine = async (id) => {
    // --- OPTIMISTIC UPDATE ---
    const previousRoutines = [...routines];
    setRoutines(prev => prev.filter(r => String(r.id) !== String(id)));

    try {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing routine:', error);
      alert('Error deleting routine. Reverting changes.');
      setRoutines(previousRoutines);
    }
  };

  return {
    routines,
    isLoading,
    addRoutine,
    updateRoutine,
    removeRoutine
  };
};
