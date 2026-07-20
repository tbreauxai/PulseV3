import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('pulse_groq_key') || '';
      setApiKey(storedKey);
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('pulse_groq_key', apiKey.trim());
    } else {
      localStorage.removeItem('pulse_groq_key');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl relative"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">APP SETTINGS</h3>
              <p className="text-xs text-gray-400">Configure global app preferences.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-300">GROQ API KEY</label>
              <div className="flex items-center space-x-1 text-xs font-bold text-emerald-500">
                <ShieldCheck className="h-3 w-3" />
                <span>LOCAL ONLY</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Your API key is stored securely in your browser's local storage and is never sent to our servers. It is required to power the AI Personal Trainer features.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-2xl border border-[#222] bg-black px-4 py-3.5 text-white font-medium focus:outline-none focus:border-rose-600/50"
            />
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-4 rounded-2xl font-black tracking-widest flex items-center justify-center space-x-2 transition-all ${
              saved 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <span>{saved ? 'SAVED SUCCESSFULLY' : 'SAVE SETTINGS'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
