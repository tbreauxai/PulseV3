import { useState, useCallback, useEffect } from 'react';
import Groq from 'groq-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useAICoach = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
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
  }, []);

  const gatherContext = async () => {
    const todayDate = new Date().toISOString().split('T')[0];
    const history = queryClient.getQueryData(['workoutHistory']) || [];
    const exercises = queryClient.getQueryData(['exercises']) || [];
    const routines = queryClient.getQueryData(['routines']) || [];
    const weighIns = queryClient.getQueryData(['weighIns']) || [];
    const macros = queryClient.getQueryData(['macroGoals']) || {};
    const dailyMacros = queryClient.getQueryData(['dailyMacros', todayDate]) || {};
    const hydration = queryClient.getQueryData(['hydration', todayDate]) || 0;
    const waterGoal = queryClient.getQueryData(['waterGoal']) || 2000;

    const { data: { user } } = await supabase.auth.getUser();
    return `
You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.
Your tone is supportive and highly scientific. You rely on data to make decisions.
Never output raw JSON or code blocks unless requested. Format your output nicely using markdown (bolding, lists, etc).

Here is the user's current contextual data:

--- ALL EXERCISES ---
${JSON.stringify(exercises)}

--- ALL SAVED ROUTINES ---
${JSON.stringify(routines)}

--- WORKOUT HISTORY ---
${JSON.stringify(history)}

--- WEIGH-INS ---
${JSON.stringify(weighIns)}

--- MACRO GOALS & TODAY'S INTAKE ---
Goals: ${JSON.stringify(macros)}
Today's Intake: ${JSON.stringify(dailyMacros)}

--- TODAY'S HYDRATION ---
Goal: ${waterGoal}ml
Intake: ${hydration}ml

Use this data to answer the user's questions specifically tailored to their actual lifestyle and workout habits.
If they ask for a workout, check what exercises they do from their routines. If they ask about weight, reference their weigh-ins.

CRITICAL INSTRUCTIONS FOR TOOL CALLING:
- You have tools to create routines and exercises (`create_routine`, `create_exercise`).
- ONLY trigger these tools if the user EXPLICITLY asks you to "create", "save", "add", or "build" a routine or exercise into their library.
- If the user is just asking for advice, ideas, or says "what do you think?", DO NOT trigger a tool. Just reply with conversational text and markdown.
- When you do use a tool, you MUST provide the exact tool name in the name field. DO NOT use raw <function> tags in the text.
`;
  };

  const sendMessage = useCallback(async (text: string) => {
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

      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      }));

      const isPro = localStorage.getItem('pulse_groq_use_pro') === 'true';
      
      const tools = [
        {
          type: "function",
          function: {
            name: "create_routine",
            description: "Creates a new workout routine and saves it to the user's library.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "The name of the routine (e.g. 'Push Day')" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sets: { type: "number" },
                      reps: { type: "string", description: "Target reps, e.g. '8-12'" },
                      target_muscle: { type: "string" }
                    }
                  }
                }
              },
              required: ["name", "exercises"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_exercise",
            description: "Creates a new custom exercise.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                muscleGroup: { type: "string" },
                type: { type: "string", enum: ["strength", "cardio"] },
                equipment: { type: "string", description: "Best guess for equipment (e.g. Barbell, Dumbbell, Machine, Bodyweight)" }
              },
              required: ["name", "muscleGroup"]
            }
          }
        }
      ];

      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: context },
          // @ts-ignore
          ...chatHistory,
          { role: 'user', content: text }
        ],
        model: isPro ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant',
        // @ts-ignore
        tools: tools,
        tool_choice: "auto"
      });

      const responseMessage = response.choices[0]?.message;

      if (responseMessage?.tool_calls) {
        let toolResponseText = "";
        
        for (const toolCall of responseMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) throw new Error("Authentication required for tool calls.");

          if (toolCall.function.name === 'create_routine') {
            const routineId = Date.now().toString();
            const payload = {
              user_id: user.id,
              routine_id: routineId,
              name: args.name,
              exercises: args.exercises,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase.from('routines').insert([payload]);
            if (error) throw error;
            
            await queryClient.invalidateQueries({ queryKey: ['routines'] });
            toolResponseText += `\n✅ **Created Routine:** ${args.name}`;
          }
          
          if (toolCall.function.name === 'create_exercise') {
            const exerciseId = Date.now().toString();
            const payload = {
              user_id: user.id,
              exercise_id: exerciseId,
              name: args.name,
              type: args.type || 'strength',
              muscle_group: args.muscleGroup || '',
              equipment: args.equipment || ''
            };
            
            const { error } = await supabase.from('user_exercises').insert([payload]);
            if (error) throw error;
            
            await queryClient.invalidateQueries({ queryKey: ['exercises'] });
            toolResponseText += `\n✅ **Created Exercise:** ${args.name} (${args.muscleGroup})`;
          }
        }
        
        setMessages(prev => [...prev, { role: 'model', text: responseMessage.content ? responseMessage.content + "\n" + toolResponseText : toolResponseText.trim() }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: responseMessage?.content || '' }]);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, an error occurred: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, queryClient]);

  const clearChat = () => setMessages([]);

  return { messages, isTyping, sendMessage, clearChat, requestTimestamps };
};
