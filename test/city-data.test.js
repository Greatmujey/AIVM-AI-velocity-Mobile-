import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_BOUND, ROAD_LIMIT, LANDMARKS, DISTRICTS, districtAt, entrance, mapLetter, MAP_LETTERS, landmarkById } from '../src/city-data.js';
import { roadRoute } from '../src/gps.js';

test('every city destination has a distinct reachable entrance inside the expanded map',()=>{
 assert.ok(LANDMARKS.length>=20,`expected at least 20 enterable places, got ${LANDMARKS.length}`);
 assert.equal(new Set(LANDMARKS.map(p=>p.id)).size,LANDMARKS.length);
 for(const p of LANDMARKS){
  const q=entrance(p);
  assert.ok(Math.abs(q.x)<CITY_BOUND&&Math.abs(q.z)<CITY_BOUND,`${p.id} outside the map`);
  const arrival=roadRoute({x:0,z:0},q).at(-1);
  assert.ok(Math.abs(arrival.x-q.x)<.001&&Math.abs(arrival.z-q.z)<.001,`${p.id} entrance is not routable`);
  assert.ok(mapLetter(p)!=='•',`${p.id} has no map letter`);
  assert.ok(p.blurb&&p.blurb.length>10,`${p.id} has no description`);
 }
 assert.ok(ROAD_LIMIT>84&&CITY_BOUND>100);
});

test('entrances never overlap each other, so one door cannot hide another',()=>{
 for(let i=0;i<LANDMARKS.length;i++)for(let j=i+1;j<LANDMARKS.length;j++){
  const a=entrance(LANDMARKS[i]),b=entrance(LANDMARKS[j]);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>6,`${LANDMARKS[i].id} and ${LANDMARKS[j].id} share a doorway`);
 }
});

test('district selection points to seven distinct navigable parts of the connected city',()=>{
 assert.equal(DISTRICTS.length,7);assert.equal(new Set(DISTRICTS.map(d=>d.id)).size,7);
 for(const d of DISTRICTS){
  assert.equal(districtAt(d.x,d.z),d.id);
  assert.ok(Math.abs(d.x)<=ROAD_LIMIT&&Math.abs(d.z)<=ROAD_LIMIT);
  assert.ok(Math.abs(d.x%28)<.001&&Math.abs(d.z%28)<.001,`${d.id} is off the street grid`);
  const arrival=roadRoute({x:0,z:0},d).at(-1);
  assert.ok(Math.abs(arrival.x-d.x)<.001&&Math.abs(arrival.z-d.z)<.001,`${d.id} is not reachable`);
 }
});

test('every district owns at least one enterable place',()=>{
 for(const d of DISTRICTS){
  const places=LANDMARKS.filter(p=>(p.district||districtAt(p.x,p.z))===d.id);
  assert.ok(places.length>=1,`${d.id} has no door`);
 }
});

test('landmark lookup and map letters stay in sync',()=>{
 assert.equal(landmarkById('garage').kind,'garage');
 assert.equal(landmarkById('nope'),null);
 for(const place of LANDMARKS)assert.ok(MAP_LETTERS[place.id]||MAP_LETTERS[place.kind],place.id);
});
