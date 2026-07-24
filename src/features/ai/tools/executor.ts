import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { semanticCache } from '../../../lib/semanticCache';

export const executeToolLogic = async (
  toolName: string, 
  args: any, 
  goalText: string, 
  queryClient: QueryClient
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required for tool calls.");
  
  const todayDate = new Date().toISOString().split('T')[0];

  // WRITE TOOLS
  if (toolName === 'create_routine') {
    if (!args.name || typeof args.name !== 'string' || args.name.trim().length === 0) return 'ERROR: Routine name cannot be empty.';
    if (!args.exercises || !Array.isArray(args.exercises) || args.exercises.length === 0) return 'ERROR: Routine must contain at least one exercise.';
    if (args.exercises.length > 50) return 'ERROR: Too many exercises in routine (max 50).';

    const routineId = Date.now().toString();
    const routineDate = args.date ? new Date(args.date).toISOString() : new Date().toISOString();
    const payload = {
      user_id: user.id,
      routine_id: routineId,
      name: args.name,
      exercises: args.exercises,
      created_at: routineDate,
      updated_at: routineDate
    };
    await supabase.from('routines').insert([payload]);
    await queryClient.invalidateQueries({ queryKey: ['routines'] });
    return `SUCCESS: Created Routine ${args.name}`;
  }
  
  if (toolName === 'create_exercise') {
    if (!args.name || typeof args.name !== 'string' || args.name.trim().length === 0) return 'ERROR: Exercise name cannot be empty.';
    if (args.name.length > 100) return 'ERROR: Exercise name is too long.';
    if (!args.muscleGroup || typeof args.muscleGroup !== 'string' || args.muscleGroup.trim().length === 0) return 'ERROR: Muscle group is required.';

    const exerciseId = Date.now().toString();
    const payload = {
      user_id: user.id,
      exercise_id: exerciseId,
      name: args.name,
      type: args.type || 'strength',
      muscle_group: args.muscleGroup || '',
      equipment: args.equipment || ''
    };
    await supabase.from('user_exercises').insert([payload]);
    await queryClient.invalidateQueries({ queryKey: ['exercises'] });
    return `SUCCESS: Created Exercise ${args.name}`;
  }
  
  if (toolName === 'update_macros') {
    if (args.calories < 500 || args.calories > 10000) return 'ERROR: Calories must be between 500 and 10000.';
    if (args.protein < 0 || args.protein > 500) return 'ERROR: Protein must be realistic (0-500g).';
    if (args.carbs < 0 || args.carbs > 1500) return 'ERROR: Carbs must be realistic (0-1500g).';
    if (args.fats < 0 || args.fats > 500) return 'ERROR: Fats must be realistic (0-500g).';

    const payload = {
      calories_goal: args.calories,
      protein_goal: args.protein,
      carbs_goal: args.carbs,
      fats_goal: args.fats
    };
    
    const { data } = await supabase.from('user_settings').update(payload).eq('user_id', user.id).select();
    if (!data || data.length === 0) {
       await supabase.from('user_settings').insert([{ user_id: user.id, ...payload }]);
    }
    await queryClient.invalidateQueries({ queryKey: ['macroGoals'] });
    return `SUCCESS: Updated Macros to ${args.calories}kcal`;
  }

  if (toolName === 'modify_saved_routine') {
    const routineName = args.routine_name;
    const newExNames = args.exercises;
    
    if (!routineName || !Array.isArray(newExNames)) {
       return "ERROR: Missing routine_name or exercises array.";
    }

    const routines: any[] = queryClient.getQueryData(['routines']) || [];
    const routine = routines.find(r => r.name.toLowerCase() === routineName.toLowerCase());
    
    if (!routine) return `ERROR: Routine '${routineName}' not found in saved routines.`;
    
    const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
    
    const newExercisesPayload = newExNames.map(exName => {
       const existing = routine.exercises?.find((e: any) => 
         (e.exerciseName || e.name || e.exercise?.name)?.toLowerCase() === exName.toLowerCase()
       );
       if (existing) return existing;
       
       const dbEx = allExercises.find(a => a.name.toLowerCase() === exName.toLowerCase());
       return {
          exerciseName: dbEx ? dbEx.name : exName,
          sets: 3,
          reps: '8-12',
          time: '',
          distance: '',
          type: dbEx ? (dbEx.type || 'strength') : 'strength'
       };
    });

    const { error } = await supabase.from('routines').update({ exercises: newExercisesPayload }).eq('id', routine.id);
    if (error) return `ERROR: ${error.message}`;
    
    await queryClient.invalidateQueries({ queryKey: ['routines'] });
    return `SUCCESS: Modified saved routine '${routine.name}'. New exercise order has been saved permanently to the database.`;
  }

  if (toolName === 'update_active_workout') {
    const newExNames = args.exercises;
    if (!Array.isArray(newExNames)) {
       return "ERROR: Missing exercises array.";
    }
    
    const activeSessionStr = localStorage.getItem('pulseV3-activeSession');
    if (!activeSessionStr) {
       return "ERROR: No active workout session found. The user must start a workout first.";
    }
    
    try {
       const session = JSON.parse(activeSessionStr);
       const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
       
       const newExercises: any[] = [];
       const newSets: any = {};
       const usedOldIndices = new Set<number>();

       newExNames.forEach((rawName: string, i: number) => {
          // Extract the name from quotes if the AI hallucinates the metadata tags
          let name = rawName.trim();
          if (name.startsWith('"')) {
             const match = name.match(/"([^"]+)"/);
             if (match) name = match[1];
          } else {
             name = name.split(' [Muscle:')[0].split(' (Type:')[0].split(' (Risk:')[0].trim();
          }

          const oldIndex = session.exercises.findIndex((ex: any, idx: number) => 
              !usedOldIndices.has(idx) && 
              (ex.exerciseName || ex.name)?.toLowerCase() === name.toLowerCase()
          );

          if (oldIndex !== -1) {
             usedOldIndices.add(oldIndex);
             newExercises.push(session.exercises[oldIndex]);
             newSets[i] = session.sets[oldIndex];
          } else {
             const dbEx = allExercises.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
             const type = dbEx ? (dbEx.type || 'strength') : 'strength';
             newExercises.push({
                exerciseName: dbEx ? dbEx.name : name,
                type,
                sets: 3,
                reps: '8-12',
                time: '',
                distance: ''
             });
             
             newSets[i] = Array.from({ length: 3 }).map(() => {
                if (type === 'cardio') return { time: '', distance: '', calories: '', completed: false };
                if (type === 'timed') return { time: '', completed: false };
                return { weight: '', reps: '8-12', completed: false };
             });
          }
        });

        const preserve = args.preserve_omitted_exercises !== false;
        if (preserve) {
           session.exercises.forEach((ex: any, idx: number) => {
              if (!usedOldIndices.has(idx)) {
                 newExercises.push(ex);
                 newSets[newExercises.length - 1] = session.sets[idx];
              }
           });
        }

       session.exercises = newExercises;
       session.sets = newSets;
       
       localStorage.setItem('pulseV3-activeSession', JSON.stringify(session));
       
       // Notify any mounted Gym tabs to reload from local storage
       window.dispatchEvent(new CustomEvent('pulse_force_reload_active_workout'));
       
       return "SUCCESS: The active live workout has been dynamically modified.";
    } catch (err: any) {
       return `ERROR: Failed to update session - ${err.message}`;
    }
  }

  // DETERMINISTIC SORT TOOL — zero AI involvement in the actual sorting
  if (toolName === 'sort_active_workout') {
    const activeSessionStr = localStorage.getItem('pulseV3-activeSession');
    if (!activeSessionStr) {
       return "ERROR: No active workout session found. The user must start a workout first.";
    }
    try {
       const session = JSON.parse(activeSessionStr);
       const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
       const sortBy = (args.sort_by || 'compound_first').toLowerCase();

       // Build paired array of [exercise, sets] to sort together
       const paired = session.exercises.map((ex: any, idx: number) => ({
          exercise: ex,
          sets: session.sets[idx],
          originalIndex: idx
       }));

       paired.sort((a: any, b: any) => {
          const aName = (a.exercise.exerciseName || a.exercise.name || '').toLowerCase();
          const bName = (b.exercise.exerciseName || b.exercise.name || '').toLowerCase();
          const aDb = allExercises.find((e: any) => e.name.toLowerCase() === aName);
          const bDb = allExercises.find((e: any) => e.name.toLowerCase() === bName);
          const aType = (aDb?.movementType || '').toLowerCase();
          const bType = (bDb?.movementType || '').toLowerCase();

          if (sortBy === 'compound_first') {
             const aIsCompound = aType === 'compound' ? 0 : 1;
             const bIsCompound = bType === 'compound' ? 0 : 1;
             return aIsCompound - bIsCompound;
          } else if (sortBy === 'isolation_first') {
             const aIsIsolation = aType === 'isolation' ? 0 : 1;
             const bIsIsolation = bType === 'isolation' ? 0 : 1;
             return aIsIsolation - bIsIsolation;
          }
          return 0;
       });

       const newSets: any = {};
       session.exercises = paired.map((p: any, i: number) => {
          newSets[i] = p.sets;
          return p.exercise;
       });
       session.sets = newSets;

       localStorage.setItem('pulseV3-activeSession', JSON.stringify(session));
       window.dispatchEvent(new CustomEvent('pulse_force_reload_active_workout'));

       const compoundNames = paired
          .filter((p: any) => {
             const n = (p.exercise.exerciseName || p.exercise.name || '').toLowerCase();
             const db = allExercises.find((e: any) => e.name.toLowerCase() === n);
             return (db?.movementType || '').toLowerCase() === 'compound';
          })
          .map((p: any) => p.exercise.exerciseName || p.exercise.name);

       return `SUCCESS: Sorted workout with ${sortBy}. Compound exercises moved to top: ${compoundNames.join(', ')}. All sets and data preserved.`;
    } catch (err: any) {
       return `ERROR: Failed to sort session - ${err.message}`;
    }
  }

  // DETERMINISTIC FILTER TOOL — removes exercises by risk category programmatically
  if (toolName === 'filter_active_workout') {
    const activeSessionStr = localStorage.getItem('pulseV3-activeSession');
    if (!activeSessionStr) {
       return "ERROR: No active workout session found. The user must start a workout first.";
    }
    try {
       const session = JSON.parse(activeSessionStr);
       const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
       const filterRisk = (args.remove_risk || '').toLowerCase();

       const newExercises: any[] = [];
       const newSets: any = {};
       let removedCount = 0;
       let removedNames: string[] = [];

       session.exercises.forEach((ex: any, i: number) => {
          const name = (ex.exerciseName || ex.name || '').toLowerCase();
          const dbEx = allExercises.find((e: any) => e.name.toLowerCase() === name);
          const risk = (dbEx?.spinalRisk || 'Supported / Safe').toLowerCase();

          // Only keep exercises that DO NOT match the target risk
          if (risk !== filterRisk && risk !== 'spinal shear / flexion' /* fallback string matching */) {
             newExercises.push(ex);
             newSets[newExercises.length - 1] = session.sets[i];
          } else {
             removedCount++;
             removedNames.push(ex.exerciseName || ex.name);
          }
       });

       if (removedCount === 0) {
          return `NO ACTION: No exercises matching risk '${args.remove_risk}' were found in the active workout.`;
       }

       session.exercises = newExercises;
       session.sets = newSets;

       localStorage.setItem('pulseV3-activeSession', JSON.stringify(session));
       window.dispatchEvent(new CustomEvent('pulse_force_reload_active_workout'));

       return `SUCCESS: Filtered workout. Removed ${removedCount} exercises matching risk '${args.remove_risk}': ${removedNames.join(', ')}.`;
    } catch (err: any) {
       return `ERROR: Failed to filter session - ${err.message}`;
    }
  }

  // READ-ONLY RAG TOOLS
  if (toolName === 'analyze_workout_history') {
    const history: any[] = queryClient.getQueryData(['workoutHistory']) || [];
    const days = args.days || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = history.filter(h => new Date(h.date) >= cutoff);
    
    const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
    // Compress payload to save tokens
    // Limit to max 60 workouts to prevent token explosion
    const cappedFiltered = filtered.slice(0, 60);
    
    const compressed = cappedFiltered.map(h => {
      let exercisesStr = 'Unknown';
      try {
        const details = typeof h.exerciseDetails === 'string' ? JSON.parse(h.exerciseDetails) : (h.exerciseDetails || []);
        if (Array.isArray(details)) {
           exercisesStr = details.map((d: any) => {
             const name = d.exerciseName || d.name || d.exercise?.name || '';
             if (!name) return '';
             const ex = allExercises.find(e => e.name.toLowerCase() === name.toLowerCase());
             const mType = ex?.movementType ? ex.movementType : '';
             const target = ex?.muscleGroup ? ex.muscleGroup : '';
             const sRisk = ex?.spinalRisk && ex.spinalRisk !== 'Supported / Safe' ? ex.spinalRisk : '';
             const tags = [target, mType, sRisk].filter(Boolean).join(', ');
             return tags ? `${name} (${tags})` : name;
           }).filter(Boolean).join(' | ');
        }
      } catch(e) {}
      
      return {
         date: h.date?.split('T')[0],
         routine: h.routineName,
         volume: h.totalVolume,
         exercises: exercisesStr
      };
    });
    
    // Return chronological data directly, do not use semantic pruning for temporal queries
    return JSON.stringify(compressed);
  }

  if (toolName === 'analyze_weigh_ins') {
    const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
    const days = args.days || 30;
    const filtered = weighIns.slice(0, days);
    const compressed = filtered.map(w => `${w.date}: ${w.weight}`);
    return JSON.stringify(compressed);
  }

  if (toolName === 'get_saved_routines') {
    const routines: any[] = queryClient.getQueryData(['routines']) || [];
    const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
    const compressed = routines.map(r => ({
      name: r.name,
      ex: r.exercises?.map((e: any) => {
         const name = e.name || e.exercise?.name || e.exerciseName || '';
         if (!name) return '';
         const ex = allExercises.find(a => a.name === name);
         const risk = ex?.spinalRisk || 'Supported / Safe';
         const mType = ex?.movementType || 'Unknown';
         const target = ex?.muscleGroup || 'Unknown';
         const eq = ex?.equipment || 'Unknown';
         return `"${name}" [Muscle: ${target} | Type: ${mType} | Eq: ${eq} | Risk: ${risk}]`;
      }) || []
    }));
    return JSON.stringify(compressed);
  }

  if (toolName === 'get_exercise_library') {
    const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
    const compressed = allExercises.map(e => ({
      name: e.name,
      metadata: `[Muscle: ${e.muscleGroup || 'Unknown'} | Type: ${e.movementType || 'Unknown'} | Eq: ${e.equipment || 'Unknown'} | Risk: ${e.spinalRisk || 'Supported / Safe'}]`
    }));
    return JSON.stringify(compressed);
  }

  if (toolName === 'update_adaptive_tdee') {
    // Find date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

    // 1. Fetch weigh-ins
    const { data: weighIns } = await supabase
      .from('weigh_ins')
      .select('date, weight')
      .gte('date', cutoff)
      .order('date', { ascending: true });

    // 2. Fetch daily macros
    const { data: macros } = await supabase
      .from('daily_macros')
      .select('date, calories')
      .gte('date', cutoff)
      .gt('calories', 500) // ignore blank/empty days
      .order('date', { ascending: true });

    if (!weighIns || weighIns.length < 2) return 'ERROR: Not enough weigh-in data (needs at least 2 weigh-ins in the last 30 days). Fallback to Mifflin-St. Jeor.';
    if (!macros || macros.length < 14) return 'ERROR: Not enough caloric tracking data (needs at least 14 days of tracked calories > 500 in the last 30 days). Fallback to Mifflin-St. Jeor.';

    // Calculate Average Calories
    const totalCals = macros.reduce((sum, m) => sum + (m.calories || 0), 0);
    const avgCals = totalCals / macros.length;

    // Calculate Weight Delta
    const firstWeight = parseFloat(weighIns[0].weight);
    const lastWeight = parseFloat(weighIns[weighIns.length - 1].weight);
    const weightDeltaLbs = lastWeight - firstWeight;
    
    // Days elapsed between first and last weigh in
    const firstDate = new Date(weighIns[0].date).getTime();
    const lastDate = new Date(weighIns[weighIns.length - 1].date).getTime();
    const daysElapsed = Math.max(14, (lastDate - firstDate) / (1000 * 3600 * 24)); // ensure at least 14 to avoid dividing by 0 or artificially short windows

    const caloriesFromTissue = weightDeltaLbs * 3500;
    const totalCaloriesExpended = totalCals - caloriesFromTissue;
    const adaptiveTDEE = totalCaloriesExpended / daysElapsed;
    
    const balanced = {
       protein: Math.round((adaptiveTDEE * 0.30) / 4),
       carbs: Math.round((adaptiveTDEE * 0.40) / 4),
       fats: Math.round((adaptiveTDEE * 0.30) / 9)
    };
    const lowCarb = {
       protein: Math.round((adaptiveTDEE * 0.40) / 4),
       carbs: Math.round((adaptiveTDEE * 0.20) / 4),
       fats: Math.round((adaptiveTDEE * 0.40) / 9)
    };

    return JSON.stringify({
       days_tracked: macros.length,
       average_intake: Math.round(avgCals),
       weight_change_lbs: weightDeltaLbs.toFixed(2),
       adaptive_tdee: Math.round(adaptiveTDEE),
       suggested_macros: {
          balanced: `P:${balanced.protein}g C:${balanced.carbs}g F:${balanced.fats}g`,
          low_carb: `P:${lowCarb.protein}g C:${lowCarb.carbs}g F:${lowCarb.fats}g`
       }
    });
  }

  if (toolName === 'search_exercise_knowledge') {
    const queryName = args.exercise_name;
    if (!queryName) return "ERROR: Missing exercise_name.";
    
    const { data, error } = await supabase
      .from('exercise_knowledge')
      .select('*')
      .ilike('exercise_name', `%${queryName}%`)
      .limit(1);
      
    if (error) {
       return `ERROR searching knowledge base: ${error.message}. The user might need to run the SQL migration to create the exercise_knowledge table.`;
    }
    
    if (!data || data.length === 0) {
       return `NO KNOWLEDGE FOUND for exercise: ${queryName}.`;
    }
    
    return JSON.stringify(data[0]);
  }

  if (toolName === 'calculate_custom_macros') {
    const cals = args.target_calories;
    const balanced = {
       protein: Math.round((cals * 0.30) / 4),
       carbs: Math.round((cals * 0.40) / 4),
       fats: Math.round((cals * 0.30) / 9)
    };
    const lowCarb = {
       protein: Math.round((cals * 0.40) / 4),
       carbs: Math.round((cals * 0.20) / 4),
       fats: Math.round((cals * 0.40) / 9)
    };
    return JSON.stringify({
      target_calories: cals,
      suggested_macros: {
        balanced: `P:${balanced.protein}g C:${balanced.carbs}g F:${balanced.fats}g`,
        low_carb: `P:${lowCarb.protein}g C:${lowCarb.carbs}g F:${lowCarb.fats}g`
      }
    });
  }

  return `ERROR: Tool ${toolName} not found.`;
};
