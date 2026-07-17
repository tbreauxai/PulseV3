import React, { useState, useEffect, useCallback } from 'react';
import { Scale, Minus, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePersistentState } from '../../hooks/usePersistentState';
import { Virtuoso } from 'react-virtuoso';

const WeighInRow = React.memo(({ log, index, isEditing, editWeight, onEditWeightChange, onSave, onCancel, onDelete, onStartEdit }) => {
  return (
    <div className="pb-3">
      <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
        <span className="text-white font-medium">{log.date}</span>
        
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.1"
              value={editWeight}
              onChange={(e) => onEditWeightChange(e.target.value)}
              className="w-20 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-right outline-none focus:border-emerald-500"
              autoFocus
            />
            <button onClick={() => onSave(index)} className="text-emerald-500 p-1.5 hover:bg-emerald-500/20 rounded transition-colors">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={onCancel} className="text-gray-500 p-1.5 hover:bg-gray-800 rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(log.id, index)} className="text-red-500 p-1.5 hover:bg-red-500/20 rounded transition-colors ml-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center space-x-3 group cursor-pointer"
            onClick={() => onStartEdit(log.id, log.weight)}
          >
            <span className="text-white font-bold">{log.weight}</span>
            <span className={`text-xs font-bold w-12 text-right ${log.diff.startsWith('+') ? 'text-emerald-500' : 'text-gray-500'}`}>
              {log.diff}
            </span>
            <Pencil className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  );
});

export const LifestyleWeighIn = () => {
  const [weight, setWeight] = usePersistentState('pulse_weight', 175.4);
  const [logs, setLogs] = usePersistentState('pulse_weigh_logs', []);
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState('');

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
      } else {
        setLogs([]);
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

    // --- OPTIMISTIC UPDATE ---
    const newLogEntry = {
      id: existingLogIndex !== -1 ? logs[existingLogIndex].id : `temp-${Date.now()}`,
      date: todayStr,
      weight: `${weight.toFixed(1)} lbs`,
      diff: diffStr
    };

    let previousLogs = [...logs];
    if (existingLogIndex !== -1) {
      setLogs(logs.map((log, i) => i === existingLogIndex ? newLogEntry : log));
    } else {
      setLogs([newLogEntry, ...logs]);
    }

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
        const { data, error } = await supabase
          .from('weigh_ins')
          .insert([dbEntry])
          .select();
          
        if (error) throw error;
        
        // Swap temp ID with real ID silently
        if (data && data[0]) {
          setLogs(currentLogs => currentLogs.map(log => log.id === newLogEntry.id ? { ...log, id: data[0].id } : log));
        }
      }
    } catch (e) {
      console.error('Error logging weight:', e);
      alert('Error logging weight. Reverting changes.');
      setLogs(previousLogs);
    }
  };

  const handleEditSave = async (index) => {
    const log = logs[index];
    const newWeight = parseFloat(editWeight);
    if (isNaN(newWeight)) return;

    // --- OPTIMISTIC UPDATE ---
    let diffStr = log.diff;
    if (index < logs.length - 1) {
      const prevWeight = parseFloat(logs[index + 1].weight);
      const diff = newWeight - prevWeight;
      diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;
    }

    const previousLogs = [...logs];
    const updatedLogs = [...logs];
    updatedLogs[index] = { ...log, weight: `${newWeight.toFixed(1)} lbs`, diff: diffStr };
    
    let nextLogToUpdate = null;
    if (index > 0) {
      nextLogToUpdate = { ...logs[index - 1] };
      const nextWeight = parseFloat(nextLogToUpdate.weight);
      const nextDiff = nextWeight - newWeight;
      nextLogToUpdate.diff = `${nextDiff >= 0 ? '+' : ''}${nextDiff.toFixed(1)}`;
      updatedLogs[index - 1] = nextLogToUpdate;
    }

    setLogs(updatedLogs);
    setEditingId(null);
    if (index === 0) setWeight(newWeight);

    // --- DB SYNC ---
    try {
      await supabase.from('weigh_ins').update({ weight_lbs: newWeight, diff_str: diffStr }).eq('id', log.id);
      
      if (index > 0 && nextLogToUpdate) {
        await supabase.from('weigh_ins').update({ diff_str: nextLogToUpdate.diff }).eq('id', nextLogToUpdate.id);
      }
    } catch (e) {
      console.error('Error updating log:', e);
      alert('Error updating log. Reverting changes.');
      setLogs(previousLogs);
    }
  };

  const handleDeleteLog = async (id, index) => {
    if (!window.confirm('Delete this weigh-in?')) return;
    
    // --- OPTIMISTIC UPDATE ---
    const previousLogs = [...logs];
    const updatedLogs = logs.filter(log => log.id !== id);

    let nextLogToUpdate = null;
    if (index > 0 && index < logs.length - 1) {
      const nextLog = logs[index - 1];
      const prevLog = logs[index + 1];
      const nextWeight = parseFloat(nextLog.weight);
      const prevWeight = parseFloat(prevLog.weight);
      const nextDiff = nextWeight - prevWeight;
      
      nextLogToUpdate = { ...nextLog, diff: `${nextDiff >= 0 ? '+' : ''}${nextDiff.toFixed(1)}` };
      updatedLogs[index - 1] = nextLogToUpdate;
    }

    setLogs(updatedLogs);
    setEditingId(null);
    if (index === 0 && updatedLogs.length > 0) {
        setWeight(parseFloat(updatedLogs[0].weight));
    } else if (updatedLogs.length === 0) {
        // If they delete all logs, let's keep the current weight as is.
    }

    // --- DB SYNC ---
    try {
      await supabase.from('weigh_ins').delete().eq('id', id);
      
      if (nextLogToUpdate) {
        await supabase.from('weigh_ins').update({ diff_str: nextLogToUpdate.diff }).eq('id', nextLogToUpdate.id);
      }
    } catch (e) {
      console.error('Error deleting log:', e);
      alert('Error deleting log. Reverting changes.');
      setLogs(previousLogs);
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
        <div>
          {logs.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center py-4">No weigh-ins logged yet.</p>
          )}
          {logs.length > 0 && (
            <Virtuoso
              useWindowScroll
              data={logs}
              itemContent={(i, log) => {
                // Using inline functions here breaks memoization slightly, but is required for complex state interactions without massive hook refactors
                return (
                  <WeighInRow 
                    log={log}
                    index={i}
                    isEditing={editingId === log.id}
                    editWeight={editWeight}
                    onEditWeightChange={setEditWeight}
                    onSave={(index) => handleEditSave(index)}
                    onCancel={() => setEditingId(null)}
                    onDelete={(id, idx) => handleDeleteLog(id, idx)}
                    onStartEdit={(id, w) => {
                      setEditingId(id);
                      setEditWeight(parseFloat(w).toString());
                    }}
                  />
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

