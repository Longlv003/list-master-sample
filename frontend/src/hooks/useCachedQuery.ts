import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCacheGeneration, getQueryEntry, refreshQuery, tabState } from '../services/queryCache';

export function useCachedQuery<T>(key: string, load: () => Promise<T>, onError?: (error: Error) => void) {
  const loader = useRef(load);
  const errorHandler = useRef(onError);
  loader.current = load;
  errorHandler.current = onError;
  const generation = getCacheGeneration();
  const subscribe = useCallback((listener: () => void) => {
    const entry = getQueryEntry<T>(key);
    entry.listeners.add(listener);
    return () => { entry.listeners.delete(listener); };
  }, [key, generation]);
  const snapshot = useCallback(() => getQueryEntry<T>(key).snapshot, [key, generation]);
  const result = useSyncExternalStore(subscribe, snapshot);
  const refresh = useCallback(() => refreshQuery(key, loader.current, (error) => errorHandler.current?.(error)), [key, generation]);
  const revalidate = useCallback(() => refreshQuery(key, loader.current, (error) => errorHandler.current?.(error), { deduplicate: true }), [key, generation]);
  useEffect(() => { void revalidate(); }, [revalidate]);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void revalidate(); }, 60000);
    const visible = () => { if (document.visibilityState === 'visible') void revalidate(); };
    document.addEventListener('visibilitychange', visible);
    return () => {clearInterval(timer); document.removeEventListener('visibilitychange', visible);};
  }, [revalidate]);
  return { ...result, refresh, revalidate };
}

// Keep filters and pagination when a route unmounts. Dialogs and edits stay local.
export function useTabState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => tabState.has(key) ? tabState.get(key) as T : initial);
  const generation = useRef(getCacheGeneration());
  useEffect(() => {
    if (generation.current === getCacheGeneration()) tabState.set(key, value);
  }, [key, value]);
  return [value, setValue];
}
