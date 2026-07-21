import { useState, useCallback, useEffect } from 'react';
import Groq from 'groq-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface RateLimits {
  remainingTokens: string | null;
  remainingRequests: string | null;
  resetTokens: string | null;
  resetRequests: string | null;
}

export const useAICoach = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>(() => {
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
  }, []);

  const getStaticContext = () => {
    return `
You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.
Your tone is supportive and highly scientific. You rely on data to make decisions.
Never output raw JSON or code blocks unless requested. Format your output nicely using markdown.

CRITICAL RULES:
- ONLY use your "Read-Only" tools (like analyze_workout_history) if the user asks for deep historical data (e.g. "What did I do last Tuesday?" or "How has my weight changed this month?").
- If they want to create or update something, use your "Write" tools ('create_routine', 'create_exercise', 'update_macros').
- STRICT RULE: ONLY use "Write" tools if the user EXPLICITLY asks you to create or update something. Do NOT volunteer to call write tools on your own.
- STRICT RULE: NEVER output raw function tags like <function=create_exercise> in your conversational text. If you must use a tool, use the standard JSON tool call format.
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

    return `
--- ZERO-SHOT DAILY BRIEFING ---
You ALREADY know the following about the user. Do NOT use tools to fetch this baseline information.
${bodyContext}

${macroContext}

${workoutContext}
--------------------------------
`;
  };

  const sendMessage = useCallback(async (text: string) => {
    const executeToolLogic = async (toolName: string, args: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required for tool calls.");
      
      const todayDate = new Date().toISOString().split('T')[0];

      // WRITE TOOLS
      if (toolName === 'create_routine') {
        if (!args.name || typeof args.name !== 'string' || args.name.trim().length === 0) return 'ERROR: Routine name cannot be empty.';
        if (!args.exercises || !Array.isArray(args.exercises) || args.exercises.length === 0) return 'ERROR: Routine must contain at least one exercise.';
        if (args.exercises.length > 50) return 'ERROR: Too many exercises in routine (max 50).';

        const routineId = Date.now().toString();
        const payload = {
          user_id: user.id,
          routine_id: routineId,
          name: args.name,
          exercises: args.exercises,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

      // READ-ONLY RAG TOOLS
      if (toolName === 'analyze_workout_history') {
        const history: any[] = queryClient.getQueryData(['workoutHistory']) || [];
        const days = args.days || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const filtered = history.filter(h => new Date(h.date) >= cutoff);
        
        // Compress payload to save tokens
        const compressed = filtered.map(h => {
          let exercisesStr = 'Unknown';
          try {
            const details = typeof h.exerciseDetails === 'string' ? JSON.parse(h.exerciseDetails) : (h.exerciseDetails || []);
            if (Array.isArray(details)) {
               exercisesStr = details.map((d: any) => d.exerciseName || d.name || d.exercise?.name || '').filter(Boolean).join(', ');
            }
          } catch(e) {}
          
          return {
             date: h.date?.split('T')[0],
             routine: h.routineName,
             volume: h.totalVolume,
             exercises: exercisesStr
          };
        });
        
        return JSON.stringify(compressed);
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
          
          calculatedStr = `BMI: ${bmi.toFixed(1)}, BMR: ${Math.round(bmr)}, TDEE: ${Math.round(tdee)}, Body Fat: ${bodyFatPercent.toFixed(1)}%`;
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
        const compressed = routines.map(r => ({
          name: r.name,
          ex: r.exercises?.map((e: any) => e.name || e.exercise?.name).join(', ') || ''
        }));
        return JSON.stringify(compressed);
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

    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const staticContext = getStaticContext();
      const dynamicContext = getDynamicContext();

      // We maintain a conversation thread array for the API loop
      // Only include the most recent 6 messages to save tokens (Sliding Window)
      const apiMessages: any[] = [
        { role: 'system', content: staticContext },
        ...messages.slice(-6).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: 'user', content: `${dynamicContext}\n[USER MESSAGE]:\n${text}` }
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
      
      const modelName = isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
      console.log(`[Semantic Router] Routing payload to: ${modelName}`);
      
      const tools = [
        {
          type: "function",
          function: {
            name: "create_routine",
            description: "Creates a new workout routine.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                exercises: { type: "array", items: { type: "object", properties: { name: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, target_muscle: { type: "string" } } } }
              },
              required: ["name", "exercises"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_exercise",
            description: "Creates a new gym exercise to add to library.",
            parameters: {
              type: "object",
              properties: { name: { type: "string" }, muscleGroup: { type: "string" }, type: { type: "string", enum: ["strength", "cardio"] }, equipment: { type: "string" } },
              required: ["name", "muscleGroup"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_macros",
            description: "Updates the user's daily nutrition goals.",
            parameters: {
              type: "object",
              properties: { calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fats: { type: "number" } },
              required: ["calories", "protein", "carbs", "fats"]
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
              properties: { days: { type: "number", description: "Number of days of history to fetch (e.g. 7, 30)" } },
              required: ["days"]
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
            name: "get_body_metrics",
            description: "Fetches the user's Age, Height, Weight, BMI, BMR, TDEE, and Body Fat %. Use this if they ask for personalized calorie/macro targets.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        }
      ];

      let keepRunning = true;
      let finalResponseContent = "";

      while (keepRunning) {
        // @ts-ignore
        const { data, response } = await groq.chat.completions.create({
          messages: apiMessages,
          model: modelName,
          // @ts-ignore
          tools: tools,
          tool_choice: "auto"
        }).withResponse();

        // Capture Token Usage from response body since headers are blocked by CORS
        const usage = data.usage?.total_tokens || 0;
        
        // Retrieve stored usage for today
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

        // Estimate remaining based on typical Groq Free Tier (100,000 tokens per day)
        const estimatedRemaining = Math.max(0, 100000 - newTotalUsage);
        
        const limits = {
          remainingTokens: estimatedRemaining.toString(),
          remainingRequests: '--', // We can't accurately track RPD without a full DB, so hide this
          resetTokens: null,
          resetRequests: null,
        };
        setRateLimits(limits);

        const responseMessage = data.choices[0]?.message;
        
        if (!responseMessage) {
          keepRunning = false;
          break;
        }

        apiMessages.push(responseMessage);

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          for (const toolCall of responseMessage.tool_calls) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const toolResult = await executeToolLogic(toolCall.function.name, args);
              apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: toolResult
              });
            } catch(err: any) {
              apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: `Error executing tool: ${err.message}`
              });
            }
          }
        } else {
          finalResponseContent = responseMessage.content || "";
          keepRunning = false;
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: finalResponseContent }]);

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
