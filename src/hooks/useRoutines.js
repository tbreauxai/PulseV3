import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRoutines = () => {
  const [routines, setRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const { data, error } = await supabase
        .from('routines')
        .insert([routine])
        .select();

      if (error) throw error;
      if (data) {
        setRoutines(prev => [data[0], ...prev]);
      }
    } catch (error) {
      console.error('Error adding routine:', error);
      throw error;
    }
  };

  const updateRoutine = async (id, updatedRoutine) => {
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
    }
  };

  const removeRoutine = async (id) => {
    try {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRoutines(prev => prev.filter(r => String(r.id) !== String(id)));
    } catch (error) {
      console.error('Error removing routine:', error);
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
