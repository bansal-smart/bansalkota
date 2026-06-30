import { useEffect, useState } from "react";

/**
 * Returns `value` debounced by `delay` ms. The input stays controlled in real
 * time; downstream filters / queries should read the debounced output to avoid
 * thrashing on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
