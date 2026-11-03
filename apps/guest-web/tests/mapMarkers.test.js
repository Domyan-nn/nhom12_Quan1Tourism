import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapMarkers, toCoordinate } from '../src/features/map/mapMarkers.js';

const p = (id, latitude = 10.77, longitude = 106.69) => ({ id, latitude, longitude });

test('map excludes malformed IDs, duplicates and invalid coordinates without losing valid places', () => {
  const valid = p('opaque/id');
  assert.deepEqual(getMapMarkers([null, p(null), p(''), p(' '), p({}), p(1),
    p('null', null), p('str', '10.77'), p('bool', true), p('nan', NaN), p('inf', Infinity),
    p('lat', 91), p('lon', 0, -181), p('lonInf', 0, Infinity), valid, p('opaque/id')]), [valid]);
});

test('map accepts boundaries and zero, and uses the same coordinates for fitting', () => {
  assert.deepEqual(getMapMarkers([p('a', -90, -180), p('b', 90, 180), p('c', 0, 0)]).map(toCoordinate),
    [[-90, -180], [90, 180], [0, 0]]);
});

test('empty, missing and malformed lists yield no markers', () => {
  for (const input of [[], null, undefined, {}, 'invalid']) assert.deepEqual(getMapMarkers(input), []);
});
