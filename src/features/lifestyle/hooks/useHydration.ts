import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useState } from 'react';

export const useHydration = (todayDate) => {
  const queryClient = useQueryClient();

  const [waterGoal, setWaterGoal] = useState(() => {
    return parseInt(localStorage.getItem('water_goal') || '8');
  });

  const saveWaterGoal = (newGoal: number) => {
    setWaterGoal(newGoal);
    localStorage.setItem('water_goal', newGoal.toString());
  };

  const { data: water = 0, isLoading } = useQuery({
    queryKey: ['hydration', todayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('date', todayDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data ? data.water_glasses : 0;
    }
  });

  const { mutateAsync: logWater } = useMutation({
    mutationFn: async (newWater: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!navigator.onLine) throw new Error('NetworkError');

      const { error } = await supabase
        .from('hydration_logs')
        .upsert({ 
          user_id: user.id,
          date: todayDate, 
          water_glasses: newWater 
        }, { onConflict: 'user_id, date' });

      if (error) throw error;
      return newWater;
    },
    onMutate: async (newWater: any) => {
      await queryClient.cancelQueries({ queryKey: ['hydration', todayDate] });
      const previousWater = queryClient.getQueryData(['hydration', todayDate]);
      queryClient.setQueryData(['hydration', todayDate], newWater);
      return { previousWater };
    },
    onError: (err: any, newWater: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            queueMutation('upsert', 'hydration_logs', {
              user_id: user.id,
              date: todayDate,
              water_glasses: newWater
            }, { onConflict: 'user_id, date' });
          }
        });
      } else {
        queryClient.setQueryData(['hydration', todayDate], context.previousWater);
      }
    }
  });

  return { water, isLoading, logWater, waterGoal, saveWaterGoal };
};
