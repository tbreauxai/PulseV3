import { useState, useEffect } from 'react';
import { initialRoutines } from '../data/routines';

export const useRoutines = () => {
  const [routines, setRoutines] = useState(() => {
    try {
      const item = window.localStorage.getItem('pulseV3-routines');
      return item ? JSON.parse(item) : initialRoutines;
    } catch (error) {
      console.warn('Error reading localStorage for routines', error);
      return initialRoutines;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('pulseV3-routines', JSON.stringify(routines));
    } catch (error) {
      console.warn('Error setting localStorage for routines', error);
    }
  }, [routines]);

  const addRoutine = (routine) => {
    setRoutines([...routines, { ...routine, id: String(Date.now()) }]);
  };

  const updateRoutine = (id, updatedRoutine) => {
    setRoutines(routines.map(r => String(r.id) === String(id) ? { ...r, ...updatedRoutine } : r));
  };

  const removeRoutine = (id) => {
    setRoutines(routines.filter(r => String(r.id) !== String(id)));
  };

  return {
    routines,
    addRoutine,
    updateRoutine,
    removeRoutine
  };
};
