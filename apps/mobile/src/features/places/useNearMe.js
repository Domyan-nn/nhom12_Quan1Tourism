import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestNearMePosition } from './nearMePosition';

/**
 * Trạng thái "Gần tôi": off -> locating -> on | error. Vị trí chỉ nằm trong state (bộ nhớ),
 * không ghi AsyncStorage, không gửi đi (BR07). Tắt hoặc rời màn hình thì bỏ vị trí.
 */
export default function useNearMe() {
  const [state, setState] = useState({ status: 'off', origin: null, errorCode: null });
  const request = useRef(0);

  useEffect(() => () => { request.current += 1; }, []); // bỏ kết quả đến muộn sau khi rời màn hình

  const activate = useCallback(async () => {
    const id = ++request.current;
    setState({ status: 'locating', origin: null, errorCode: null });
    try {
      const origin = await requestNearMePosition({ location: Location });
      if (id === request.current) setState({ status: 'on', origin, errorCode: null });
    } catch (error) {
      if (id === request.current) setState({ status: 'error', origin: null, errorCode: error?.code ?? 'UNAVAILABLE' });
    }
  }, []);

  const deactivate = useCallback(() => {
    request.current += 1;
    setState({ status: 'off', origin: null, errorCode: null });
  }, []);

  return { ...state, activate, deactivate };
}
