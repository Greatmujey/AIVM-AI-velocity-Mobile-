import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// Keep Marcus's upright torso and use the existing CC0 walk's lower-body
// motion. Unlike uniformly scaling his original stride, the donor has a
// distinct swing phase: the knee bends as the foot passes the standing leg.
// Never alter the cached source clips.
export function makeNaturalWalkClip(walk, idle, stride, model) {
  const clip = walk.clone();
  clip.name = 'NaturalWalk';
  const idleTracks = new Map(idle.tracks.map(track => [track.name, track]));
  for (const track of clip.tracks) {
    if (track.ValueTypeName !== 'quaternion' || track.times.length < 3) continue;
    const rest = idleTracks.get(track.name);
    if (!rest || rest.values.length < 4) continue;
    const weight = /(?:Arm|ForeArm)\.quaternion$/.test(track.name) ? .45 : .8;
    const base = new THREE.Quaternion().fromArray(rest.values).normalize();
    const pose = new THREE.Quaternion();
    for (let i = 0; i < track.values.length; i += 4) {
      pose.fromArray(track.values, i).normalize().slerp(base, 1 - weight).normalize().toArray(track.values, i);
    }
    const last = track.values.length - 4;
    const seam = new THREE.Quaternion().fromArray(track.values, last).slerp(new THREE.Quaternion().fromArray(track.values, 4), .5).normalize();
    seam.toArray(track.values, 0);
    seam.toArray(track.values, last);
  }
  const legTrack = /^mixamorig(?:Left|Right)(?:UpLeg|Leg|Foot)\.quaternion$/;
  const legs = stride?.tracks.filter(track => legTrack.test(track.name)) ?? [];
  if (legs.length === 6 && stride.duration > 0) {
    clip.tracks = clip.tracks.filter(track => !legTrack.test(track.name));
    for (const source of legs) {
      const track = source.clone().scale(clip.duration / stride.duration);
      const rest = idleTracks.get(track.name);
      if (rest) {
        const base = new THREE.Quaternion().fromArray(rest.values).normalize(), pose = new THREE.Quaternion();
        const weight = .9;
        for (let i = 0; i < track.values.length; i += 4) {
          pose.fromArray(track.values, i).normalize().slerp(base, 1 - weight).normalize().toArray(track.values, i);
        }
      }
      // The donor loop is seamless, but write matching keys exactly to avoid a
      // visible pop from rounding in the converted tracks.
      track.values.set(track.values.slice(0, 4), track.values.length - 4);
      clip.tracks.push(track);
    }
    if (model) groundWalk(clip, idle, model);
  }
  return clip;
}

// Bake a small hip-height correction from the rig's heel and toe positions.
// This preserves the donor's knee/ankle motion while keeping its supporting
// foot near Marcus's idle ground level rather than floating on the new rig.
function groundWalk(clip, idle, model) {
  const hipsPosition = clip.tracks.find(t => t.name === 'mixamorigHips.position');
  if (!hipsPosition) return;
  const rig = cloneSkeleton(model);
  rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.set(1, 1, 1);
  const mixer = new THREE.AnimationMixer(rig), idleAction = mixer.clipAction(idle);
  idleAction.play(); mixer.setTime(0); rig.updateMatrixWorld(true);
  const points = [];
  for (const side of ['Left', 'Right']) {
    const foot = rig.getObjectByName(`mixamorig${side}Foot`), toe = rig.getObjectByName(`mixamorig${side}ToeBase`);
    if (!foot || !toe) { mixer.stopAllAction(); return; }
    // The idle foot is the ground reference. Store a point below each joint
    // in its own space so heel and toe pitch are accounted for during walking.
    for (const bone of [foot, toe]) {
      const joint = bone.getWorldPosition(new THREE.Vector3());
      const point = new THREE.Vector3(joint.x, 0, joint.z);
      points.push({ bone, local: bone.worldToLocal(point) });
    }
  }
  idleAction.stop(); const action = mixer.clipAction(clip); action.play();
  const count = 41, times = [], values = [], base = Array.from(hipsPosition.values.slice(0, 3));
  for (let i = 0; i < count; i++) {
    const time = clip.duration * i / (count - 1);
    mixer.setTime(i === count - 1 ? 0 : time); rig.updateMatrixWorld(true);
    const sole = Math.min(...points.map(({bone, local}) => bone.localToWorld(local.clone()).y));
    times.push(time); values.push(base[0], base[1] - THREE.MathUtils.clamp(sole, -.1, .1), base[2]);
  }
  action.stop(); mixer.uncacheRoot(rig);
  clip.tracks = clip.tracks.filter(t => t !== hipsPosition);
  clip.tracks.push(new THREE.VectorKeyframeTrack('mixamorigHips.position', times, values));
}

// Adapt the walk cycle to actual movement rather than joystick deflection. The
// cap avoids frantic foot animation and the dead zone stops feet at walls.
export function walkPlaybackRate(actualSpeed, sprinting = false) {
  if (actualSpeed <= .05) return 0;
  const fullSpeed = sprinting ? 6.6 : 2;
  const fullRate = sprinting ? 1 : 1.5;
  return Math.max(.35, Math.min(1.6, fullRate * actualSpeed / fullSpeed));
}

// Rotate through the shortest arc, frame-rate-independently.
export function turnTowards(current, target, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-12 * Math.max(0, dt)));
}
