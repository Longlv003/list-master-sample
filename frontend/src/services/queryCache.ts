interface Snapshot<T> { data?: T; isLoading: boolean }
interface Entry<T> {
  snapshot: Snapshot<T>;
  listeners: Set<() => void>;
  revision: number;
  inFlight?: Promise<void>;
}

const entries = new Map<string, Entry<unknown>>();
export const tabState = new Map<string, unknown>();
let cacheGeneration = 0;
export const getCacheGeneration = () => cacheGeneration;

// Preserve references for equal rows, including when rows are added, removed or reordered.
export function reconcile<T>(previous: T | undefined, next: T): T {
  if (Object.is(previous, next)) return next;
  if (Array.isArray(previous) && Array.isArray(next)) {
    const byId = new Map(previous.filter((row) => row && typeof row === 'object' && 'id' in row).map((row) => [row.id, row]));
    const result = next.map((row, index) => reconcile(
      row && typeof row === 'object' && 'id' in row ? byId.get(row.id) : previous[index], row,
    ));
    return (result.length === previous.length && result.every((row, index) => row === previous[index]) ? previous : result) as T;
  }
  if (previous && next && typeof previous === 'object' && typeof next === 'object' && !Array.isArray(previous) && !Array.isArray(next)) {
    const before = previous as Record<string, unknown>;
    const after = next as Record<string, unknown>;
    const result = Object.fromEntries(Object.keys(after).map((key) => [key, reconcile(before[key], after[key])]));
    return (Object.keys(before).length === Object.keys(after).length && Object.keys(after).every((key) => Object.prototype.hasOwnProperty.call(before, key) && result[key] === before[key]) ? previous : result) as T;
  }
  return next;
}

export function getQueryEntry<T>(key: string): Entry<T> {
  if (!entries.has(key)) {
    // Bound memory while retaining every query that currently has a mounted consumer.
    if (entries.size >= 100) {
      const inactive = [...entries].find(([, entry]) => entry.listeners.size === 0);
      if (inactive) entries.delete(inactive[0]);
    }
    entries.set(key, { snapshot: { isLoading: true }, listeners: new Set(), revision: 0 });
  }
  return entries.get(key) as Entry<T>;
}

function publish<T>(entry: Entry<T>, snapshot: Snapshot<T>) {
  if (entry.snapshot.data === snapshot.data && entry.snapshot.isLoading === snapshot.isLoading) return;
  entry.snapshot = snapshot;
  entry.listeners.forEach((listener) => listener());
}

export function refreshQuery<T>(key: string, load: () => Promise<T>, onError?: (error: Error) => void, options: { deduplicate?: boolean } = {}): Promise<void> {
  const entry = getQueryEntry<T>(key);
  if (options.deduplicate && entry.inFlight) return entry.inFlight;
  const revision = ++entry.revision;
  const isCurrent = () => entries.get(key) === entry && entry.revision === revision;
  publish(entry, { data: entry.snapshot.data, isLoading: entry.snapshot.data === undefined });
  // Schedule the loader after installing inFlight, including for synchronous throws.
  const pending = Promise.resolve().then(load).then((data) => {
    if (isCurrent()) publish(entry, { data: reconcile(entry.snapshot.data, data), isLoading: false });
  }).catch((error) => {
    if (isCurrent()) {
      publish(entry, { data: entry.snapshot.data, isLoading: false });
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }).finally(() => {
    if (entry.inFlight === pending) entry.inFlight = undefined;
  });
  entry.inFlight = pending;
  return pending;
}

export function clearQueryCache() {
  cacheGeneration++;
  const previous = [...entries.values()];
  entries.clear();
  tabState.clear();
  previous.forEach((entry) => entry.listeners.forEach((listener) => listener()));
}
