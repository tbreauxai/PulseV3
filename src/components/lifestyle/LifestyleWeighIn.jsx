import React, { useState, useEffect } from 'react';
import { Scale, Minus, Plus } from 'lucide-react';

const initialLogs = [
  { date: "Oct 26", weight: "175.4 lbs", diff: "+0.2" },
  { date: "Oct 25", weight: "175.2 lbs", diff: "-0.5" },
  { date: "Oct 24", weight: "175.7 lbs", diff: "+0.1" },
];

export const LifestyleWeighIn = () => {
  const [weight, setWeight] = useState(() => {
    const saved = localStorage.getItem('pulseV3-weight');
    return saved ? JSON.parse(saved) : 175.4;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('pulseV3-weighInLogs');
    return saved ? JSON.parse(saved) : initialLogs;
  });

  useEffect(() => {
    localStorage.setItem('pulseV3-weight', JSON.stringify(weight));
  }, [weight]);

  useEffect(() => {
    localStorage.setItem('pulseV3-weighInLogs', JSON.stringify(logs));
  }, [logs]);

  const handleLogWeight = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const existingLogIndex = logs.findIndex(log => log.date === todayStr);

    const lastWeight = (existingLogIndex === 0 && logs.length > 1)
        ? parseFloat(logs[1].weight)
        : (logs.length > 0 ? parseFloat(logs[0].weight) : weight);

    const diff = weight - lastWeight;
    const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;

    const newLogEntry = {
        date: todayStr,
        weight: `${weight.toFixed(1)} lbs`,
        diff: diffStr,
    };

    let newLogs;
    if (existingLogIndex !== -1) {
        // Update today's log if it exists
        newLogs = [...logs];
        newLogs[existingLogIndex] = newLogEntry;
    } else {
        // Add a new log for today
        newLogs = [newLogEntry, ...logs];
    }
    setLogs(newLogs.slice(0, 10));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Body Mass</h2>
          <p className="text-emerald-500/80 font-medium text-sm mt-1">Goal: 185.0 lbs</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Scale className="text-emerald-500 h-6 w-6" />
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 text-center">
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-6">TODAY's WEIGHT</h3>
        
        <div className="flex items-center justify-center space-x-6 mb-8">
          <button 
            onClick={() => setWeight(w => +(w - 0.1).toFixed(1))}
            className="h-12 w-12 rounded-full bg-gray-900 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center text-emerald-500"
          >
            <Minus className="h-5 w-5" />
          </button>
          
          <div className="flex items-baseline space-x-1 w-32 justify-center">
            <span className="text-5xl font-black text-white">{weight.toFixed(1)}</span>
            <span className="text-lg text-emerald-500 font-bold">lbs</span>
          </div>

          <button 
            onClick={() => setWeight(w => +(w + 0.1).toFixed(1))}
            className="h-12 w-12 rounded-full bg-gray-900 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center text-emerald-500"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <button onClick={handleLogWeight} className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          LOG WEIGHT
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">RECENT LOGS</h3>
        <div className="space-y-3">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
              <span className="text-white font-medium">{log.date}</span>
              <div className="flex items-center space-x-3">
                <span className="text-white font-bold">{log.weight}</span>
                <span className={`text-xs font-bold w-12 text-right ${log.diff.startsWith('+') ? 'text-emerald-500' : 'text-gray-500'}`}>
                  {log.diff}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
