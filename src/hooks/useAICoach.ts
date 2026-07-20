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
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
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

  const gatherContext = async () => {
    return `
You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.
Your tone is supportive and highly scientific. You rely on data to make decisions.
Never output raw JSON or code blocks unless requested. Format your output nicely using markdown.

CRITICAL: You DO NOT have the user's workout data, weigh-ins, routines, or nutrition data in this prompt!
You MUST use your provided "Read-Only" tools (like analyze_workout_history, get_macros_and_nutrition) to fetch data from the user's database IF they ask a question that requires insight into their habits.

If they want to create or update something, use your "Write" tools ('create_routine', 'create_exercise', 'update_macros').
`;
  };

  const sendMessage = useCallback(async (text: string) => {
    const executeToolLogic = async (toolName: string, args: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required for tool calls.");
      
      const todayDate = new Date().toISOString().split('T')[0];

      // WRITE TOOLS
      if (toolName === 'create_routine') {
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
        return JSON.stringify(filtered);
      }

      if (toolName === 'analyze_weigh_ins') {
        const weighIns: any[] = queryClient.getQueryData(['weighIns']) || [];
        const days = args.days || 30;
        // weighIns have format "Oct 23" which is tricky to parse safely, so we'll just slice by index for now
        // Assuming latest is at index 0
        const filtered = weighIns.slice(0, days);
        return JSON.stringify(filtered);
      }

      if (toolName === 'get_macros_and_nutrition') {
        const macros = queryClient.getQueryData(['macroGoals']) || {};
        const dailyMacros = queryClient.getQueryData(['dailyMacros', todayDate]) || {};
        const hydration = queryClient.getQueryData(['hydration', todayDate]) || 0;
        const waterGoal = queryClient.getQueryData(['waterGoal']) || 2000;
        return JSON.stringify({ goals: macros, todayIntake: dailyMacros, hydrationGoal: waterGoal, hydrationToday: hydration });
      }

      if (toolName === 'get_saved_routines') {
        const routines = queryClient.getQueryData(['routines']) || [];
        return JSON.stringify(routines);
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
      const context = await gatherContext();

      // We maintain a conversation thread array for the API loop
      const apiMessages: any[] = [
        { role: 'system', content: context },
        ...messages.slice(-10).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: 'user', content: text }
      ];

      const isPro = localStorage.getItem('pulse_groq_use_pro') === 'true';
      const modelName = isPro ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
      
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

        // Capture Rate Limits
        const limits = {
          remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
          remainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
          resetTokens: response.headers.get('x-ratelimit-reset-tokens'),
          resetRequests: response.headers.get('x-ratelimit-reset-requests'),
        };
        setRateLimits(limits);
        localStorage.setItem('pulse_groq_limits', JSON.stringify(limits));

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

  const clearChat = () => setMessages([]);

  return { messages, isTyping, sendMessage, clearChat, requestTimestamps, rateLimits };
};
