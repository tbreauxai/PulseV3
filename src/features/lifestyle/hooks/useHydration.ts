import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useState } from 'react';

export const useHydration = (todayDate) => {
  const queryClient = useQueryClient();

  const { data: waterGoal = parseInt(localStorage.getItem('water_goal') || '8') } = useQuery({
    queryKey: ['waterGoal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('water_goal')
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== '42703' && error.code !== '42P01') {
        throw error;
      }
      
      const goal = data?.water_goal || parseInt(localStorage.getItem('water_goal') || '8');
      if (data?.water_goal) {
        localStorage.setItem('water_goal', data.water_goal.toString());
      }
      return goal;
    }
  });

  const { mutateAsync: saveWaterGoal } = useMutation({
    mutationFn: async (newGoal: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!navigator.onLine) throw new Error('NetworkError');

      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({ water_goal: newGoal })
        .eq('user_id', user.id)
        .select();

      if (updateError) throw updateError;

      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{ user_id: user.id, water_goal: newGoal }]);
          
        if (insertError) throw insertError;
      }
      return newGoal;
    },
    onMutate: async (newGoal: number) => {
      await queryClient.cancelQueries({ queryKey: ['waterGoal'] });
      const previousGoal = queryClient.getQueryData(['waterGoal']);
      queryClient.setQueryData(['waterGoal'], newGoal);
      localStorage.setItem('water_goal', newGoal.toString());
      return { previousGoal };
    },
    onError: (err: any, newGoal: number, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            queueMutation('upsert', 'user_settings', {
              user_id: user.id,
              water_goal: newGoal
            }, { onConflict: 'user_id' });
          }
        });
      } else {
        queryClient.setQueryData(['waterGoal'], context.previousGoal);
        localStorage.setItem('water_goal', (context.previousGoal || 8).toString());
      }
    }
  });

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
