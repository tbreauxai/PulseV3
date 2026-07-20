import React, { useMemo } from 'react';
import { Activity, TrendingDown, TrendingUp, Scale, Loader2 } from 'lucide-react';
import { useWeighIns } from '../hooks/useWeighIns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export const LifestyleProgress = () => {
  const { logs, isLoading } = useWeighIns();

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    
    // Reverse the logs so the oldest is first (for charting over time)
    return [...logs].reverse().map(log => {
      const parsedWeight = parseFloat(log.weight);
      return {
        date: log.date,
        weight: parsedWeight,
        fullDate: log.date // Could parse out year if we wanted to
      };
    });
  }, [logs]);

  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return { current: 0, start: 0, change: 0, highest: 0, lowest: 0 };
    
    const weights = chartData.map(d => d.weight);
    const start = weights[0];
    const current = weights[weights.length - 1];
    const change = current - start;
    const highest = Math.max(...weights);
    const lowest = Math.min(...weights);

    return {
      current,
      start,
      change,
      highest,
      lowest
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Body Progress</h2>
          <p className="text-emerald-500/80 font-medium text-sm mt-1">Weight Tracking</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Activity className="text-emerald-500 h-6 w-6" />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 text-center">
          <Scale className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Log a weigh-in to see your progress chart!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-gray-500 tracking-wider">CURRENT</span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white">{stats.current.toFixed(1)} <span className="text-sm font-normal text-gray-500">lbs</span></div>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div className="flex items-center space-x-2">
                {stats.change <= 0 ? (
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                )}
                <span className="text-[10px] font-bold text-gray-500 tracking-wider">NET CHANGE</span>
              </div>
              <div className="mt-4">
                <div className={`text-2xl font-bold ${stats.change <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} <span className="text-sm font-normal opacity-50">lbs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-gray-500 tracking-wider">WEIGHT TREND</h3>
              <span className="text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded">ALL TIME</span>
            </div>
            
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#333" 
                    tick={{ fill: '#666', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    domain={['dataMin - 2', 'dataMax + 2']} 
                    stroke="#333" 
                    tick={{ fill: '#666', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(0)}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    labelStyle={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(value: number) => [`${value.toFixed(1)} lbs`, 'Weight']}
                  />
                  <ReferenceLine y={stats.start} stroke="#333" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#0a0a0a', stroke: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#10b981', stroke: '#0a0a0a', strokeWidth: 2, r: 6 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4 divide-x divide-gray-800">
              <div className="text-center">
                <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">HIGHEST</div>
                <div className="text-lg font-bold text-white">{stats.highest.toFixed(1)} <span className="text-xs font-normal text-gray-500">lbs</span></div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">LOWEST</div>
                <div className="text-lg font-bold text-white">{stats.lowest.toFixed(1)} <span className="text-xs font-normal text-gray-500">lbs</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
