import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useAlert } from '../../../contexts/AlertContext';

export const useWeighIns = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['weighIns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weigh_ins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        date: row.date,
        weight: `${row.weight_lbs} lbs`,
        diff: row.diff_str
      }));
    }
  });

  const { mutateAsync: addWeighIn } = useMutation({
    mutationFn: async ({ dbEntry, existingLogId }: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');

      if (existingLogId) {
        const { data, error } = await supabase
          .from('weigh_ins')
          .update(dbEntry)
          .eq('id', existingLogId)
          .select();
        if (error) throw error;
        return { data: data[0], isUpdate: true };
      } else {
        const { data, error } = await supabase
          .from('weigh_ins')
          .insert([dbEntry])
          .select();
        if (error) throw error;
        return { data: data[0], isUpdate: false };
      }
    },
    onMutate: async ({ newLogEntry, isUpdate, existingLogIndex }: any) => {
      await queryClient.cancelQueries({ queryKey: ['weighIns'] });
      const previousLogs = queryClient.getQueryData(['weighIns']);
      
      queryClient.setQueryData(['weighIns'], (old: any = []) => {
        if (isUpdate) {
          return old.map((log, i) => i === existingLogIndex ? newLogEntry : log);
        } else {
          return [newLogEntry, ...old];
        }
      });
      return { previousLogs, newLogEntry, isUpdate, existingLogIndex };
    },
    onError: (err: any, { dbEntry, isUpdate, existingLogId }: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        if (isUpdate) {
          queueMutation('update', 'weigh_ins', dbEntry, { id: existingLogId }, String(existingLogId).startsWith('temp-') ? existingLogId : null);
        } else {
          queueMutation('insert', 'weigh_ins', [dbEntry], null, context.newLogEntry.id);
        }
      } else {
        alert('Error logging weight. Reverting changes.');
        queryClient.setQueryData(['weighIns'], context.previousLogs);
      }
    },
    onSuccess: (result: any, variables: any, context: any) => {
      if (!result.isUpdate) {
        // Swap temp ID with real ID
        queryClient.setQueryData(['weighIns'], (old: any = []) => 
          old.map((log: any) => log.id === context.newLogEntry.id ? { ...log, id: result.data.id } : log)
        );
      }
    }
  });

  const { mutateAsync: updateWeighIn } = useMutation({
    mutationFn: async ({ updates, id, nextLogUpdates, nextLogId }: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');
      
      await supabase.from('weigh_ins').update(updates).eq('id', id);
      
      if (nextLogUpdates && nextLogId) {
        await supabase.from('weigh_ins').update(nextLogUpdates).eq('id', nextLogId);
      }
      return { id };
    },
    onMutate: async ({ updatedLogs }: any) => {
      await queryClient.cancelQueries({ queryKey: ['weighIns'] });
      const previousLogs = queryClient.getQueryData(['weighIns']);
      queryClient.setQueryData(['weighIns'], updatedLogs);
      return { previousLogs };
    },
    onError: (err: any, { updates, id, nextLogUpdates, nextLogId }: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('update', 'weigh_ins', updates, { id }, String(id).startsWith('temp-') ? id : null);
        if (nextLogUpdates && nextLogId) {
          queueMutation('update', 'weigh_ins', nextLogUpdates, { id: nextLogId }, String(nextLogId).startsWith('temp-') ? nextLogId : null);
        }
      } else {
        alert('Error updating log. Reverting changes.');
        queryClient.setQueryData(['weighIns'], context.previousLogs);
      }
    }
  });

  const { mutateAsync: removeWeighIn } = useMutation({
    mutationFn: async ({ id, nextLogUpdates, nextLogId }: any) => {
      if (!navigator.onLine) throw new Error('NetworkError');

      await supabase.from('weigh_ins').delete().eq('id', id);
      
      if (nextLogUpdates && nextLogId) {
        await supabase.from('weigh_ins').update(nextLogUpdates).eq('id', nextLogId);
      }
      return { id };
    },
    onMutate: async ({ updatedLogs }: any) => {
      await queryClient.cancelQueries({ queryKey: ['weighIns'] });
      const previousLogs = queryClient.getQueryData(['weighIns']);
      queryClient.setQueryData(['weighIns'], updatedLogs);
      return { previousLogs };
    },
    onError: (err: any, { id, nextLogUpdates, nextLogId }: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        queueMutation('delete', 'weigh_ins', null, { id }, String(id).startsWith('temp-') ? id : null);
        if (nextLogUpdates && nextLogId) {
          queueMutation('update', 'weigh_ins', nextLogUpdates, { id: nextLogId }, String(nextLogId).startsWith('temp-') ? nextLogId : null);
        }
      } else {
        alert('Error deleting log. Reverting changes.');
        queryClient.setQueryData(['weighIns'], context.previousLogs);
      }
    }
  });

  return { logs, isLoading, addWeighIn, updateWeighIn, removeWeighIn };
};
