import { useState } from 'react';

export function usePersistentState(key, initialValue) {
  const [state, setInternalState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  const setState = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setInternalState(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [state, setState];
}
