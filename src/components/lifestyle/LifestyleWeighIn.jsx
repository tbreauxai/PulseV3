import React, { useState, useEffect } from 'react';
import { Scale, Minus, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const LifestyleWeighIn = () => {
  const [weight, setWeight] = useState(175.4);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeighIns();
  }, []);

  const fetchWeighIns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weigh_ins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setWeight(parseFloat(data[0].weight_lbs));
        const formattedLogs = data.map(row => ({
          id: row.id,
          date: row.date,
          weight: `${row.weight_lbs} lbs`,
          diff: row.diff_str
        }));
        setLogs(formattedLogs);
      }
    } catch (e) {
      console.error('Error fetching weigh-ins:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWeight = async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const existingLogIndex = logs.findIndex(log => log.date === todayStr);

    const lastWeight = (existingLogIndex === 0 && logs.length > 1)
        ? parseFloat(logs[1].weight)
        : (logs.length > 0 ? parseFloat(logs[0].weight) : weight);

    const diff = weight - lastWeight;
    const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;

    try {
      const dbEntry = {
        date: todayStr,
        weight_lbs: weight,
        diff_str: diffStr
      };

      if (existingLogIndex !== -1) {
        // Update today's existing log
        const { error } = await supabase
          .from('weigh_ins')
          .update(dbEntry)
          .eq('id', logs[existingLogIndex].id);
          
        if (error) throw error;
      } else {
        // Insert new log
        const { error } = await supabase
          .from('weigh_ins')
          .insert([dbEntry]);
          
        if (error) throw error;
      }

      // Re-fetch to get the exact state from DB
      fetchWeighIns();
    } catch (e) {
      console.error('Error logging weight:', e);
      alert('Error logging weight: ' + e.message);
    }
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

        <button 
          onClick={handleLogWeight} 
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 transition-all text-black font-bold py-4 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          {loading ? 'SYNCING...' : 'LOG WEIGHT'}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">RECENT LOGS</h3>
        <div className="space-y-3">
          {logs.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center py-4">No weigh-ins logged yet.</p>
          )}
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
