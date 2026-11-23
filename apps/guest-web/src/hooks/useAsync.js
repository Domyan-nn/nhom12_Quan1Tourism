import { useCallback, useEffect, useState } from 'react';

// Trả về trạng thái loading / success / error để màn hình thể hiện đủ 3 trạng thái (NFR04).
export default function useAsync(fn, deps, onSuccess) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    fn()
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'success', data, error: null });
        onSuccess?.(data);
      })
      .catch((error) => !cancelled && setState({ status: 'error', data: null, error }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, retry };
}
