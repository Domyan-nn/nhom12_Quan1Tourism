// Owns a foreground watcher, including permission/watch promises that resolve late.
export function createLocationWatcher({ location, onLocation, onStatus }) {
  let generation = 0;
  let disposed = false;
  let active = false;
  let subscription = null;
  let starting = false;
  const valid = (id) => !disposed && active && id === generation;

  async function start() {
    if (disposed || !active || subscription || starting) return;
    const id = ++generation;
    starting = true;
    onStatus('requesting');
    try {
      const permission = await location.requestForegroundPermissionsAsync();
      if (!valid(id)) return;
      if (!permission.granted) { onStatus('denied'); return; }
      const watcher = await location.watchPositionAsync(
        { accuracy: location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
        (sample) => { if (valid(id)) onLocation(sample); }
      );
      if (!valid(id)) { watcher.remove(); return; }
      subscription = watcher;
      onStatus('tracking');
    } catch {
      if (valid(id)) onStatus('error');
    } finally {
      if (id === generation) starting = false;
    }
  }

  function setActive(value) {
    if (disposed || active === value) return;
    active = value;
    if (active) start();
    else {
      generation++;
      starting = false;
      subscription?.remove();
      subscription = null;
      onStatus('background');
    }
  }
  function dispose() {
    disposed = true;
    active = false;
    generation++;
    subscription?.remove();
    subscription = null;
  }
  return { setActive, dispose, currentGeneration: () => generation, isCurrent: (id) => valid(id) };
}
