import React, { useState } from 'react';
import { Sparkles, User, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  msg: {
    role: string;
    text?: string;
    reasoning?: string;
  };
}

export const ChatMessage = React.memo(({ msg }: ChatMessageProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div 
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
          <div className="flex flex-col space-y-4">
            {/* Reasoning Block */}
            {msg.reasoning && (
              <div className="border border-purple-900/50 bg-purple-950/10 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setIsExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between p-3 text-xs font-bold text-purple-400 hover:bg-purple-900/20 transition-colors"
                >
                  <div className="flex items-center">
                    <Brain className="h-3.5 w-3.5 mr-2" />
                    {msg.text ? "REASONING PROCESS" : "THINKING..."}
                  </div>
                  {!isExpanded ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3 pt-0"
                    >
                      <div className="prose prose-invert prose-sm max-w-none text-gray-400 italic text-xs border-t border-purple-900/30 pt-3">
                        <ReactMarkdown>{msg.reasoning}</ReactMarkdown>
                        {!msg.text && (
                          <span className="inline-block ml-1 w-1.5 h-3.5 bg-purple-500 animate-pulse align-middle"></span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Final Output */}
            {msg.text && (
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
