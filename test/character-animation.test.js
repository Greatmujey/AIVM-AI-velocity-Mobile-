import test from 'node:test';
import assert from 'node:assert/strict';
import { personAnimationName } from '../src/models.js';

test('player uses upright locomotion and distinct aim, fire and sprint poses', () => {
  assert.equal(personAnimationName('player', 0), 'Idle');
  assert.equal(personAnimationName('player', 1), 'NaturalWalk');
  assert.equal(personAnimationName('player', 1, false, false, true), 'unarmed_run');
  assert.equal(personAnimationName('player', 0, false, true), 'aim_idle');
  assert.equal(personAnimationName('player', 1, false, true), 'walk');
  assert.equal(personAnimationName('player', 1, true, true), 'fire');
  assert.equal(personAnimationName('civilian', .5), 'unarmed_walk');
  assert.equal(personAnimationName('enemy', 1), 'run');
});
