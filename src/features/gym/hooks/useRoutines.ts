import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useAlert } from '../../../contexts/AlertContext';

export const useRoutines = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

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
    mutationFn: async (newRoutine: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { data, error } = await supabase.from('routines').insert([newRoutine]).select();
      if (error) throw error;
      return data[0];
    },
    onMutate: async (newRoutine: any) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      
      const tempId = `temp-${Date.now()}`;
      const optimisticRoutine = { ...newRoutine, id: tempId };
      
      queryClient.setQueryData(['routines'], (old: any = []) => [optimisticRoutine, ...old]);
      return { previousRoutines, tempId, newRoutine };
    },
    onError: (err: any, newRoutine: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('insert', 'routines', [newRoutine], null, context.tempId);
      } else {
        alert('Error saving routine. Reverting changes.');
        queryClient.setQueryData(['routines'], context.previousRoutines);
      }
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.setQueryData(['routines'], (old: any = []) => 
        old.map((r: any) => r.id === context.tempId ? data : r)
      );
    }
  });

  const { mutateAsync: updateRoutine } = useMutation({
    mutationFn: async ({ id, updatedData }: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { data, error } = await supabase.from('routines').update(updatedData).eq('id', id).select();
      if (error) throw error;
      return data[0];
    },
    onMutate: async ({ id, updatedData }: any) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      queryClient.setQueryData(['routines'], (old: any = []) => 
        (old as any[]).map((r: any) => String(r.id) === String(id) ? { ...r, ...updatedData } : r)
      );
      return { previousRoutines, id, updatedData };
    },
    onError: (err: any, { id, updatedData }: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('update', 'routines', updatedData, { id }, String(id).startsWith('temp-') ? id : null);
      } else {
        alert('Error updating routine. Reverting changes.');
        queryClient.setQueryData(['routines'], context.previousRoutines);
      }
    },
    onSuccess: (data: any, { id }: any) => {
      queryClient.setQueryData(['routines'], (old: any = []) => 
        (old as any[]).map((r: any) => String(r.id) === String(id) ? data : r)
      );
    }
  });

  const { mutateAsync: removeRoutine } = useMutation({
    mutationFn: async (id: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id: any) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData(['routines']);
      queryClient.setQueryData(['routines'], (old: any = []) => 
        old.filter((r: any) => String(r.id) !== String(id))
      );
      return { previousRoutines, id };
    },
    onError: (err: any, id: any, context: any) => {
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
    updateRoutine: (id, updatedData) => updateRoutine({ id, updatedData }),
    removeRoutine
  };
};
