import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteriorLife, stepInteriorLife, interiorVisible, DOOR } from '../src/interior-life.js';
import { createInteriors } from '../src/interiors.js';
import { LANDMARKS } from '../src/city-data.js';

const SPOTS = { diner: [[-4.4, -3.2], [-4.6, -2.2], [4.6, -4.2], [1.6, 3.4], [-1.4, 3.4]].map(([x, z], i) => ({ x, z, ry: 0, role: i % 2 ? 'civilian' : 'civilian-warm' })) };

test('rooms keep somebody inside and everybody within the walls', () => {
  const agents = createInteriorLife(SPOTS.diner, { seed: 4 });
  let time = 0, exits = 0, enters = 0, minVisible = 99;
  for (let i = 0; i < 60 * 300; i++) {
    time += 1 / 60;
    for (const event of stepInteriorLife(agents, SPOTS.diner, 1 / 60, { time, random: Math.random })) {
      if (event.type === 'exit') exits++; else enters++;
    }
    minVisible = Math.min(minVisible, interiorVisible(agents));
    for (const a of agents) if (a.mode !== 'out') {
      assert.ok(Math.abs(a.x) <= 6, `x ${a.x}`);
      assert.ok(a.z >= -6 && a.z <= 5.6, `z ${a.z}`);
    }
  }
  assert.ok(exits >= 3 && enters >= 3, `door traffic exits=${exits} enters=${enters}`);
  assert.ok(minVisible >= 1, 'the room never empties completely');
});

test('people mill about: several spots visited and pairs face each other to talk', () => {
  const agents = createInteriorLife(SPOTS.diner, { seed: 11 });
  const visited = agents.map(() => new Set());
  let talks = 0, time = 0;
  for (let i = 0; i < 60 * 240; i++) {
    time += 1 / 60;
    stepInteriorLife(agents, SPOTS.diner, 1 / 60, { time, random: Math.random });
    for (const a of agents) {
      if (a.mode !== 'out') visited[a.id].add(`${Math.round(a.x)},${Math.round(a.z)}`);
      if (a.mode === 'talk') {
        talks++;
        const partner = agents.find(o => o.id === a.partner);
        assert.ok(partner && partner.partner === a.id, 'talk is mutual');
        const facing = Math.atan2(Math.sin(partner.ry - a.ry - Math.PI), Math.cos(partner.ry - a.ry - Math.PI));
        assert.ok(Math.abs(facing) < .3, 'partners face each other');
      }
    }
  }
  assert.ok(talks > 60, `expected conversations, saw ${talks} talk steps`);
  for (const [id, set] of visited.entries()) assert.ok(set.size >= 2, `agent ${id} never moved`);
});

test('a lone occupant still gets company and the door is where people cross', () => {
  const agents = createInteriorLife([{ x: 0, z: -4, ry: 0, role: 'civilian' }], { seed: 2 });
  assert.ok(agents.length >= 2, 'solo rooms gain a walker');
  let time = 0, sawDoor = false;
  for (let i = 0; i < 60 * 180; i++) {
    time += 1 / 60;
    stepInteriorLife(agents, [{ x: 0, z: -4 }], 1 / 60, { time, random: Math.random });
    for (const a of agents) if (a.mode === 'walk' && Math.hypot(a.x - DOOR.x, a.z - DOOR.z) < 1.2) sawDoor = true;
  }
  assert.ok(sawDoor, 'somebody crosses the doorway');
});

test('every enterable room in the city supports a living crowd', () => {
  const scene = { add() {} };
  const { spots } = createInteriors(scene);
  for (const place of LANDMARKS) {
    if (place.id === 'home') continue;
    const agents = createInteriorLife(spots[place.id] || [], { seed: place.id.length + 3 });
    assert.ok(agents.length >= 2, `${place.id} too quiet`);
    let time = 0;
    for (let i = 0; i < 600; i++) { time += 1 / 30; stepInteriorLife(agents, spots[place.id] || [], 1 / 30, { time, random: Math.random }) }
    assert.ok(interiorVisible(agents) >= 1, `${place.id} emptied out`);
  }
});
