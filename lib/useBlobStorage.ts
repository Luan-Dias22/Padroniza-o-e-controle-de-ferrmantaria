import { useState, useEffect } from 'react';

export function useBlobStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFromBlob() {
      try {
        const response = await fetch(`/api/storage?key=${key}`);
        if (response.ok) {
          const { data } = await response.json();
          if (data && isMounted) {
            setStoredValue(data);
            window.localStorage.setItem(key, JSON.stringify(data));
            return;
          }
        }
      } catch (error) {
        console.warn(`Error reading blob key "${key}":`, error);
      }
      
      // Fallback to localStorage if blob fails or returns no data
      if (isMounted) {
        try {
          const item = window.localStorage.getItem(key);
          if (item) {
            setStoredValue(JSON.parse(item));
          } else {
            window.localStorage.setItem(key, JSON.stringify(initialValue));
          }
        } catch (e) {
          console.warn(`Error reading localStorage key "${key}":`, e);
        }
      }
    }

    loadFromBlob().finally(() => {
      if (isMounted) {
        setIsInitialized(true);
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // Save to localStorage immediately for optimistic UI
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      
      // Save to blob storage
      await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data: valueToStore }),
      });
    } catch (error) {
      console.warn(`Error setting blob key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isInitialized] as const;
}
