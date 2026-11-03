import { useEffect, useState } from 'react';
import { WebSpeechPlayer } from './webSpeechPlayer.js';

let shared = null;

/** Một bộ phát dùng chung cho cả trang web để hai bài không đọc chồng nhau. */
export function getPlayer() {
  if (!shared) {
    const w = typeof window !== 'undefined' ? window : {};
    shared = new WebSpeechPlayer({ synth: w.speechSynthesis, Utterance: w.SpeechSynthesisUtterance });
  }
  return shared;
}

export default function useTts() {
  const player = getPlayer();
  const [state, setState] = useState(player.state);
  useEffect(() => player.subscribe(setState), [player]);
  return { player, state };
}
