import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queueMutation } from '../../../lib/offlineSync';
import { useAlert } from '../../../contexts/AlertContext';

export const useMacros = (todayDate) => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  const { data: macroGoals = { calories: 2800, protein: 180, carbs: 300, fats: 85 } } = useQuery({
    queryKey: ['macroGoals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('calories_goal, protein_goal, carbs_goal, fats_goal')
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw error;
      }
      
      if (data) {
        return {
          calories: data.calories_goal,
          protein: data.protein_goal,
          carbs: data.carbs_goal,
          fats: data.fats_goal
        };
      }
      return { calories: 2800, protein: 180, carbs: 300, fats: 85 };
    }
  });

  const { data: currentMacros = { calories: 0, protein: 0, carbs: 0, fats: 0 } } = useQuery({
    queryKey: ['dailyMacros', todayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_macros')
        .select('calories, protein, carbs, fats')
        .eq('date', todayDate)
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        throw error;
      }
      
      if (data) {
        return data;
      }
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
  });

  const { mutateAsync: saveMacroGoals } = useMutation({
    mutationFn: async (editGoals: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({
          calories_goal: editGoals.calories,
          protein_goal: editGoals.protein,
          carbs_goal: editGoals.carbs,
          fats_goal: editGoals.fats
        })
        .eq('user_id', user.id)
        .select();

      if (updateError) throw updateError;

      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            calories_goal: editGoals.calories,
            protein_goal: editGoals.protein,
            carbs_goal: editGoals.carbs,
            fats_goal: editGoals.fats
          }]);
          
        if (insertError) throw insertError;
      }
      return {
        calories: editGoals.calories,
        protein: editGoals.protein,
        carbs: editGoals.carbs,
        fats: editGoals.fats
      };
    },
    onMutate: async (editGoals: any) => {
      await queryClient.cancelQueries({ queryKey: ['macroGoals'] });
      const previousGoals = queryClient.getQueryData(['macroGoals']);
      queryClient.setQueryData(['macroGoals'], editGoals);
      return { previousGoals };
    },
    onError: (err: any, editGoals: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const payload = {
              user_id: user.id,
              calories_goal: editGoals.calories,
              protein_goal: editGoals.protein,
              carbs_goal: editGoals.carbs,
              fats_goal: editGoals.fats
            };
            queueMutation('upsert', 'user_settings', payload, { onConflict: 'user_id' });
          }
        });
      } else {
        alert('Error saving to database. Did you run the SQL script?');
        queryClient.setQueryData(['macroGoals'], context.previousGoals);
      }
    }
  });

  const { mutateAsync: logMeal } = useMutation({
    mutationFn: async (newMacros: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const payload = {
        user_id: user.id,
        date: todayDate,
        calories: newMacros.calories,
        protein: newMacros.protein,
        carbs: newMacros.carbs,
        fats: newMacros.fats
      };

      if (!navigator.onLine) throw new Error('NetworkError');

      const { error } = await supabase
        .from('daily_macros')
        .upsert(payload, { onConflict: 'user_id, date' });

      if (error) throw error;
      return payload;
    },
    onMutate: async (newMacros: any) => {
      await queryClient.cancelQueries({ queryKey: ['dailyMacros', todayDate] });
      const previousMacros = queryClient.getQueryData(['dailyMacros', todayDate]);
      queryClient.setQueryData(['dailyMacros', todayDate], newMacros);
      return { previousMacros };
    },
    onError: (err: any, newMacros: any, context: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const payload = {
              user_id: user.id,
              date: todayDate,
              calories: newMacros.calories,
              protein: newMacros.protein,
              carbs: newMacros.carbs,
              fats: newMacros.fats
            };
            queueMutation('upsert', 'daily_macros', payload, { onConflict: 'user_id, date' });
          }
        });
      } else {
        alert('Error saving to database. Did you run the SQL script?');
        queryClient.setQueryData(['dailyMacros', todayDate], context.previousMacros);
      }
    }
  });

  return { macroGoals, currentMacros, saveMacroGoals, logMeal };
};
