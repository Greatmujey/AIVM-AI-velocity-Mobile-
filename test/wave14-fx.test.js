import test from 'node:test';
import assert from 'node:assert/strict';
import { createRagdoll, ragdollStep, ragdollFade, RAGDOLL_TARGET, particleStep, spawnDroplets, sirenFrequencies, fallYawFrom } from '../src/fx.js';
import { createArrest, arrestStep, ARREST } from '../src/arrest.js';
import { CONTRACTS, createContract, registerContractKill, contractObjective, contractCard } from '../src/contracts.js';

test('ragdoll topples to the ground and settles', () => {
  const r = createRagdoll(4);
  for (let i = 0; i < 90 && !r.settled; i++) ragdollStep(r, 1 / 30);
  assert.equal(r.settled, true);
  assert.ok(Math.abs(r.angle - RAGDOLL_TARGET) < .02);
  assert.ok(r.age < 3, 'settles within three seconds');
});
test('ragdoll never sinks past the floor on overshoot', () => {
  const r = createRagdoll(9);
  let max = 0;
  for (let i = 0; i < 200; i++) { ragdollStep(r, 1 / 60); max = Math.max(max, r.angle) }
  assert.ok(max <= RAGDOLL_TARGET + .051);
});
test('ragdoll fade holds, then fades to zero', () => {
  assert.equal(ragdollFade(1), 1);
  assert.ok(ragdollFade(4.6) < 1 && ragdollFade(4.6) > 0);
  assert.equal(ragdollFade(10), 0);
});
test('fall direction points away from the shooter', () => {
  const yaw = fallYawFrom({ x: 0, z: 0 }, { x: 0, z: 5 });
  assert.ok(Math.abs(yaw) < 1e-9);
  assert.ok(Math.abs(fallYawFrom({ x: 0, z: 0 }, { x: 5, z: 0 }) - Math.PI / 2) < 1e-9);
});
test('droplets fall, bounce to the ground and die', () => {
  const [d] = spawnDroplets({ x: 0, y: 1.2, z: 0 }, { x: 1, z: 0 }, 1, () => .5);
  let alive = true, frames = 0;
  for (; frames < 300 && alive; frames++) alive = particleStep(d, 1 / 60);
  assert.equal(alive, false);
  assert.ok(frames / 60 <= 1.5, 'droplets are short-lived');
  assert.ok(d.y >= 0, 'never below the floor');
});
test('siren channels wail out of phase within a sane band', () => {
  for (let t = 0; t < 10; t += .37) {
    const f = sirenFrequencies(t);
    assert.ok(f.left >= 690 && f.left <= 990 && f.right >= 690 && f.right <= 990);
    assert.ok(Math.abs((f.left + f.right) - 1680) < 1e-6, 'channels are mirrored');
  }
});
test('arrest: sustained contact leads to exit, then arrest, then booking', () => {
  const s = createArrest();
  for (let i = 0; i < 200 && s.phase === 'patrol'; i++) arrestStep(s, { dist: 3, sees: true, dt: 1 / 30 });
  assert.equal(s.phase, 'exit');
  arrestStep(s, { dist: 3, sees: true, officerDist: 1.5, dt: 1 / 30 });
  assert.equal(s.phase, 'arrest');
  for (let i = 0; i < 200 && s.phase !== 'booked'; i++) arrestStep(s, { dist: 3, sees: true, officerDist: 1, dt: 1 / 30 });
  assert.equal(s.phase, 'booked');
});
test('arrest: brief contact does not trigger the sequence', () => {
  const s = createArrest();
  for (let i = 0; i < 10; i++) arrestStep(s, { dist: 3, sees: true, dt: 1 / 30 });
  for (let i = 0; i < 60; i++) arrestStep(s, { dist: 30, sees: false, dt: 1 / 30 });
  assert.equal(s.phase, 'patrol');
  assert.ok(ARREST.catchWindow > 1);
});
test('arrest: officers that walk away reset to exit and the sequence cannot hang', () => {
  const s = createArrest();
  s.phase = 'arrest';
  arrestStep(s, { dist: 3, sees: true, officerDist: 50, dt: .1 });
  assert.equal(s.phase, 'exit');
  for (let i = 0; i < 2000 && s.phase !== 'booked'; i++) arrestStep(s, { dist: 3, sees: true, officerDist: 50, dt: .1 });
  assert.equal(s.phase, 'booked');
});
test('contracts: standard structure and a $3,000 mission exists', () => {
  const c = CONTRACTS.find(x => x.reward === 3000);
  assert.ok(c && c.targets === 3);
  for (const k of CONTRACTS) assert.ok(k.roof && k.spawns.length >= k.targets, k.code);
});
test('contracts: kills count to completion exactly once', () => {
  const c = createContract('ct-tower');
  const results = [];
  for (let i = 0; i < 5; i++) results.push(registerContractKill(c));
  assert.deepEqual(results, ['kill', 'kill', 'complete', null, null]);
  assert.equal(c.status, 'done');
  assert.match(contractObjective(c), /ELIMINATE 3 \/ 3 TARGET HOSTILES · \$3,000/);
});
test('contracts: card exposes structured lines', () => {
  const card = contractCard(createContract('ct-ridge'));
  assert.equal(card.lines.length, 5);
  assert.match(card.lines[0], /TARGETS: 5/);
});
