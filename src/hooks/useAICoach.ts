import { useState, useCallback, useEffect } from 'react';
import Groq from 'groq-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { semanticCache } from '../lib/semanticCache';
import { memoryEngine } from '../lib/memoryEngine';
import { aiTools } from '../features/ai/tools/schemas';
import { executeToolLogic } from '../features/ai/tools/executor';
import { getStaticContext, getDynamicContext } from '../features/ai/contextBuilder';

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
  const [isDeepCoach, setIsDeepCoach] = useState(false);
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimits>(() => {
    try {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const stored = JSON.parse(localStorage.getItem('pulse_groq_usage') || '{}');
      if (stored.date === todayStr) {
        return {
          remainingTokens: Math.max(0, 100000 - (stored.tokens || 0)).toString(),
          remainingRequests: '--',
          resetTokens: null,
          resetRequests: null
        };
      }
    } catch(e) {}
    return {
      remainingTokens: null,
      remainingRequests: null,
      resetTokens: null,
      resetRequests: null
    };
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
    // Rate limits are now initialized synchronously in useState

    // Initialize semantic cache
    semanticCache.init().catch(e => console.warn("Semantic cache init failed:", e));
  }, []);

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

    // Fire hidden extraction asynchronously
    memoryEngine.processMessageAsync(text, apiKey).catch(() => {});

    // Helper to log token usage
    const trackUsage = (tokens: number) => {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let storedUsage = 0;
      try {
        const stored = JSON.parse(localStorage.getItem('pulse_groq_usage') || '{}');
        if (stored.date === todayStr) {
          storedUsage = stored.tokens || 0;
        }
      } catch(e) {}
      const newTotalUsage = storedUsage + tokens;
      localStorage.setItem('pulse_groq_usage', JSON.stringify({ date: todayStr, tokens: newTotalUsage }));
      const estimatedRemaining = Math.max(0, 100000 - newTotalUsage);
      setRateLimits(prev => ({
        ...prev,
        remainingTokens: estimatedRemaining.toString()
      }));
    };

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
      const dynamicContext = getDynamicContext(queryClient);
      const memoryContext = await memoryEngine.retrieveContext(text);

      // We maintain a conversation thread array for the API loop
      // Only include the most recent 4 messages to save tokens (Sliding Window)
      const apiMessages: any[] = [
        { role: 'system', content: staticContext },
        { role: 'system', content: `[CURRENT STATE & CONTEXT]\n${dynamicContext}` },
        ...(memoryContext ? [{ role: 'system', content: `[RELEVANT MEMORY]\n${memoryContext}` }] : []),
        ...messages.slice(-4).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: 'user', content: text }
      ];



      // -----------------------------------------------------------------
      // TWO-BRAIN PIPELINE: Deep Coach (70B thinks) → Action (8B executes)
      // -----------------------------------------------------------------
      if (isDeepCoach) {
        console.log('[AI Coach] Deep Coach mode — using llama-3.3-70b-versatile (no tools)');
        
        // Stage 1: 70B deep reasoning (no tools)
        const deepStream = await groq.chat.completions.create({
          messages: apiMessages,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 8000,
          stream: true,
          // @ts-ignore
          stream_options: { include_usage: true }
        });

        let deepResponse = '';
        let uiAdded = false;
        for await (const chunk of deepStream) {
          // @ts-ignore
          if (chunk.usage?.total_tokens) trackUsage(chunk.usage.total_tokens);
          const delta = chunk.choices[0]?.delta;
          if (!delta?.content) continue;
          deepResponse += delta.content;
          if (!uiAdded) {
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            uiAdded = true;
          }
          setMessages(prev => {
            const n = [...prev];
            n[n.length - 1].text = deepResponse;
            return n;
          });
        }

        // Stage 2: Hand off to 8B for tool execution detection
        console.log('[AI Coach] Checking if 70B response requires tool actions...');
        const handoffMessages: any[] = [
          { role: 'system', content: getStaticContext() },
          { role: 'system', content: `[CURRENT STATE & CONTEXT]\n${getDynamicContext(queryClient)}` },
          { role: 'user', content: text },
          { role: 'assistant', content: deepResponse },
          { role: 'user', content: 'Based on your coaching analysis above, execute any tool calls that are needed (e.g. create routines, sort workouts, update macros). If no action is needed, reply with exactly: NO_ACTION_NEEDED' }
        ];

        const actionStream = await groq.chat.completions.create({
          messages: handoffMessages,
          model: 'llama-3.1-8b-instant',
          temperature: 0.0,
          max_tokens: 8000,
          // @ts-ignore
          tools: aiTools,
          tool_choice: 'auto',
          stream: true,
          // @ts-ignore
          stream_options: { include_usage: true }
        });

        let actionToolCalls: any[] = [];
        let actionText = '';
        for await (const chunk of actionStream) {
          // @ts-ignore
          if (chunk.usage?.total_tokens) trackUsage(chunk.usage.total_tokens);
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!actionToolCalls[idx]) {
                actionToolCalls[idx] = { id: tc.id, type: 'function', function: { name: tc.function?.name || '', arguments: '' } };
              }
              if (tc.function?.arguments) actionToolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
          if (delta.content) actionText += delta.content;
        }

        actionToolCalls = actionToolCalls.filter(Boolean);
        if (actionToolCalls.length > 0) {
          console.log('[AI Coach] 8B executing tool handoff:', actionToolCalls.map((t: any) => t.function.name));
          for (const toolCall of actionToolCalls) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await executeToolLogic(toolCall.function.name, args, text, queryClient);
              // Append tool result to the deep coach message
              setMessages(prev => {
                const n = [...prev];
                n[n.length - 1].text += `\n\n---\n✅ **Action Taken:** \`${toolCall.function.name}\` → ${result}`;
                return n;
              });
            } catch (err: any) {
              setMessages(prev => {
                const n = [...prev];
                n[n.length - 1].text += `\n\n---\n❌ **Action Failed:** \`${toolCall.function.name}\` → ${err.message}`;
                return n;
              });
            }
          }
        } else {
          console.log('[AI Coach] No tool actions needed from 70B analysis.');
        }

        // Cache the deep response
        if (deepResponse) {
          semanticCache.set(text, deepResponse).catch(e => console.warn('Failed to set semantic cache:', e));
        }

        setIsTyping(false);
        return;
      }

      // Standard mode — single model with tools
      const modelName = 'llama-3.1-8b-instant';
      console.log(`[AI Coach] Using model: ${modelName}`);
      


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
          tools: aiTools,
          tool_choice: "auto",
          stream: true,
          // @ts-ignore
          stream_options: { include_usage: true }
        });

        let currentResponse = "";
        let currentReasoning = "";
        let toolCallsAcc: any[] = [];
        let inThinkTag = false;
        
        for await (const chunk of stream) {
           const delta = chunk.choices[0]?.delta;
           
           // @ts-ignore
           if ((chunk as any).usage && (chunk as any).usage.total_tokens) {
              const usage = (chunk as any).usage.total_tokens;
              const d = new Date();
              const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
               const toolResult = await executeToolLogic(toolCall.function.name, args, text, queryClient);
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

  const toggleDeepCoach = useCallback(() => setIsDeepCoach(prev => !prev), []);

  return { messages, isTyping, sendMessage, clearChat, requestTimestamps, rateLimits, transcribeAudio, isDeepCoach, toggleDeepCoach };
};
