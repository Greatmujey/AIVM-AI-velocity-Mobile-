import * as THREE from 'three';

// The source walk's first arm key does not match its loop, and its steps are
// unusually high. Ease rotations toward the same model's upright idle pose
// and join both ends of the loop. Never mutate the cached source clips.
export function makeNaturalWalkClip(walk, idle) {
  const clip = walk.clone();
  clip.name = 'NaturalWalk';
  const idleTracks = new Map(idle.tracks.map(track => [track.name, track]));
  for (const track of clip.tracks) {
    if (track.ValueTypeName !== 'quaternion' || track.times.length < 3) continue;
    const rest = idleTracks.get(track.name);
    if (!rest || rest.values.length < 4) continue;
    const weight = /(?:UpLeg|LeftLeg|RightLeg)\.quaternion$/.test(track.name) ? .7
      : /(?:Arm|ForeArm)\.quaternion$/.test(track.name) ? .7 : .8;
    const base = new THREE.Quaternion().fromArray(rest.values).normalize();
    const pose = new THREE.Quaternion();
    for (let i = 0; i < track.values.length; i += 4) {
      pose.fromArray(track.values, i).normalize();
      pose.slerp(base, 1 - weight).normalize().toArray(track.values, i);
    }
    const last = track.values.length - 4;
    const seam = new THREE.Quaternion().fromArray(track.values, last).slerp(new THREE.Quaternion().fromArray(track.values, 4), .5).normalize();
    seam.toArray(track.values, 0);
    seam.toArray(track.values, last);
  }
  return clip;
}

// Adapt the walk cycle to actual movement rather than joystick deflection. The
// cap avoids frantic foot animation and the dead zone stops feet at walls.
export function walkPlaybackRate(actualSpeed, sprinting = false) {
  if (actualSpeed <= .05) return 0;
  const fullSpeed = sprinting ? 6.6 : 2.4;
  const fullRate = sprinting ? 1 : 1.35;
  return Math.max(.35, Math.min(1.5, fullRate * actualSpeed / fullSpeed));
}

// Rotate through the shortest arc, frame-rate-independently.
export function turnTowards(current, target, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-12 * Math.max(0, dt)));
}
