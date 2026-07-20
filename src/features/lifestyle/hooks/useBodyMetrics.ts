import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAlert } from '../../../contexts/AlertContext';

export interface BodyMetrics {
  age: number | null;
  height_cm: number | null;
  gender: string | null;
  activity_level: string | null;
}

export const useBodyMetrics = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  const { data: metrics = { age: null, height_cm: null, gender: null, activity_level: null }, isLoading } = useQuery({
    queryKey: ['bodyMetrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('age, height_cm, gender, activity_level')
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw error;
      }
      
      if (data) {
        return {
          age: data.age,
          height_cm: data.height_cm,
          gender: data.gender,
          activity_level: data.activity_level
        };
      }
      return { age: null, height_cm: null, gender: null, activity_level: null };
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  const { mutateAsync: saveMetrics } = useMutation({
    mutationFn: async (newMetrics: BodyMetrics) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const payload = {
        user_id: user.id,
        ...newMetrics
      };

      if (!navigator.onLine) throw new Error('NetworkError');

      const { error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      return newMetrics;
    },
    onMutate: async (newMetrics) => {
      await queryClient.cancelQueries({ queryKey: ['bodyMetrics'] });
      const previousMetrics = queryClient.getQueryData(['bodyMetrics']);
      queryClient.setQueryData(['bodyMetrics'], newMetrics);
      return { previousMetrics };
    },
    onError: (err, newMetrics, context: any) => {
      queryClient.setQueryData(['bodyMetrics'], context?.previousMetrics);
      alert('error', 'Failed to save body metrics');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMetrics'] });
    }
  });

  return { metrics, saveMetrics, isLoading };
};
