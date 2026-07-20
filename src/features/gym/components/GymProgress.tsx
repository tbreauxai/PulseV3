import React, { useState, useCallback } from 'react';
import { Trophy, CalendarCheck, Activity, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useAlert } from '../../../contexts/AlertContext';
import { Virtuoso } from 'react-virtuoso';

const WorkoutRow = React.memo(({ workout, isExpanded, onToggle, onRemove, onRemoveExercise }: any) => {
  const { confirm } = useAlert();
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
              onClick={async (e) => {
                e.stopPropagation();
                if (await confirm('Are you sure you want to delete this workout log?')) {
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
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-bold text-gray-300">{ex.exerciseName}</h5>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirm(`Delete ${ex.exerciseName} from this log?`)) {
                        onRemoveExercise(workout.id, i);
                      }
                    }}
                    className="h-6 w-6 rounded flex items-center justify-center text-gray-600 hover:bg-rose-600/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
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
  const { history, removeWorkout, removeWorkoutExercise } = useWorkoutHistory();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const onRemove = useCallback((id) => {
    removeWorkout(id);
  }, [removeWorkout]);

  const onRemoveExercise = useCallback((workoutId, exerciseIndex) => {
    removeWorkoutExercise({ workoutId, exerciseIndex }).catch(console.error);
  }, [removeWorkoutExercise]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Progress</h2>
        <span className="text-[10px] text-gray-800">
          DEBUG: len={history.length} {history.length > 0 ? `| first=${new Date(history[0]?.date).toLocaleDateString()} | id=${history[0]?.id}` : ''}
        </span>
      </div>

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
                  onRemoveExercise={onRemoveExercise}
                />
              )}
            />
          )}
        </div>
      </div>


    </div>
  );
};
