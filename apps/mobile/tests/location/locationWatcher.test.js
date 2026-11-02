import { createLocationWatcher } from '../../src/features/location/locationWatcher';

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('background while permission is pending never creates a watcher', async () => {
  const permission = deferred();
  const location = { Accuracy: { High: 1 }, requestForegroundPermissionsAsync: jest.fn(() => permission.promise), watchPositionAsync: jest.fn() };
  const controller = createLocationWatcher({ location, onLocation: jest.fn(), onStatus: jest.fn() });
  controller.setActive(true); controller.setActive(false);
  permission.resolve({ granted: true }); await tick();
  expect(location.watchPositionAsync).not.toHaveBeenCalled();
});

test('late watcher is removed after background, resume does not reuse it', async () => {
  const first = deferred();
  const old = { remove: jest.fn() }, current = { remove: jest.fn() };
  const location = { Accuracy: { High: 1 }, requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
    watchPositionAsync: jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(current) };
  const onLocation = jest.fn();
  const controller = createLocationWatcher({ location, onLocation, onStatus: jest.fn() });
  controller.setActive(true); await tick();
  const oldCallback = location.watchPositionAsync.mock.calls[0][1];
  controller.setActive(false); controller.setActive(true); await tick();
  first.resolve(old); await tick();
  oldCallback({});
  expect(old.remove).toHaveBeenCalledTimes(1);
  expect(onLocation).not.toHaveBeenCalled();
  expect(location.watchPositionAsync).toHaveBeenCalledTimes(2);
  controller.dispose(); expect(current.remove).toHaveBeenCalledTimes(1);
});

test('disposing during watcher creation removes its late result', async () => {
  const pending = deferred(), sub = { remove: jest.fn() };
  const location = { Accuracy: { High: 1 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), watchPositionAsync: () => pending.promise };
  const controller = createLocationWatcher({ location, onLocation: jest.fn(), onStatus: jest.fn() });
  controller.setActive(true); await tick(); controller.dispose(); pending.resolve(sub); await tick();
  expect(sub.remove).toHaveBeenCalledTimes(1);
});

test('denied permission is reported without starting location updates', async () => {
  const onStatus = jest.fn();
  const location = { requestForegroundPermissionsAsync: async () => ({ granted: false }), watchPositionAsync: jest.fn() };
  const controller = createLocationWatcher({ location, onLocation: jest.fn(), onStatus });
  controller.setActive(true); await tick();
  expect(onStatus).toHaveBeenLastCalledWith('denied');
  expect(location.watchPositionAsync).not.toHaveBeenCalled();
});
