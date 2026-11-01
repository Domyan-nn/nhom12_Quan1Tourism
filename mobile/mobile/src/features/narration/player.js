import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { NarrationPlayer } from './NarrationPlayer';

// Một bộ phát duy nhất cho cả ứng dụng để UC03 (thủ công) và UC04 (tự động) không phát chồng.
export const player = new NarrationPlayer({
  speech: Speech,
  supportsPause: Platform.OS === 'ios', // expo-speech: pause/resume chỉ có trên iOS
});
