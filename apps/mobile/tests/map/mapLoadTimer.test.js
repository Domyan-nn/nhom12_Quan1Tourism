import { startMapLoadTimer } from '../../src/features/map/mapLoadTimer';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('slow or failed data and empty lists do not start map timeout', () => {
  const timeout = jest.fn();
  startMapLoadTimer({ dataReady: false, hasPlaces: false, mapReady: false, onTimeout: timeout });
  startMapLoadTimer({ dataReady: true, hasPlaces: false, mapReady: false, onTimeout: timeout });
  jest.advanceTimersByTime(30000);
  expect(timeout).not.toHaveBeenCalled();
});

test('map timeout starts after data and is cancelled when map becomes ready', () => {
  const timeout = jest.fn();
  const cancel = startMapLoadTimer({ dataReady: true, hasPlaces: true, mapReady: false, onTimeout: timeout });
  jest.advanceTimersByTime(11999); expect(timeout).not.toHaveBeenCalled();
  cancel(); jest.advanceTimersByTime(100); expect(timeout).not.toHaveBeenCalled();
  startMapLoadTimer({ dataReady: true, hasPlaces: true, mapReady: false, onTimeout: timeout });
  jest.advanceTimersByTime(12000); expect(timeout).toHaveBeenCalledTimes(1);
});
