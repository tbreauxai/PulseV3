import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User, Dumbbell, Mic, Trash2, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAICoach } from '../hooks/useAICoach';
import { ChatMessage } from './ChatMessage';

interface AICoachChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICoachChat = ({ isOpen, onClose }: AICoachChatProps) => {
  const [input, setInput] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const { messages, isTyping, sendMessage, clearChat, requestTimestamps, rateLimits, transcribeAudio, isDeepCoach, toggleDeepCoach } = useAICoach();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const limit = 30; // Groq limit is 30 for both models on free tier
  const requestsLastMinute = requestTimestamps.filter(t => Date.now() - t < 60000).length;

  useEffect(() => {
    const interval = setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      const recentReqs = requestTimestamps.filter(t => t > oneMinuteAgo);
      if (recentReqs.length >= limit) {
        // Assume chronologically ordered
        const oldestRecent = recentReqs[0];
        const timeUntilUnlock = Math.ceil((oldestRecent + 60000 - Date.now()) / 1000);
        setCooldownRemaining(timeUntilUnlock > 0 ? timeUntilUnlock : 0);
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [requestTimestamps, limit]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          const text = await transcribeAudio(audioBlob);
          const cleaned = text.trim();
          const lower = cleaned.toLowerCase();
          
          // Ignore known Whisper hallucinations for empty/short audio
          const isHallucination = 
            lower === 'thank you.' || 
            lower === 'thank you' || 
            lower === 'thanks for watching.' ||
            lower === 'thanks for watching' ||
            lower === 'bye.' ||
            lower === 'bye' ||
            lower.length < 2;

          if (cleaned && !isHallucination) {
            sendMessage(cleaned);
          }
        } catch(e) {
          console.error(e);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full h-[90vh] sm:h-[80vh] sm:max-w-2xl bg-[#0a0a0a] border border-[#222] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222] bg-[#111]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">AI COACH</h3>
              <p className={`text-xs font-bold tracking-widest ${isDeepCoach ? 'text-purple-400' : 'text-rose-500'}`}>
                {isDeepCoach ? '🧠 DEEP COACH MODE' : 'POWERED BY GROQ'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleDeepCoach}
              title={isDeepCoach ? 'Switch to Action Mode (fast, tools)' : 'Switch to Deep Coach Mode (smarter, deeper analysis)'}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDeepCoach 
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]' 
                  : 'bg-gray-900 text-gray-500 hover:text-purple-400 hover:bg-gray-800'
              }`}
            >
              <Brain className="h-5 w-5" />
            </button>

            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Token Tracker */}
        <div className="bg-[#111] border-b border-[#222] px-4 py-2 flex items-center justify-between text-[10px] font-bold tracking-wider">
           <div className="flex items-center space-x-4">
              <div>
                 <span className="text-gray-500">ESTIMATED DAILY TOKENS REMAINING:</span>
                 <span className={`ml-2 ${!rateLimits?.remainingTokens ? 'text-yellow-500' : parseInt(rateLimits.remainingTokens) < 10000 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                   {rateLimits?.remainingTokens ? parseInt(rateLimits.remainingTokens).toLocaleString() : '100,000'}
                 </span>
              </div>
           </div>
           <div className="flex items-center space-x-4">
             <span className="text-gray-600">RESETS AT MIDNIGHT</span>
             <button 
               onClick={clearChat}
               className="text-gray-500 hover:text-rose-500 flex items-center transition-colors"
               title="Clear Chat History (Resets AI Context)"
             >
               <Trash2 className="h-3 w-3 mr-1" />
               CLEAR
             </button>
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-gray-500 opacity-50">
              <Dumbbell className="h-12 w-12" />
              <p className="text-sm font-bold tracking-widest">READY TO TRAIN. WHAT'S THE GOAL?</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} msg={msg} />
          ))}

          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="h-3 w-3 text-rose-500" />
                <span className="text-[10px] font-bold text-gray-600 tracking-widest">COACH</span>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#111] border-t border-[#222]">
          {messages.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {['Suggest a quick workout', 'Analyze my week', 'Adjust my macros'].map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  disabled={isTyping}
                  className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs font-bold text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
              <button
                onClick={clearChat}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-rose-950/30 text-rose-500 border border-rose-900/50 text-xs font-bold hover:bg-rose-900/50 transition-colors"
              >
                Clear Chat
              </button>
            </div>
          )}
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-[10px] text-gray-500 font-bold tracking-wider">
              ROUTER QUOTA: {requestsLastMinute}/{limit}
            </span>
            {cooldownRemaining > 0 && (
              <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                COOLDOWN: {cooldownRemaining}s
              </span>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex space-x-2 select-none">
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isTyping || cooldownRemaining > 0}
              title="Hold to talk"
              className={`h-auto px-5 rounded-2xl flex items-center justify-center transition-colors select-none ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
              } disabled:opacity-50`}
            >
              <Mic className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : cooldownRemaining > 0 ? "Cooling down..." : "Ask your coach anything..."}
              disabled={isTyping || cooldownRemaining > 0 || isRecording}
              className="flex-1 bg-black border border-[#222] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-rose-600/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping || cooldownRemaining > 0}
              className="h-auto px-6 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 transition-colors flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
