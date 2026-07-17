import { useState, useEffect } from 'react';

export const useWorkoutHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = window.localStorage.getItem('pulseV3-workoutHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('pulseV3-workoutHistory', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  const addWorkout = (workout) => {
    setHistory(prev => [workout, ...prev]);
  };

  const removeWorkout = (id) => {
    setHistory(prev => prev.filter(w => w.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return { history, addWorkout, removeWorkout, clearHistory };
};
