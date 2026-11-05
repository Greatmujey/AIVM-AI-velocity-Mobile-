import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_BOUND } from '../src/city-data.js';
import { MAP_BOUND, worldToMap } from '../src/full-map.js';

test('full map places the city center, northwest and southeast consistently', () => {
  assert.deepEqual(worldToMap(0,0,630), {x:315,y:315});
  assert.deepEqual(worldToMap(-MAP_BOUND,-MAP_BOUND,630), {x:0,y:0});
  assert.deepEqual(worldToMap(MAP_BOUND,MAP_BOUND,630), {x:630,y:630});
});
test('full map contains the expanded playable city with a margin', () => {
  const nw = worldToMap(-CITY_BOUND,-CITY_BOUND,630), se = worldToMap(CITY_BOUND,CITY_BOUND,630);
  assert.ok(nw.x>0 && nw.y>0 && se.x<630 && se.y<630);
  assert.ok(nw.x<se.x && nw.y<se.y);
});
