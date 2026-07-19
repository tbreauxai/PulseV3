import React, { useState, useRef } from 'react';
import { Activity, Dumbbell, Plus, ChevronDown, ChevronRight, RefreshCw, Trash2, Check } from 'lucide-react';
import { useAlert } from '../../../contexts/AlertContext';
import { motion } from 'framer-motion';

const getMuscleStrings = (mg: string) => {
  if (!mg) return { pStr: '', sStr: '' };
  if (mg.includes('|')) {
    const parts = mg.split('|');
    return { pStr: parts[0].trim(), sStr: parts[1].trim() };
  }
  const parts = mg.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (parts.length > 0) {
    return { pStr: parts[0], sStr: parts.slice(1).join(', ') };
  }
  return { pStr: '', sStr: '' };
};

export const ActiveExerciseCard = React.memo(({ exercise, exerciseIndex, sessionSets, progression, onAddSet, onUpdateSet, onToggleComplete, onRemoveSet, onSwap, onCompleteExercise, onSkipExercise }: any) => {
  const { confirm } = useAlert();
  const [isExpanded, setIsExpanded] = useState(false);
  const { pStr, sStr } = getMuscleStrings(exercise.muscleGroup);
  const sets = sessionSets || [];
  const hasCompletedSet = sets.some((set: any) => set.completed);

  // Swipe logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleStart = (clientX) => {
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    const deltaX = clientX - startX.current;
    if (deltaX < 0) { // Only swipe left
      setSwipeOffset(Math.max(deltaX, -100)); // Max drag visual 100px
    } else if (deltaX > 0 && swipeOffset < 0) {
      setSwipeOffset(Math.min(0, -80 + deltaX)); // Allow dragging back if open
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (swipeOffset < -40) {
      setSwipeOffset(-80); // Snap open to reveal Swap button
    } else {
      setSwipeOffset(0); // Snap closed
    }
  };

  const onTouchStart = e => handleStart(e.touches[0].clientX);
  const onTouchMove = e => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  const onMouseDown = e => handleStart(e.clientX);
  const onMouseMove = e => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { if(isDragging) handleEnd() };

  const handleHeaderClick = (e) => {
    if (Math.abs(swipeOffset) > 10) return; // Prevent click if we were swiping
    if (swipeOffset === -80) {
      setSwipeOffset(0); // Clicking while open closes it
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (!isExpanded) setIsExpanded(true);
    onAddSet(exerciseIndex, exercise.exerciseName || exercise.name);
  };

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Hidden Action Button */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end w-20 pr-4 bg-rose-600 rounded-xl">
        <button 
          onClick={() => {
            setSwipeOffset(0);
            onSwap(exerciseIndex);
          }} 
          className="text-white font-bold text-xs flex flex-col items-center hover:scale-110 transition-transform active:scale-95"
        >
          <RefreshCw className="h-5 w-5 mb-1" />
          SWAP
        </button>
      </div>

      {/* Main Card Content */}
      <div 
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`relative ${hasCompletedSet ? 'bg-[#022c22] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-[#0a0a0a] border-[#1a1a1a]'} border rounded-xl overflow-hidden transition-transform ${isDragging ? 'duration-0' : 'duration-300'}`}
      >
        {/* Card Header (Swipeable and Clickable) */}
        <div 
          onClick={handleHeaderClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group select-none"
        >
          <div className="flex items-center space-x-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${exercise.type === 'cardio' ? 'bg-emerald-900 group-hover:bg-emerald-800' : 'bg-gray-900 group-hover:bg-rose-600/10'}`}>
              {exercise.type === 'cardio' ? (
                <Activity className="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" />
              ) : (
                <Dumbbell className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
              )}
            </div>
            <div>
              <h4 className="text-white font-medium line-clamp-1 flex items-center flex-wrap gap-1.5">
                {exercise.exerciseName || exercise.name}
              </h4>
              
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium flex-wrap">
                <span className="text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded tracking-wide border border-gray-700/50">
                  {exercise.type === 'cardio'
                    ? `${sets[0]?.time || '-'} mins • ${sets[0]?.distance || '-'} mi`
                    : `${sets[0]?.weight || '-'} lbs • ${sets[0]?.reps || '-'} reps`}
                </span>
                
                {pStr && (
                  <span className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded tracking-wide border border-rose-500/20">
                    P: {pStr}
                  </span>
                )}
                {sStr && (
                  <span className="text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded tracking-wide border border-gray-700/50">
                    S: {sStr}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0 pl-2">
            <button 
              onClick={handleQuickAdd}
              className="h-8 w-8 rounded-full bg-rose-600/10 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-700" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-700 group-hover:text-rose-600 transition-colors" />
            )}
          </div>
        </div>

        {/* Expanded Sets List */}
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-[#1a1a1a] bg-black/20">
            {sets.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No sets logged yet.
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                <div className="flex text-xs font-bold text-gray-600 px-2 pb-1 space-x-2">
                  <div className="w-10 text-center">SET</div>
                  {exercise.type === 'timed' ? (
                    <div className="flex-1 text-center">DURATION (SEC)</div>
                  ) : (
                    <>
                      <div className="flex-1 text-center">{exercise.type === 'cardio' ? 'TIME (MIN)' : 'WEIGHT (LBS)'}</div>
                      <div className="flex-1 text-center">{exercise.type === 'cardio' ? 'CALORIES' : 'REPS'}</div>
                      {exercise.type === 'cardio' && <div className="flex-1 text-center">DIST (MI)</div>}
                    </>
                  )}
                  <div className="w-20"></div>
                </div>
                
                {sets.map((set, idx) => {
                  const currentReps = parseInt(set.reps) || 0;
                  const currentWeight = parseFloat(set.weight) || 0;
                  
                  const isRepBumpDue = progression?.needsRepBump;
                  const isWeightBumpDue = progression?.needsWeightBump;
                  const targetWeight = progression?.historicalWeight || 0;
                  
                  const isRepsRed = isRepBumpDue && (currentReps === 8 || currentReps === 10 || currentReps === 0);
                  const isWeightRed = isWeightBumpDue && (currentWeight <= targetWeight || currentReps !== 8);

                  return (
                  <div 
                    key={idx} 
                    className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${set.completed ? 'bg-emerald-900/20 border border-emerald-900/30' : 'bg-gray-900'}`}
                  >
                    <div className="w-10 text-center font-bold text-gray-400 text-sm">
                      {idx + 1}
                    </div>
                    {exercise.type === 'timed' ? (
                      <input 
                        type="number"
                        placeholder="60"
                        value={set.time || ''}
                        onChange={(e) => onUpdateSet(exerciseIndex, idx, 'time', e.target.value)}
                        className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                      />
                    ) : (
                      <>
                        <input 
                          type={exercise.type === 'cardio' ? 'number' : 'number'}
                          placeholder="--"
                          value={exercise.type === 'cardio' ? set.time : set.weight}
                          onChange={(e) => onUpdateSet(exerciseIndex, idx, exercise.type === 'cardio' ? 'time' : 'weight', e.target.value)}
                          className={`flex-1 min-w-0 bg-black border ${isWeightRed && exercise.type !== 'cardio' ? 'border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-gray-800 text-white'} rounded-md py-2 text-center font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700`}
                        />
                        {exercise.type === 'cardio' ? (
                          <input 
                            type="number"
                            placeholder="--"
                            value={set.calories}
                            onChange={(e) => onUpdateSet(exerciseIndex, idx, 'calories', e.target.value)}
                            className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                          />
                        ) : (
                          <select
                            value={set.reps || ""}
                            onChange={(e) => onUpdateSet(exerciseIndex, idx, 'reps', e.target.value)}
                            className={`flex-1 min-w-0 bg-black border ${isRepsRed ? 'border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-gray-800 text-white'} rounded-md py-2 text-center [text-align-last:center] appearance-none font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all`}
                          >
                            <option value="">--</option>
                            <option value="8">8</option>
                            <option value="10">10</option>
                            <option value="12">12</option>
                          </select>
                        )}
                        {exercise.type === 'cardio' && (
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="--"
                            value={set.distance}
                            onChange={(e) => onUpdateSet(exerciseIndex, idx, 'distance', e.target.value)}
                            className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                          />
                        )}
                      </>
                    )}
                    <div className="w-20 flex space-x-1 justify-end shrink-0">
                      <button 
                        onClick={() => onRemoveSet(exerciseIndex, idx)}
                        className="w-9 h-9 rounded-md flex items-center justify-center bg-gray-800/80 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onToggleComplete(exerciseIndex, idx, exercise.exerciseName || exercise.name)}
                        className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                          set.completed 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
            
            <button 
              onClick={() => onAddSet(exerciseIndex, exercise.exerciseName || exercise.name)}
              className="w-full mt-4 py-3 rounded-lg border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SET</span>
            </button>

            <div className="flex space-x-2 mt-3">
              <button 
                onClick={async () => {
                  if (await confirm('Skip this exercise for today?')) {
                    onSkipExercise();
                  }
                }}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-500 hover:text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm border border-gray-800"
              >
                <Trash2 className="h-4 w-4" />
                <span>SKIP</span>
              </button>

              <button 
                onClick={onCompleteExercise}
                className="flex-[2] bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <Check className="h-4 w-4" />
                <span>COMPLETE</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
