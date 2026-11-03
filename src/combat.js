import { hasLineOfSight } from './navigation.js';

// Aim assist only selects targets within the camera's forward cone and line of sight.
export function selectAimTarget(origin, cameraYaw, candidates, range, blocks, cone = Math.PI / 3) {
  let best = null, bestScore = Infinity;
  const forwardX = -Math.sin(cameraYaw), forwardZ = -Math.cos(cameraYaw);
  for (const enemy of candidates) {
    if (!enemy.alive) continue;
    const pos = enemy.mesh.position, dx = pos.x-origin.x, dz = pos.z-origin.z;
    const distance = Math.hypot(dx,dz);
    if (distance < .01 || distance > range) continue;
    const angle = Math.acos(Math.max(-1,Math.min(1,(dx*forwardX+dz*forwardZ)/distance)));
    if (angle > cone || !hasLineOfSight(origin,pos,blocks)) continue;
    const score = angle * 15 + distance;
    if (score < bestScore) { best=enemy; bestScore=score; }
  }
  return best;
}
