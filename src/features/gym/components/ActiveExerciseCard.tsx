import React, { useState, useRef } from 'react';
import { Activity, Dumbbell, Plus, ChevronDown, ChevronRight, RefreshCw, Trash2, Check } from 'lucide-react';

export const ActiveExerciseCard = React.memo(({ exercise, exerciseIndex, sessionSets, onAddSet, onUpdateSet, onToggleComplete, onRemoveSet, onSwap }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sets = sessionSets || [];

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
        className={`relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden transition-transform ${isDragging ? 'duration-0' : 'duration-300'}`}
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
              <h4 className="text-white font-medium line-clamp-1">{exercise.exerciseName || exercise.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Target: {exercise.type === 'cardio' 
                  ? `${exercise.time || '-'} mins • ${exercise.distance || '-'} mi`
                  : `${exercise.sets || '-'} Sets • ${exercise.reps || '-'}`}
              </p>
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
                <div className="flex text-xs font-bold text-gray-600 px-2 pb-1">
                  <div className="w-10 text-center">SET</div>
                  <div className="flex-1 text-center">LBS</div>
                  <div className="flex-1 text-center">REPS</div>
                  <div className="w-20"></div>
                </div>
                
                {sets.map((set, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${set.completed ? 'bg-emerald-900/20 border border-emerald-900/30' : 'bg-gray-900'}`}
                  >
                    <div className="w-10 text-center font-bold text-gray-400 text-sm">
                      {idx + 1}
                    </div>
                    <input 
                      type="number" 
                      placeholder="--"
                      value={set.weight}
                      onChange={(e) => onUpdateSet(exerciseIndex, idx, 'weight', e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                    />
                    <input 
                      type="number" 
                      placeholder="--"
                      value={set.reps}
                      onChange={(e) => onUpdateSet(exerciseIndex, idx, 'reps', e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-gray-800 rounded-md py-2 text-center text-white font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all placeholder:text-gray-700"
                    />
                    <div className="w-20 flex space-x-1 justify-end">
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
                ))}
              </div>
            )}
            
            <button 
              onClick={() => onAddSet(exerciseIndex, exercise.exerciseName || exercise.name)}
              className="w-full mt-4 py-3 rounded-lg border border-dashed border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SET</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
