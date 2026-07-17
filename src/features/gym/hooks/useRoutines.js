import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';

export const useRoutines = () => {
  const queryClient = useQueryClient();

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { mutateAsync: addRoutine } = useMutation({
    mutationFn: async (routine) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { data, error } = await supabase.from('routines').insert([routine]).select();
      if (error) throw error;
      return data[0];
    },
    onMutate: async (newRoutine) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      
      const tempId = `temp-${Date.now()}`;
      const optimisticRoutine = { ...newRoutine, id: tempId };
      
      queryClient.setQueryData(['routines'], (old = []) => [optimisticRoutine, ...old]);
      return { previousRoutines, tempId, newRoutine };
    },
    onError: (err, newRoutine, context) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('insert', 'routines', [newRoutine], null, context.tempId);
      } else {
        alert('Error saving routine. Reverting changes.');
        queryClient.setQueryData(['routines'], context.previousRoutines);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(['routines'], (old = []) => 
        old.map(r => r.id === context.tempId ? data : r)
      );
    }
  });

  const { mutateAsync: updateRoutineMutation } = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { data, error } = await supabase.from('routines').update(updatedData).eq('id', id).select();
      if (error) throw error;
      return data[0];
    },
    onMutate: async ({ id, updatedData }) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      queryClient.setQueryData(['routines'], (old = []) => 
        old.map(r => String(r.id) === String(id) ? { ...r, ...updatedData } : r)
      );
      return { previousRoutines, id, updatedData };
    },
    onError: (err, { id, updatedData }, context) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('update', 'routines', updatedData, { id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error updating routine. Reverting changes.');
        queryClient.setQueryData(['routines'], context.previousRoutines);
      }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(['routines'], (old = []) => 
        old.map(r => String(r.id) === String(id) ? data : r)
      );
    }
  });

  const { mutateAsync: removeRoutine } = useMutation({
    mutationFn: async (id) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      queryClient.setQueryData(['routines'], (old = []) => 
        old.filter(r => String(r.id) !== String(id))
      );
      return { previousRoutines, id };
    },
    onError: (err, id, context) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('delete', 'routines', null, { id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error deleting routine. Reverting changes.');
        queryClient.setQueryData(['routines'], context.previousRoutines);
      }
    }
  });

  return {
    routines,
    isLoading,
    addRoutine,
    updateRoutine: (id, updatedData) => updateRoutineMutation({ id, updatedData }),
    removeRoutine
  };
};
