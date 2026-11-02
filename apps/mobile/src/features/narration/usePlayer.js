import { useEffect, useState } from 'react';
import { player } from './player';

/** Theo dõi trạng thái bộ phát TTS dùng chung. */
export function usePlayerState() {
  const [state, setState] = useState(player.state);
  useEffect(() => player.subscribe(setState), []);
  return state;
}
