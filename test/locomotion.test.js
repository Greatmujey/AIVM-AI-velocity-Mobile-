import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, QuaternionKeyframeTrack } from 'three';
import { makeNaturalWalkClip, turnTowards, walkPlaybackRate } from '../src/locomotion.js';

test('walk clip is softened and closes the loop without changing the original', () => {
  const idle = new AnimationClip('Idle', 1, [new QuaternionKeyframeTrack('mixamorigLeftUpLeg.quaternion', [0,1], [0,0,0,1, 0,0,0,1])]);
  const source = new AnimationClip('Walk', 1, [new QuaternionKeyframeTrack('mixamorigLeftUpLeg.quaternion', [0,.5,1], [0,0,0,1, .707,0,0,.707, .2,0,0,.98])]);
  const before = [...source.tracks[0].values];
  const result = makeNaturalWalkClip(source, idle), values = result.tracks[0].values;
  assert.equal(result.name, 'NaturalWalk');
  assert.deepEqual([...values.slice(0,4)], [...values.slice(-4)]);
  assert.ok(values[4] > .1 && values[4] < before[4], 'stride is reduced but still animated');
  assert.deepEqual([...source.tracks[0].values], before);
});

test('steps scale with actual speed and stop when blocked', () => {
  assert.equal(walkPlaybackRate(0), 0);
  assert.ok(walkPlaybackRate(1.2) < walkPlaybackRate(2.4));
  assert.equal(walkPlaybackRate(2.4), 1.35);
  assert.equal(walkPlaybackRate(6.6, true), 1);
  assert.equal(walkPlaybackRate(100), 1.5);
});

test('turns smoothly through the shortest direction', () => {
  const current = Math.PI-.1, target = -Math.PI+.1;
  const next = turnTowards(current,target,.05);
  assert.ok(next > current && next < current + .2);
  assert.equal(turnTowards(current,target,0), current);
});
