import { useCallback, useEffect, useRef, useState } from 'react';
import { getSnapshot } from '../lib/api';

/**
 * Custom hook owning the election snapshot lifecycle.
 * Polls the backend (which itself polls ONPE) at a configurable interval.
 */
export function useElectionData({ intervalMs = 60_000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const snap = await getSnapshot();
      setData(snap);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [load, intervalMs]);

  return { data, error, loading, lastFetched, refresh: load };
}
