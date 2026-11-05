import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack, Group, Bone, Quaternion, Vector3 } from 'three';
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
  assert.ok(walkPlaybackRate(1) < walkPlaybackRate(2));
  assert.equal(walkPlaybackRate(2), 1.5);
  assert.equal(walkPlaybackRate(6.6, true), 1);
  assert.equal(walkPlaybackRate(100), 1.6);
});

test('turns smoothly through the shortest direction', () => {
  const current = Math.PI-.1, target = -Math.PI+.1;
  const next = turnTowards(current,target,.05);
  assert.ok(next > current && next < current + .2);
  assert.equal(turnTowards(current,target,0), current);
});


test('walk uses bending knees and moving ankles from the stride without mutating its source', () => {
  const legNames = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
  const rest = [0, 0, 0, 1], bent = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -.9).toArray();
  const track = (name, poses, times = [0, .5, 1]) => new QuaternionKeyframeTrack(`mixamorig${name}.quaternion`, times, poses.flat());
  const idle = new AnimationClip('Idle', 1, [new VectorKeyframeTrack('mixamorigHips.position', [0,1], [0,1,0, 0,1,0]), ...legNames.map(name => track(name, [rest,rest], [0,1]))]);
  const source = new AnimationClip('Walk', 2, [new VectorKeyframeTrack('mixamorigHips.position', [0,2], [0,1,0, 0,1,0]), ...legNames.map(name => track(name, [rest,rest,rest], [0,1,2]))]);
  const donor = new AnimationClip('unarmed_walk', 1, legNames.map(name => track(name, [rest,bent,rest])));
  const original = [...donor.tracks[1].values];
  const rig = new Group(), hips = new Bone(); hips.name = 'mixamorigHips'; rig.add(hips);
  for (const side of ['Left','Right']) {
    let parent = hips;
    for (const [name, y] of [['UpLeg',0], ['Leg',-.4], ['Foot',-.4], ['ToeBase',-.1]]) {
      const bone = new Bone(); bone.name = `mixamorig${side}${name}`; bone.position.y = y; parent.add(bone); parent = bone;
    }
  }
  const result = makeNaturalWalkClip(source, idle, donor, rig);
  const knee = result.tracks.find(t => t.name === 'mixamorigLeftLeg.quaternion');
  const foot = result.tracks.find(t => t.name === 'mixamorigRightFoot.quaternion');
  assert.ok(Math.abs(knee.values[4]) > .3, 'swinging knee visibly bends');
  assert.ok(Math.abs(foot.values[4]) > .3, 'ankle follows the stride');
  assert.equal(knee.times[knee.times.length - 1], 2, 'donor motion matches walk duration');
  assert.deepEqual([...knee.values.slice(0,4)], [...knee.values.slice(-4)]);
  assert.deepEqual([...donor.tracks[1].values], original, 'cached donor remains unchanged');
  const hipsTrack = result.tracks.find(t => t.name === 'mixamorigHips.position');
  assert.equal(hipsTrack.times.length, 41, 'ground correction is baked over the cycle');
  assert.deepEqual([...hipsTrack.values.slice(0,3)], [...hipsTrack.values.slice(-3)], 'ground correction loops cleanly');
});
