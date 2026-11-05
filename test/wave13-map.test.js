import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_BOUND, MAP_MIN_ZOOM, MAP_MAX_ZOOM, clampMapView, mapScale, screenToWorld, zoomMapView } from '../src/full-map.js';

const SIZE = 630;

test('clampMapView defaults to the whole city', () => {
  assert.deepEqual(clampMapView(), { zoom: 1, cx: 0, cz: 0 });
  assert.deepEqual(clampMapView({}), { zoom: 1, cx: 0, cz: 0 });
});

test('clampMapView bounds zoom and keeps the city on screen', () => {
  assert.equal(clampMapView({ zoom: 99 }).zoom, MAP_MAX_ZOOM);
  assert.equal(clampMapView({ zoom: 0.2 }).zoom, MAP_MIN_ZOOM);
  // At zoom 1 the whole map fits, so the centre cannot move.
  assert.deepEqual(clampMapView({ zoom: 1, cx: 80, cz: -80 }), { zoom: 1, cx: 0, cz: 0 });
  // At zoom 5 the visible half-width is MAP_BOUND/5, so cx may range ±0.8*MAP_BOUND.
  const v = clampMapView({ zoom: 5, cx: 9999, cz: -9999 });
  const lim = MAP_BOUND * (1 - 1 / 5);
  assert.ok(Math.abs(v.cx - lim) < 1e-9 && Math.abs(v.cz + lim) < 1e-9);
});

test('screenToWorld maps the canvas centre and corners at zoom 1', () => {
  const c = screenToWorld({ zoom: 1, cx: 0, cz: 0 }, SIZE / 2, SIZE / 2, SIZE);
  assert.ok(Math.abs(c.x) < 1e-9 && Math.abs(c.z) < 1e-9);
  const nw = screenToWorld({ zoom: 1, cx: 0, cz: 0 }, 0, 0, SIZE);
  assert.ok(Math.abs(nw.x + MAP_BOUND) < 1e-9 && Math.abs(nw.z + MAP_BOUND) < 1e-9);
});

test('screenToWorld inverts the drawing projection at any view', () => {
  const view = clampMapView({ zoom: 2.6, cx: 40, cz: -55 });
  const scale = mapScale(view, SIZE);
  const world = { x: 63, z: -21 };
  const sx = (world.x - view.cx) * scale + SIZE / 2, sy = (world.z - view.cz) * scale + SIZE / 2;
  const back = screenToWorld(view, sx, sy, SIZE);
  assert.ok(Math.abs(back.x - world.x) < 1e-9 && Math.abs(back.z - world.z) < 1e-9);
});

test('zoomMapView keeps the world point under the anchor fixed', () => {
  const start = { zoom: 1, cx: 0, cz: 0 };
  const anchor = { x: 400, y: 200 };
  const before = screenToWorld(start, anchor.x, anchor.y, SIZE);
  const zoomed = zoomMapView(start, 2, anchor.x, anchor.y, SIZE);
  assert.ok(Math.abs(zoomed.zoom - 2) < 1e-9);
  const after = screenToWorld(zoomed, anchor.x, anchor.y, SIZE);
  assert.ok(Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.z - before.z) < 1e-6);
});

test('zoomMapView clamps at both ends and ignores bad factors', () => {
  assert.equal(zoomMapView({ zoom: 4.9 }, 3, 315, 315, SIZE).zoom, MAP_MAX_ZOOM);
  assert.equal(zoomMapView({ zoom: 1.1 }, 0.01, 315, 315, SIZE).zoom, MAP_MIN_ZOOM);
  const v = { zoom: 2, cx: 10, cz: -10 };
  assert.deepEqual(zoomMapView(v, 0, 315, 315, SIZE), clampMapView(v));
  assert.deepEqual(zoomMapView(v, NaN, 315, 315, SIZE), clampMapView(v));
});

test('repeated pinch zooms around the centre stay centred', () => {
  let view = { zoom: 1, cx: 0, cz: 0 };
  for (let i = 0; i < 8; i++) view = zoomMapView(view, 1.25, SIZE / 2, SIZE / 2, SIZE);
  assert.ok(Math.abs(view.cx) < 1e-9 && Math.abs(view.cz) < 1e-9);
  assert.equal(view.zoom, MAP_MAX_ZOOM);
});
