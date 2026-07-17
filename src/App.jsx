import React, { useState } from 'react';
import { GymView } from './views/GymView';
import { LifestyleView } from './views/LifestyleView';

export default function App() {
  const [activeTab, setActiveTab] = useState('gym');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-gray-800">
      <nav className="fixed top-0 w-full flex bg-black/90 backdrop-blur-lg z-50 border-b border-gray-900">
        <button
          onClick={() => setActiveTab('gym')}
          className={`flex-1 py-5 text-center font-black tracking-widest text-sm transition-all duration-300 relative ${
            activeTab === 'gym'
              ? 'text-rose-600'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          GYM
          {activeTab === 'gym' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]"></div>
          )}
        </button>
        
        <div className="w-px bg-gray-900 my-4"></div>
        
        <button
          onClick={() => setActiveTab('lifestyle')}
          className={`flex-1 py-5 text-center font-black tracking-widest text-sm transition-all duration-300 relative ${
            activeTab === 'lifestyle'
              ? 'text-emerald-500'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          LIFESTYLE
          {activeTab === 'lifestyle' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          )}
        </button>
      </nav>

      <main className="pt-24 px-6 max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center">
            PULSE
            <span className={`ml-1 transition-colors duration-500 ${activeTab === 'gym' ? 'text-rose-600' : 'text-emerald-500'}`}>
              V3
            </span>
          </h1>
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'gym' ? <GymView /> : <LifestyleView />}
        </div>
      </main>
    </div>
  );
}
