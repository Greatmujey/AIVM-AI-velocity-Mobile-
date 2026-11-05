import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('new player asset contains a skinned character and matching locomotion clips', () => {
  const data = readFileSync(new URL('../public/assets/models/player-marcus.glb', import.meta.url));
  assert.equal(data.toString('ascii', 0, 4), 'glTF');
  assert.ok(data.length < 3_000_000, 'keep the player download under 3 MB');
  const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
  const names = new Set(json.nodes.map(node => node.name));
  assert.ok(names.has('mixamorig:RightHand'));
  assert.ok(names.has('Body'));
  assert.ok(json.skins.some(skin => skin.joints.length >= 50));
  const clips = new Set(json.animations.map(animation => animation.name));
  assert.ok(clips.has('Idle') && clips.has('Walk'));
  const triangles = json.meshes.flatMap(mesh => mesh.primitives).reduce((n, p) => n + (p.indices === undefined ? 0 : json.accessors[p.indices].count / 3), 0);
  assert.ok(triangles > 10_000 && triangles < 60_000, `unexpected triangle count: ${triangles}`);
});
