import { useState, useCallback, useEffect } from 'react';
import Groq from 'groq-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { semanticCache } from '../lib/semanticCache';
import { memoryEngine } from '../lib/memoryEngine';

export interface RateLimits {
  remainingTokens: string | null;
  remainingRequests: string | null;
  resetTokens: string | null;
  resetRequests: string | null;
}

export const useAICoach = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, reasoning?: string }[]>(() => {
    try {
      const stored = localStorage.getItem('pulse_ai_chat_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  useEffect(() => {
    localStorage.setItem('pulse_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  const [isTyping, setIsTyping] = useState(false);
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimits>({
    remainingTokens: null,
    remainingRequests: null,
    resetTokens: null,
    resetRequests: null
  });
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem('pulse_groq_requests');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const recent = parsed.filter((t: number) => now - t < 24 * 60 * 60 * 1000);
        setRequestTimestamps(recent);
        if (parsed.length !== recent.length) {
          localStorage.setItem('pulse_groq_requests', JSON.stringify(recent));
        }
      } catch(e) {}
    }
    
    // Load last known rate limits
    const storedLimits = localStorage.getItem('pulse_groq_limits');
    if (storedLimits) {
      try {
        setRateLimits(JSON.parse(storedLimits));
      } catch(e) {}
    }

    // Initialize semantic cache
    semanticCache.init().catch(e => console.warn("Semantic cache init failed:", e));
  }, []);

  const getStaticContext = () => {
    return `
You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.
Your tone is supportive and highly scientific. You rely on data to make decisions.
Never output raw JSON or code blocks unless requested. Format your output nicely using markdown.

CRITICAL RULES:
- ONLY use your "Read-Only" tools (like analyze_workout_history) if the user asks for deep historical data (e.g. "What did I do last Tuesday?" or "How has my weight changed this month?").
- If they want to create or update something, use your "Write" tools ('create_routine', 'create_exercise', 'update_macros', 'update_active_workout', 'modify_saved_routine').
- STRICT RULE: ONLY use "Write" tools if the user EXPLICITLY asks you to create or update something. Do NOT volunteer to call write tools on your own.
- STRICT RULE: NEVER output raw function tags like <function=create_exercise> in your conversational text. If you must use a tool, use the standard JSON tool call format.
- STRICT RULE: If the user asks you to modify, update, reorder, or condense their active workout, you MUST use the \`update_active_workout\` tool. NEVER just output a text list of exercises in your chat response. You MUST call the tool.
- STRICT RULE: If the user asks how to perform an exercise, what muscles it targets, or for a video guide, you MUST call the \`search_exercise_knowledge\` tool.
`;
  };

  const getDynamicContext = () => {
    // 1. Fetch zero-shot context from react-query cache
    const todayDate = new Date().toISOString().split('T')[0];
    
    // Body Metrics
    const metrics: any = queryClient.getQueryData(['bodyMetrics']) || {};
    const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
    const weightLbs = weighIns && weighIns.length > 0 ? parseFloat(weighIns[0].weight) : 'Unknown';
    let bodyContext = `Body Metrics: Age: ${metrics.age || '?'}, Height: ${metrics.height_cm || '?'}cm, Weight: ${weightLbs}lbs, Activity: ${metrics.activity_level || '?'}.`;

    // Macros & Hydration
    const macroGoals: any = queryClient.getQueryData(['macroGoals']) || {};
    const dailyMacros: any = queryClient.getQueryData(['dailyMacros', todayDate]) || {};
    const hydration = queryClient.getQueryData(['hydration', todayDate]) || 0;
    const waterGoal = queryClient.getQueryData(['waterGoal']) || 2000;
    
    const macroContext = `Today's Intake vs Goals: 
- Calories: ${dailyMacros.calories || 0}/${macroGoals.calories || 0} kcal
- Protein: ${dailyMacros.protein || 0}/${macroGoals.protein || 0} g
- Carbs: ${dailyMacros.carbs || 0}/${macroGoals.carbs || 0} g
- Fats: ${dailyMacros.fats || 0}/${macroGoals.fats || 0} g
- Hydration: ${hydration}/${waterGoal} ml`;

    // Last Workout
    const history: any[] = queryClient.getQueryData(['workoutHistory']) || [];
    let workoutContext = "Last Workout: None logged recently.";
    if (history && history.length > 0) {
      const last = history[0]; // Assuming sorted desc
      workoutContext = `Last Workout: ${last.routineName || 'Unknown Routine'} on ${last.date?.split('T')[0] || '?'} (Volume: ${last.totalVolume || 0} lbs)`;
    }

    // Active Live Session
    let activeSessionContext = "ACTIVE LIVE WORKOUT: None.";
    try {
      const activeSessionStr = localStorage.getItem('pulseV3-activeSession');
      if (activeSessionStr) {
         const session = JSON.parse(activeSessionStr);
         if (session && session.exercises) {
            const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
            const exStrings = session.exercises.map((e: any) => {
               const name = e.exerciseName || e.name;
               const dbEx = allExercises.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
               const risk = dbEx?.spinalRisk ? dbEx.spinalRisk : 'Supported / Safe';
               return `${name} (Risk: ${risk})`;
            });
            activeSessionContext = `ACTIVE LIVE WORKOUT (Currently on user's screen): ${session.routineName || 'Custom'} -> [${exStrings.join(', ')}]`;
         }
      }
    } catch(e) {}

    return `
--- ZERO-SHOT DAILY BRIEFING ---
You ALREADY know the following about the user. Do NOT use tools to fetch this baseline information.
${bodyContext}

${macroContext}

${workoutContext}

${activeSessionContext}
--------------------------------
`;
  };

  const sendMessage = useCallback(async (text: string) => {
    const executeToolLogic = async (toolName: string, args: any, goalText: string = "") => {
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
        
        window.dispatchEvent(new CustomEvent('pulse_update_active_workout', { 
          detail: { exercises: newExNames } 
        }));
        
        return "SUCCESS: The active live workout has been dynamically modified on the user's screen.";
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
        const compressed = filtered.map(h => {
          let exercisesStr = 'Unknown';
          try {
            const details = typeof h.exerciseDetails === 'string' ? JSON.parse(h.exerciseDetails) : (h.exerciseDetails || []);
            if (Array.isArray(details)) {
               exercisesStr = details.map((d: any) => {
                 const name = d.exerciseName || d.name || d.exercise?.name || '';
                 if (!name) return '';
                 const ex = allExercises.find(e => e.name === name);
                 const mType = ex?.movementType ? ex.movementType : '';
                 const sRisk = ex?.spinalRisk && ex.spinalRisk !== 'Supported / Safe' ? ex.spinalRisk : '';
                 const tags = [mType, sRisk].filter(Boolean).join(', ');
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
        
        // Use Neural Skimmer to filter down to the 10 most relevant workouts based on the user's query
        const pruned = await semanticCache.pruneJSON(goalText, compressed, 10);
        
        return JSON.stringify(pruned);
      }

      if (toolName === 'analyze_weigh_ins') {
        const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
        const days = args.days || 30;
        const filtered = weighIns.slice(0, days);
        const compressed = filtered.map(w => `${w.date}: ${w.weight}`);
        return JSON.stringify(compressed);
      }

      if (toolName === 'get_macros_and_nutrition') {
        const macros: any = queryClient.getQueryData(['macroGoals']) || {};
        const dailyMacros: any = queryClient.getQueryData(['dailyMacros', todayDate]) || {};
        const hydration = queryClient.getQueryData(['hydration', todayDate]) || 0;
        const waterGoal = queryClient.getQueryData(['waterGoal']) || 2000;
        
        return JSON.stringify({ 
          goals: { cal: macros.calories, p: macros.protein, c: macros.carbs, f: macros.fats }, 
          today: { cal: dailyMacros.calories, p: dailyMacros.protein, c: dailyMacros.carbs, f: dailyMacros.fats }, 
          water: `${hydration}/${waterGoal}` 
        });
      }

      if (toolName === 'get_body_metrics') {
        const metrics: any = queryClient.getQueryData(['bodyMetrics']) || {};
        const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
        const latestWeightLbs = weighIns && weighIns.length > 0 ? parseFloat(weighIns[0].weight) : null;
        
        let calculatedStr = "No weight logged.";
        if (metrics.age && metrics.height_cm && latestWeightLbs) {
          const age = parseInt(metrics.age);
          const heightCm = parseFloat(metrics.height_cm);
          const latestWeightKg = latestWeightLbs * 0.453592;
          
          const heightM = heightCm / 100;
          const bmi = latestWeightKg / (heightM * heightM);
          
          let bmr = (10 * latestWeightKg) + (6.25 * heightCm) - (5 * age);
          bmr += metrics.gender === 'male' ? 5 : -161;
          
          const multipliers: Record<string, number> = {
            'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725, 'extra': 1.9
          };
          const tdee = bmr * (multipliers[metrics.activity_level] || 1.2);
          
          const genderFactor = metrics.gender === 'male' ? 1 : 0;
          let bodyFatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
          if (bodyFatPercent < 2) bodyFatPercent = 2;
          if (bodyFatPercent > 60) bodyFatPercent = 60;
          
          const balanced = {
             protein: Math.round((tdee * 0.30) / 4),
             carbs: Math.round((tdee * 0.40) / 4),
             fats: Math.round((tdee * 0.30) / 9)
          };
          const lowCarb = {
             protein: Math.round((tdee * 0.40) / 4),
             carbs: Math.round((tdee * 0.20) / 4),
             fats: Math.round((tdee * 0.40) / 9)
          };

          calculatedStr = `BMI: ${bmi.toFixed(1)}, BMR: ${Math.round(bmr)}, TDEE: ${Math.round(tdee)}, Body Fat: ${bodyFatPercent.toFixed(1)}% | MACRO OPTIONS - Balanced: P:${balanced.protein}g C:${balanced.carbs}g F:${balanced.fats}g | Low Carb: P:${lowCarb.protein}g C:${lowCarb.carbs}g F:${lowCarb.fats}g`;
        }

        return JSON.stringify({
          age: metrics.age,
          height_cm: metrics.height_cm,
          gender: metrics.gender,
          activity_level: metrics.activity_level,
          weight_lbs: latestWeightLbs,
          calculations: calculatedStr
        });
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
             const mType = ex?.movementType ? ex.movementType : '';
             const sRisk = ex?.spinalRisk && ex.spinalRisk !== 'Supported / Safe' ? ex.spinalRisk : '';
             const tags = [mType, sRisk].filter(Boolean).join(', ');
             return tags ? `${name} (${tags})` : name;
          }).filter(Boolean).join(' | ') || ''
        }));
        return JSON.stringify(compressed);
      }

      if (toolName === 'get_exercise_library') {
        const allExercises: any[] = queryClient.getQueryData(['exercises']) || [];
        const compressed = allExercises.map(e => ({
          name: e.name,
          type: e.movementType || 'Compound',
          risk: e.spinalRisk || 'Supported / Safe',
          group: e.muscleGroup
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

      if (toolName === 'search_chat_history') {
        const query = args.query?.toLowerCase() || '';
        // Skip searching the most recent 6 messages since they are already in context
        const olderMessages = messages.slice(0, -6);
        const matches = olderMessages
          .filter(m => m.text.toLowerCase().includes(query))
          .map(m => `[${m.role.toUpperCase()}]: ${m.text}`);
        
        if (matches.length === 0) return `No past conversation found about: ${query}`;
        // Return max 5 matches to avoid token explosion
        return matches.slice(-5).join('\n\n');
      }

      return `ERROR: Tool ${toolName} not found.`;
    };

    const apiKey = localStorage.getItem('pulse_groq_key');
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', text }, { role: 'model', text: 'Error: No Groq API key found. Please open App Settings (gear icon) and add your API key.' }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    const now = Date.now();
    const newTimestamps = [...requestTimestamps, now];
    setRequestTimestamps(newTimestamps);
    localStorage.setItem('pulse_groq_requests', JSON.stringify(newTimestamps));

    // Fire hidden extraction asynchronously
    memoryEngine.processMessageAsync(text, apiKey).catch(() => {});

    try {
      // -------------------------------------------------------------
      // 1. SEMANTIC CACHE LOOKUP
      // -------------------------------------------------------------
      const cachedResponse = await semanticCache.get(text);
      if (cachedResponse) {
        setMessages(prev => [...prev, { role: 'model', text: cachedResponse }]);
        setIsTyping(false);
        return; // Skip LLM entirely
      }

      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const staticContext = getStaticContext();
      const dynamicContext = getDynamicContext();
      const memoryContext = await memoryEngine.retrieveContext(text);

      // We maintain a conversation thread array for the API loop
      // Only include the most recent 6 messages to save tokens (Sliding Window)
      const apiMessages: any[] = [
        { role: 'system', content: staticContext },
        { role: 'system', content: `[CURRENT STATE & CONTEXT]\n${dynamicContext}` },
        ...(memoryContext ? [{ role: 'system', content: `[RELEVANT MEMORY]\n${memoryContext}` }] : []),
        ...messages.slice(-6).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: 'user', content: text }
      ];

      // -------------------------------------------------------------
      // FIRST-PASS LLM ROUTER (Semantic Routing)
      // -------------------------------------------------------------
      let isComplex = false;
      try {
        const routerResponse = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: "Does this user query require deep physiological analysis, workout generation, examining historical data, or complex reasoning? Reply ONLY with 'COMPLEX' or 'SIMPLE'." },
            { role: 'user', content: text }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0,
          max_tokens: 5,
        });
        const classification = routerResponse.choices[0]?.message?.content?.trim().toUpperCase();
        if (classification?.includes('COMPLEX')) {
          isComplex = true;
        }
        console.log(`[Semantic Router] Classified as: ${classification}`);
      } catch (err) {
        console.error("Router error:", err);
      }
      
      const modelName = isComplex ? 'deepseek-r1-distill-llama-70b' : 'llama-3.1-8b-instant';
      console.log(`[Semantic Router] Routing payload to: ${modelName}`);
      
      const tools = [
        {
          type: "function",
          function: {
            name: "create_routine",
            description: "Creates a new workout routine.",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                date: { type: "string", description: "ISO date string (e.g. YYYY-MM-DD)" },
                exercises: { type: "array", items: { type: "object", properties: { name: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, target_muscle: { type: "string" } }, required: ["name", "sets", "reps", "target_muscle"], additionalProperties: false } }
              },
              required: ["name", "date", "exercises"],
              additionalProperties: false
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_exercise",
            description: "Creates a new custom exercise.",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                muscleGroup: { type: "string" },
                type: { type: "string", description: "strength, cardio, or mobility" },
                equipment: { type: "string" }
              },
              required: ["name", "muscleGroup", "type", "equipment"],
              additionalProperties: false
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_macros",
            description: "Updates the user's daily macro goals.",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" }
              },
              required: ["calories", "protein", "carbs", "fats"],
              additionalProperties: false
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_chat_history",
            description: "Searches the user's permanent chat history for past conversations or topics not in your immediate memory.",
            parameters: {
              type: "object",
              properties: { query: { type: "string", description: "The keyword or topic to search for" } },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "analyze_workout_history",
            description: "Fetches the user's logged workouts over the specified number of days.",
            parameters: {
              type: "object",
              properties: {
                days: { type: "number", description: "Number of days to analyze (default 30)" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_adaptive_tdee",
            description: "Calculates the user's true Adaptive TDEE using thermodynamic analysis over the last 21-30 days of weigh-ins and calories. DO NOT ask the user before calling this tool, just call it.",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        },
        {
          type: "function",
          function: {
            name: "analyze_weigh_ins",
            description: "Fetches the user's weigh-in history (body weight).",
            parameters: {
              type: "object",
              properties: { days: { type: "number", description: "Number of most recent weigh-ins to fetch" } },
              required: ["days"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_macros_and_nutrition",
            description: "Fetches the user's current diet goals, today's intake, and hydration.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "get_saved_routines",
            description: "Fetches the user's saved workout routines.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "modify_saved_routine",
            description: "Modifies a saved workout routine by reordering, adding, or removing exercises. Pass the full, final list of exercises you want the routine to have. This will completely overwrite the existing exercise list for that routine.",
            parameters: {
              type: "object",
              properties: {
                routine_name: { type: "string", description: "The exact name of the routine to modify (e.g. 'Push Day')." },
                exercises: { 
                  type: "array", 
                  items: { type: "string" }, 
                  description: "An ordered list of exact exercise names for the new routine structure (e.g. ['Barbell Bench Press', 'Cable Crossover'])."
                }
              },
              required: ["routine_name", "exercises"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_active_workout",
            description: "Modifies the user's LIVE active workout on their screen. Use this when the user is currently working out and asks you to 'condense my workout', 'swap this exercise', or 'reorder my workout'. It will safely preserve completed sets and dynamically swap the remaining exercises.",
            parameters: {
              type: "object",
              properties: {
                exercises: { 
                  type: "array", 
                  items: { type: "string" }, 
                  description: "The full ordered list of exercise names that the active workout should be updated to."
                }
              },
              required: ["exercises"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_exercise_library",
            description: "Fetches the user's entire available exercise library including their custom exercises, muscle groups, and movement types. Use this to see what exercises they have available when building new routines.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "search_exercise_knowledge",
            description: "Searches the Supabase Exercise Knowledge Base for detailed information on how to perform an exercise, what muscles it targets, common mistakes, and video links. ALWAYS call this when the user asks 'how do I do this', 'is my form right', or asks for a guide.",
            parameters: {
              type: "object",
              properties: {
                exercise_name: { type: "string", description: "The exact name of the exercise to look up (e.g. 'Barbell Squat')." }
              },
              required: ["exercise_name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_body_metrics",
            description: "Fetches the user's Age, Height, Weight, BMI, BMR, TDEE, and Body Fat %. Use this if they ask for personalized calorie/macro targets.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "calculate_custom_macros",
            description: "Calculates exact grammatical macro splits for a custom or hypothetical calorie target. Use this whenever the user asks for macros based on a specific calorie number (e.g. 1800) rather than their body metrics.",
            parameters: {
              type: "object",
              properties: {
                target_calories: { type: "number", description: "The total calorie target to calculate splits for." }
              },
              required: ["target_calories"]
            }
          }
        }
      ];

      let keepRunning = true;
      let finalResponseContent = "";
      let madeToolCalls = false;
      let uiMessageAdded = false;

      while (keepRunning) {
        const stream = await groq.chat.completions.create({
          messages: apiMessages,
          model: modelName,
          temperature: 0.0,
          // @ts-ignore
          tools: tools,
          tool_choice: "auto",
          stream: true,
          // @ts-ignore
          stream_options: { include_usage: true },
          ...(isComplex && {
             // @ts-ignore
             include_reasoning: true,
             // @ts-ignore
             reasoning_effort: "medium"
          })
        });

        let currentResponse = "";
        let currentReasoning = "";
        let toolCallsAcc: any[] = [];
        let inThinkTag = false;
        
        for await (const chunk of stream) {
           const delta = chunk.choices[0]?.delta;
           
           // @ts-ignore
           if (chunk.usage && chunk.usage.total_tokens) {
              const usage = chunk.usage.total_tokens;
              const todayStr = new Date().toISOString().split('T')[0];
              let storedUsage = 0;
              try {
                const stored = JSON.parse(localStorage.getItem('pulse_groq_usage') || '{}');
                if (stored.date === todayStr) {
                  storedUsage = stored.tokens || 0;
                }
              } catch(e) {}

              const newTotalUsage = storedUsage + usage;
              localStorage.setItem('pulse_groq_usage', JSON.stringify({ date: todayStr, tokens: newTotalUsage }));

              const estimatedRemaining = Math.max(0, 100000 - newTotalUsage);
              setRateLimits({
                remainingTokens: estimatedRemaining.toString(),
                remainingRequests: '--',
                resetTokens: null,
                resetRequests: null,
              });
           }

           if (!delta) continue;
           
           if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                 const index = tc.index;
                 if (!toolCallsAcc[index]) {
                    toolCallsAcc[index] = { id: tc.id, type: 'function', function: { name: tc.function?.name || '', arguments: '' } };
                 }
                 if (tc.function?.arguments) {
                    toolCallsAcc[index].function.arguments += tc.function.arguments;
                 }
              }
           }
           
           // @ts-ignore (Groq reasoning field)
           if (delta.reasoning) {
              if (!uiMessageAdded) {
                 setMessages(prev => [...prev, { role: 'model', text: '', reasoning: '' }]);
                 uiMessageAdded = true;
              }
              // @ts-ignore
              currentReasoning += delta.reasoning;
              setMessages(prev => {
                 const newMessages = [...prev];
                 newMessages[newMessages.length - 1].reasoning = currentReasoning;
                 return newMessages;
              });
           }
           
           if (delta.content) {
              // Fallback for manual `<think>` tag parsing if include_reasoning isn't respected by API
              let textToAdd = delta.content;
              if (textToAdd.includes('<think>')) {
                 inThinkTag = true;
                 textToAdd = textToAdd.replace('<think>', '');
              }
              if (textToAdd.includes('</think>')) {
                 inThinkTag = false;
                 // Add the closing part to reasoning, and keep the rest for content
                 const split = textToAdd.split('</think>');
                 currentReasoning += split[0];
                 textToAdd = split[1] || '';
              }
              
              if (!uiMessageAdded) {
                 setMessages(prev => [...prev, { role: 'model', text: '', reasoning: '' }]);
                 uiMessageAdded = true;
              }

              if (inThinkTag) {
                 currentReasoning += textToAdd;
                 setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].reasoning = currentReasoning;
                    return newMessages;
                 });
              } else if (textToAdd) {
                 currentResponse += textToAdd;
                 setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = currentResponse;
                    return newMessages;
                 });
              }
           }
        }

        toolCallsAcc = toolCallsAcc.filter(Boolean); // compact array

        if (toolCallsAcc.length > 0) {
           madeToolCalls = true;
           apiMessages.push({
             role: 'assistant',
             content: null,
             tool_calls: toolCallsAcc
           });

           const toolResults = await Promise.all(toolCallsAcc.map(async (toolCall: any) => {
             try {
               const args = JSON.parse(toolCall.function.arguments);
               const toolResult = await executeToolLogic(toolCall.function.name, args, text);
               return {
                 role: 'tool',
                 tool_call_id: toolCall.id,
                 name: toolCall.function.name,
                 content: toolResult
               };
             } catch(err: any) {
               return {
                 role: 'tool',
                 tool_call_id: toolCall.id,
                 name: toolCall.function.name,
                 content: `Error executing tool: ${err.message}`
               };
             }
           }));
           
           apiMessages.push(...toolResults);
        } else {
           finalResponseContent = currentResponse;
           keepRunning = false;
        }
      }

      // -------------------------------------------------------------
      // 3. CACHE SAVING
      // -------------------------------------------------------------
      if (!madeToolCalls && finalResponseContent) {
        semanticCache.set(text, finalResponseContent).catch(e => console.warn("Failed to set semantic cache:", e));
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, an error occurred: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, queryClient, requestTimestamps]);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const apiKey = localStorage.getItem('pulse_groq_key');
    if (!apiKey) throw new Error('No Groq API key found. Please add it in settings.');
    
    setIsTyping(true);
    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type });
      
      const transcription = await groq.audio.transcriptions.create({
        file: file,
        model: 'whisper-large-v3-turbo',
      });
      
      return transcription.text;
    } catch (error: any) {
      console.error('Transcription error:', error);
      throw error;
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => setMessages([]);

  return { messages, isTyping, sendMessage, clearChat, requestTimestamps, rateLimits, transcribeAudio };
};
