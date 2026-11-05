import test from 'node:test';
import assert from 'node:assert/strict';
import { PRICES, reward, loadProgress } from '../src/economy.js';
import { ACTIVITIES } from '../src/activities.js';
import { SIDE_MISSIONS } from '../src/missions.js';
import { prizeFor } from '../src/race.js';
import { DEFAULTS } from '../src/preferences.js';
import { STREET_BET_PRIZE } from '../src/street-talk.js';

test('wave 7 pays more for everything', () => {
  assert.equal(PRICES.mg, 900); assert.equal(PRICES.bazooka, 1200);
  assert.ok(ACTIVITIES.coast.reward >= 450 && ACTIVITIES.port.reward >= 550);
  assert.ok(ACTIVITIES.carRace.reward >= 700 && ACTIVITIES.bikeRace.reward >= 700);
  assert.equal(prizeFor('car', 0), 600); assert.equal(prizeFor('bike', 0), 500);
  assert.ok(SIDE_MISSIONS.patrol.reward >= 900);
  assert.ok(STREET_BET_PRIZE >= 350);
  const progress = loadProgress({ getItem: () => '{"money":10,"owned":[]}' });
  reward(progress, 250); assert.equal(progress.money, 260);
});
test('preferences carry map rotation and control size', () => {
  assert.equal(DEFAULTS.mapRotate, true);
  assert.equal(DEFAULTS.controlScale, 1);
});
