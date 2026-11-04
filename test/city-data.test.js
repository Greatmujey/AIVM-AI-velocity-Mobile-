import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_BOUND, ROAD_LIMIT, LANDMARKS, DISTRICTS, districtAt, entrance } from '../src/city-data.js';
import { roadRoute } from '../src/gps.js';
test('every city destination has a distinct reachable entrance inside the expanded map',()=>{
 assert.equal(LANDMARKS.length,8);assert.equal(new Set(LANDMARKS.map(p=>p.id)).size,8);
 for(const p of LANDMARKS){const q=entrance(p);assert.ok(Math.abs(q.x)<CITY_BOUND&&Math.abs(q.z)<CITY_BOUND);const route=roadRoute({x:0,z:0},q);assert.deepEqual(route.at(-1),q)}
 assert.ok(ROAD_LIMIT>84&&CITY_BOUND>100);
});


test('district selection points to five distinct navigable parts of the connected city',()=>{
 assert.equal(DISTRICTS.length,5);assert.equal(new Set(DISTRICTS.map(d=>d.id)).size,5);
 for(const d of DISTRICTS){assert.equal(districtAt(d.x,d.z),d.id);assert.ok(Math.abs(d.x)<=ROAD_LIMIT&&Math.abs(d.z)<=ROAD_LIMIT);assert.ok(d.x%28===0);assert.ok(d.z%28===0);assert.deepEqual(roadRoute({x:0,z:0},d).at(-1),{x:d.x,z:d.z})}
});
