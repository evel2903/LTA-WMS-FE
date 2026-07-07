import { useEffect, useState } from 'react';

/**
 * Debounce a fast-changing value (e.g. a search box) before using it in a query key.
 *
 * `resetKey` (optional): when it changes, snap `debounced` to the current `value`
 * immediately instead of waiting out the timer. Without this, a value reset that's
 * triggered by something else changing (e.g. clearing a text filter when a parent
 * dropdown changes) still combines the OLD debounced text with the NEW dropdown
 * selection for one query, until the timer catches up.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300, resetKey?: unknown): T {
  const [debounced, setDebounced] = useState(value);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDebounced(value);
  }

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
