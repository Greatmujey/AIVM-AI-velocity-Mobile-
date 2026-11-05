// People talk with their hands. The character rigs have no "talk" clip, so arms,
// shoulders and head are animated procedurally while a conversation is running.
// Call this AFTER the animation mixer has updated for the frame.
export function talkRig(group) {
  if (!group) return null;
  if (group.userData.talkRig !== undefined) return group.userData.talkRig;
  const model = group.userData.model || null;
  const pick = name => model?.getObjectByName?.(name) || null;
  const left = pick('mixamorigLeftArm') || group.userData.leftArm || null;
  const right = pick('mixamorigRightArm') || group.userData.rightArm || null;
  const head = pick('mixamorigHead') || null;
  const rig = (!left && !right) ? null : {
    left, right, head,
    base:{
      lx:left?.rotation.x ?? 0, ly:left?.rotation.y ?? 0, lz:left?.rotation.z ?? 0,
      rx:right?.rotation.x ?? 0, ry:right?.rotation.y ?? 0, rz:right?.rotation.z ?? 0,
      hx:head?.rotation.x ?? 0, hy:head?.rotation.y ?? 0, hz:head?.rotation.z ?? 0,
    },
    phase:Math.random() * Math.PI * 2,
    style:Math.random() < .5 ? 'both' : 'one',
  };
  group.userData.talkRig = rig;
  return rig;
}

// `amount` 0..1 blends between standing still and an animated explanation.
export function applyTalkGesture(group, time, amount = 1) {
  const rig = talkRig(group);
  if (!rig || amount <= 0) return false;
  const {base} = rig, t = time * 2.4 + rig.phase;
  const swing = Math.sin(t) * .34 * amount, lift = (Math.sin(t * .9) * .5 + .5) * .5 * amount;
  if (rig.left) {
    rig.left.rotation.x = base.lx - (rig.style === 'both' ? lift * .9 : lift * .35);
    rig.left.rotation.z = base.lz + (rig.style === 'both' ? swing * .7 : swing * .25);
    rig.left.rotation.y = base.ly + swing * .3;
  }
  if (rig.right) {
    rig.right.rotation.x = base.rx - lift;
    rig.right.rotation.z = base.rz - swing * .8;
    rig.right.rotation.y = base.ry - swing * .35;
  }
  if (rig.head) {
    // A small nod and tilt reads as "listening" or "insisting".
    rig.head.rotation.x = base.hx + Math.sin(t * 1.7) * .09 * amount;
    rig.head.rotation.y = base.hy + Math.sin(t * .53) * .22 * amount;
    rig.head.rotation.z = base.hz + Math.sin(t * .8) * .05 * amount;
  }
  return true;
}

// Lean the whole body a few degrees toward whoever they are talking to.
export function faceOffset(group, targetYaw, weight = 1) {
  if (!group || !Number.isFinite(targetYaw)) return;
  const current = group.rotation.y;
  let delta = Math.atan2(Math.sin(targetYaw - current), Math.cos(targetYaw - current));
  group.rotation.y = current + delta * Math.min(1, weight);
}
