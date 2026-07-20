import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAICoach } from '../hooks/useAICoach';

interface AICoachChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICoachChat = ({ isOpen, onClose }: AICoachChatProps) => {
  const [input, setInput] = useState('');
  const [usePro, setUsePro] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const { messages, isTyping, sendMessage, clearChat, requestTimestamps, rateLimits } = useAICoach();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setUsePro(localStorage.getItem('pulse_groq_use_pro') === 'true');
  }, []);

  const togglePro = () => {
    const next = !usePro;
    setUsePro(next);
    localStorage.setItem('pulse_groq_use_pro', String(next));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!isOpen) return null;

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
              <p className="text-xs text-rose-500 font-bold tracking-widest">POWERED BY GROQ</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-black px-3 py-1.5 rounded-full border border-[#222]">
              <span className={`text-[10px] font-bold ${!usePro ? 'text-rose-500' : 'text-gray-500'}`}>FAST (8B)</span>
              <button
                onClick={togglePro}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${usePro ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${usePro ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <span className={`text-[10px] font-bold ${usePro ? 'text-purple-500' : 'text-gray-500'}`}>PRO (70B)</span>
            </div>
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
                 <span className="text-gray-500">REMAINING TOKENS:</span>
                 <span className={`ml-1 ${!rateLimits?.remainingTokens ? 'text-yellow-500' : parseInt(rateLimits.remainingTokens) < 1000 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                   {rateLimits?.remainingTokens || 'WAITING FOR API...'}
                 </span>
              </div>
              <div>
                 <span className="text-gray-500">REQUESTS:</span>
                 <span className={`ml-1 ${!rateLimits?.remainingRequests ? 'text-yellow-500' : parseInt(rateLimits.remainingRequests) < 5 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                   {rateLimits?.remainingRequests || '--'}
                 </span>
              </div>
           </div>
           {rateLimits?.resetTokens && (
             <div className="text-gray-600">
               RESETS IN {Math.ceil(parseFloat(rateLimits.resetTokens))}s
             </div>
           )}
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
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {msg.role === 'model' && <Sparkles className="h-3 w-3 text-rose-500" />}
                <span className="text-[10px] font-bold text-gray-600 tracking-widest">
                  {msg.role === 'user' ? 'YOU' : 'COACH'}
                </span>
                {msg.role === 'user' && <User className="h-3 w-3 text-gray-600" />}
              </div>
              <div 
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-rose-600 text-white rounded-tr-sm' 
                    : 'bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] rounded-tl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
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
              {usePro ? 'PRO (70B)' : 'FAST (8B)'} QUOTA: {requestsLastMinute}/{limit}
            </span>
            {cooldownRemaining > 0 && (
              <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                COOLDOWN: {cooldownRemaining}s
              </span>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={cooldownRemaining > 0 ? "Cooling down..." : "Ask your coach anything..."}
              disabled={isTyping || cooldownRemaining > 0}
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
