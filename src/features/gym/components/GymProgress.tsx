import React, { useState, useCallback } from 'react';
import { Trophy, CalendarCheck, Activity, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { Virtuoso } from 'react-virtuoso';

const WorkoutRow = React.memo(({ workout, isExpanded, onToggle, onRemove }: any) => {
  const dateObj = new Date(workout.date);
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  
  return (
    <div className="pb-3">
      <div 
        onClick={() => onToggle(workout.id)}
        className="flex flex-col p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-emerald-500/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-white font-bold">{formattedDate}</h4>
              <p className="text-xs text-emerald-500/80 mt-0.5 font-medium">{workout.routineName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this workout log?')) {
                  onRemove(workout.id);
                }
              }}
              className="h-8 w-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-rose-600/10 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </div>
        </div>
        
        {isExpanded && workout.exerciseDetails && (
          <div className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-4">
            {workout.exerciseDetails.map((ex, i) => (
              <div key={i}>
                <h5 className="text-sm font-bold text-gray-300 mb-2">{ex.exerciseName}</h5>
                <div className="space-y-1.5">
                  {ex.sets.map((set, j) => (
                    <div key={j} className="flex justify-between items-center text-xs pl-3 border-l-2 border-[#333]">
                      <span className="text-gray-500 font-medium">Set {j + 1}</span>
                      <span className="text-white font-medium bg-black px-2 py-1 rounded-md border border-gray-800">
                        {ex.type === 'cardio' ? (
                          <>
                            {set.time ? <>{set.time} <span className="text-gray-500">mins</span></> : ''}
                            {set.time && set.distance ? ' × ' : ''}
                            {set.distance ? <>{set.distance} <span className="text-gray-500">mi</span></> : ''}
                          </>
                        ) : (
                          <>
                            {set.weight} <span className="text-gray-500">lbs</span> × {set.reps} <span className="text-gray-500">reps</span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export const GymProgress = () => {
  const { history, removeWorkout } = useWorkoutHistory();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const onRemove = useCallback((id) => {
    removeWorkout(id);
  }, [removeWorkout]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">Progress</h2>

      {/* Real History Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-500 tracking-wider">RECENT WORKOUTS</h3>
          <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">
            {history.length} LOGS
          </span>
        </div>
        
        <div>
          {history.length === 0 ? (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 text-center text-gray-500 text-sm">
              No workouts logged yet. Finish a routine on the Today view to see it here!
            </div>
          ) : (
            <Virtuoso
              useWindowScroll
              data={history}
              itemContent={(index, workout) => (
                <WorkoutRow 
                  workout={workout} 
                  isExpanded={expandedId === workout.id}
                  onToggle={toggleExpand}
                  onRemove={onRemove}
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Mock Analytics Section */}
      <h2 className="text-2xl font-bold text-white tracking-tight pt-4">Analytics</h2>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-gray-500 tracking-wider">VOLUME LOAD</h3>
          <span className="text-rose-600 text-xs font-bold bg-rose-600/10 px-2 py-1 rounded">PAST 7 DAYS</span>
        </div>
        
        <div className="flex items-end justify-between h-32 gap-2">
          {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
            <div key={i} className="w-full bg-gray-900 rounded-sm relative group hover:bg-rose-600/20 transition-colors cursor-pointer flex flex-col justify-end" style={{ height: '100%' }}>
              <div className="w-full bg-rose-600 rounded-sm transition-all duration-700 ease-out" style={{ height: `${height}%` }}></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-[10px] font-bold text-gray-600">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3">PERSONAL RECORDS</h3>
        <div className="space-y-3">
          {[
            { name: 'Bench Press', weight: '225 lbs', date: 'Oct 12' },
            { name: 'Squat', weight: '315 lbs', date: 'Oct 05' },
            { name: 'Deadlift', weight: '405 lbs', date: 'Sep 28' },
          ].map((pr, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-rose-600/10 rounded-lg flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-rose-600" />
                </div>
                <span className="text-white font-medium">{pr.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{pr.weight}</div>
                <div className="text-xs text-gray-500 mt-0.5">{pr.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
