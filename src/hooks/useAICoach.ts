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
${JSON.stringify(history).slice(0, 500)} // Truncated to avoid token limits if it's too huge

--- SAVED ROUTINES ---
${JSON.stringify(routines).slice(0, 200)}

--- RECENT WEIGH-INS ---
${JSON.stringify(weighIns).slice(0, 100)}

--- CURRENT MACRO GOALS ---
${JSON.stringify(macros)}

Use this data to answer the user's questions specifically tailored to their actual lifestyle and workout habits.
If they ask for a workout, check what exercises they do from their routines. If they ask about weight, reference their weigh-ins.
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
      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: context },
          // @ts-ignore
          ...chatHistory,
          { role: 'user', content: text }
        ],
        model: isPro ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant',
      });

      setMessages(prev => [...prev, { role: 'model', text: response.choices[0]?.message?.content || '' }]);
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
