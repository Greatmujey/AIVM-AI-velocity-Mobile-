import test from 'node:test';
import assert from 'node:assert/strict';
import { fareCents, formatFare, destinationList, teleportPhase, portalFront, applyFare, balanceCents, TELEPORT_TOTAL_MS, BASE_FARE_CENTS } from '../src/teleport.js';

test('fares start at $0.50 and rise with distance', () => {
  assert.equal(fareCents(0), 50);
  assert.equal(fareCents(4), 60);
  assert.ok(fareCents(100) > fareCents(50));
  assert.ok(fareCents(300) > fareCents(100));
  assert.equal(fareCents(-20), BASE_FARE_CENTS, 'negative distances never go below the minimum');
});
test('fares format as dollars and cents', () => {
  assert.equal(formatFare(50), '$0.50');
  assert.equal(formatFare(1205), '$12.05');
  assert.equal(formatFare(300), '$3.00');
});
test('destination list is nearest-first, priced, and skips the current spot', () => {
  const from = { x: 0, z: 0 };
  const list = destinationList(from, [
    { id: 'far', name: 'FAR', x: 100, z: 0 },
    { id: 'here', name: 'HERE', x: 3, z: 2 },
    { id: 'near', name: 'NEAR', x: 30, z: 0 },
  ]);
  assert.deepEqual(list.map(p => p.id), ['near', 'far']);
  assert.equal(list[0].cents, fareCents(30));
  assert.equal(list[1].distance, 100);
});
test('phases run in order and finish', () => {
  assert.equal(teleportPhase(0).phase, 'open');
  assert.equal(teleportPhase(899).phase, 'open');
  assert.equal(teleportPhase(900).phase, 'enter');
  assert.equal(teleportPhase(900).t, 0);
  const seen = [];
  for (let t = 0; t <= TELEPORT_TOTAL_MS + 60; t += 10) {
    const { phase } = teleportPhase(t);
    if (seen.at(-1) !== phase) seen.push(phase);
  }
  assert.deepEqual(seen, ['open', 'enter', 'fadeOut', 'hold', 'fadeIn', 'emerge', 'close', 'done']);
  assert.equal(teleportPhase(TELEPORT_TOTAL_MS).phase, 'done');
});
test('portal opens straight ahead of the player, and the yaw convention matches the camera', () => {
  const ahead = portalFront({ x: 0, z: 0 }, 0);
  assert.ok(Math.abs(ahead.x) < 1e-9 && Math.abs(ahead.z + 2.2) < 1e-9, 'yaw 0 faces -z');
  const east = portalFront({ x: 0, z: 0 }, -Math.PI / 2);
  assert.ok(Math.abs(east.x - 2.2) < 1e-9 && Math.abs(east.z) < 1e-9, 'yaw -PI/2 faces +x');
});
test('paying a fare keeps the cents remainder and never overdraws', () => {
  const p = { money: 3, owned: [], cents: 40 };
  assert.equal(applyFare(p, 50), true);
  assert.equal(balanceCents(p), 290);
  assert.equal(p.money, 2);
  assert.equal(p.cents, 90);
  assert.equal(applyFare(p, 1000), false);
  assert.equal(balanceCents(p), 290, 'failed payment leaves the balance alone');
  assert.equal(applyFare(p, 290), true);
  assert.equal(p.cents, undefined, 'exact payment clears the remainder');
  assert.equal(p.money, 0);
});
import { fadeLevel } from '../src/teleport.js';
test('screen fade is derived from the phase every frame', () => {
  assert.equal(fadeLevel('open'), 0);
  assert.equal(fadeLevel('enter', .9), 0);
  assert.equal(fadeLevel('fadeOut', .5), .5);
  assert.equal(fadeLevel('hold'), 1);
  assert.equal(fadeLevel('fadeIn', 1), 0);
  assert.equal(fadeLevel('emerge', .4), 0, 'never stuck black while stepping out');
  assert.equal(fadeLevel('close'), 0);
  assert.equal(fadeLevel('done'), 0);
});

import { carFootprintHit } from '../src/crowd.js';
test('a pedestrian is under a car only inside its footprint, at any heading', () => {
  const car = { x: 0, z: 0, yaw: 0, type: 'sedan' };
  assert.equal(carFootprintHit(car, 0, -2), true, 'directly ahead');
  assert.equal(carFootprintHit(car, 1.2, 0), true, 'beside the wheel line');
  assert.equal(carFootprintHit(car, 3, 0), false, 'well outside the width');
  assert.equal(carFootprintHit(car, 0, -6), false, 'far ahead');
  const turned = { ...car, yaw: Math.PI / 2 };
  assert.equal(carFootprintHit(turned, -2, 0), true, 'ahead after turning 90 degrees');
  assert.equal(carFootprintHit(turned, 0, 2), false, 'side after turning');
  assert.equal(carFootprintHit({ ...car, type: 'bike' }, 1.5, 0), false, 'bikes are narrower');
});

import { zoomIntoPlayer, MAP_BOUND } from '../src/full-map.js';
test('zooming in from the full map keeps a city-edge player on screen', () => {
  const centre = { x: -128, z: 133 };
  const view = zoomIntoPlayer({ zoom: 1, cx: 0, cz: 0 }, 1.5, centre);
  assert.ok(Math.abs(centre.x - view.cx) < MAP_BOUND / view.zoom, 'x on screen');
  assert.ok(Math.abs(centre.z - view.cz) < MAP_BOUND / view.zoom, 'z on screen');
  const deep = zoomIntoPlayer(view, 1.5, centre);
  assert.ok(Math.abs(centre.x - deep.cx) < MAP_BOUND / deep.zoom, 'still on screen after more zoom');
  assert.ok(Math.abs(centre.z - deep.cz) < MAP_BOUND / deep.zoom, 'z still on screen');
});
