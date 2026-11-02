export function startMapLoadTimer({ dataReady, hasPlaces, mapReady, onTimeout, delay = 12000, schedule = setTimeout, cancel = clearTimeout }) {
  if (!dataReady || !hasPlaces || mapReady) return () => {};
  const timer = schedule(onTimeout, delay);
  return () => cancel(timer);
}
