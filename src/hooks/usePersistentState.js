import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';

export function usePersistentState(key, initialValue) {
  const [state, setInternalState] = useState(
    typeof initialValue === 'function' ? initialValue() : initialValue
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const item = await get(key);
        if (item !== undefined && item !== null) {
          setInternalState(item);
        }
      } catch (error) {
        console.error(`Error reading indexedDB key "${key}":`, error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, [key]);

  const setState = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setInternalState(valueToStore);
      set(key, valueToStore).catch(error => {
        console.error(`Error writing indexedDB key "${key}":`, error);
      });
    } catch (error) {
      console.error(`Error setting indexedDB key "${key}":`, error);
    }
  };

  return [state, setState, isLoaded];
}
