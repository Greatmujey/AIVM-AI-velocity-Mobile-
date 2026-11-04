import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_BOUND, ROAD_LIMIT, LANDMARKS, entrance } from '../src/city-data.js';
import { roadRoute } from '../src/gps.js';
test('every city destination has a distinct reachable entrance inside the expanded map',()=>{
 assert.equal(LANDMARKS.length,7);assert.equal(new Set(LANDMARKS.map(p=>p.id)).size,7);
 for(const p of LANDMARKS){const q=entrance(p);assert.ok(Math.abs(q.x)<CITY_BOUND&&Math.abs(q.z)<CITY_BOUND);const route=roadRoute({x:0,z:0},q);assert.deepEqual(route.at(-1),q)}
 assert.ok(ROAD_LIMIT>84&&CITY_BOUND>100);
});
