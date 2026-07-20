import { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useAICoach = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  const gatherContext = async () => {
    // Attempt to gather context from cached react-query data
    const history = queryClient.getQueryData(['workoutHistory']) || [];
    const exercises = queryClient.getQueryData(['exercises']) || [];
    const routines = queryClient.getQueryData(['routines']) || [];
    const weighIns = queryClient.getQueryData(['weighIns']) || [];
    const macros = queryClient.getQueryData(['macroGoals']) || {};

    const { data: { user } } = await supabase.auth.getUser();

    return `
You are Pulse AI, a world-class personal trainer embedded in a fitness app. You are talking to the user.
Your tone is supportive and highly scientific. You rely on data to make decisions.
Never output raw JSON or code blocks unless requested. Format your output nicely using markdown (bolding, lists, etc).

Here is the user's current contextual data:

--- RECENT WORKOUT HISTORY (Last 30 Days) ---
${JSON.stringify(history).slice(0, 5000)} // Truncated to avoid token limits if it's too huge

--- SAVED ROUTINES ---
${JSON.stringify(routines).slice(0, 2000)}

--- RECENT WEIGH-INS ---
${JSON.stringify(weighIns).slice(0, 1000)}

--- CURRENT MACRO GOALS ---
${JSON.stringify(macros)}

Use this data to answer the user's questions specifically tailored to their actual lifestyle and workout habits.
If they ask for a workout, check what exercises they do from their routines. If they ask about weight, reference their weigh-ins.
`;
  };

  const sendMessage = useCallback(async (text: string) => {
    const apiKey = localStorage.getItem('pulse_gemini_key');
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', text }, { role: 'model', text: 'Error: No Gemini API key found. Please open App Settings (gear icon) and add your API key.' }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const context = await gatherContext();

      // We use the raw generateContent for a simple implementation without chat history management overhead for now,
      // but we will pass the previous few messages as history to simulate chat.
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          { role: 'user', parts: [{ text: context }] },
          { role: 'model', parts: [{ text: 'Understood. I have access to the contextual data and will act as your supportive, scientific coach.' }] },
          ...chatHistory,
          { role: 'user', parts: [{ text }] }
        ]
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, an error occurred: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, queryClient]);

  const clearChat = () => setMessages([]);

  return { messages, isTyping, sendMessage, clearChat };
};
