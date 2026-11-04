// Computer racers drive the same checkpoint line as a human, so solo and
// online races can be filled out without another device.
import { currentCheckpoint, CHECKPOINT_RADIUS } from './race.js';

export function botTarget(racer, checkpoints, step) {
  const point = checkpoints[Math.min(step, checkpoints.length - 1)];
  if (!point) return null;
  return { x: point.x + (racer.lane || 0) * 2.4, z: point.z + (racer.lane || 0) * 1.2 };
}
// Moves a bot toward its checkpoint at a speed a player can beat but feel.
export function advanceBot(racer, checkpoints, dt, { speed = 12.5, blocks = [], movePosition = null } = {}) {
  const target = botTarget(racer, checkpoints, racer.step);
  if (!target) return 0;
  const dx = target.x - racer.x, dz = target.z - racer.z, distance = Math.hypot(dx, dz);
  if (distance < .01) return 0;
  // Bots hesitate slightly on corners so races stay close but winnable.
  const slowdown = distance < 6 ? .55 : 1;
  const step = Math.min(distance, speed * slowdown * dt);
  const nx = dx / distance * step, nz = dz / distance * step;
  if (movePosition) movePosition(racer, nx, nz, blocks, .6); else { racer.x += nx; racer.z += nz; }
  racer.r = Math.atan2(-dx, -dz);
  return step;
}
// Which checkpoint a bot has reached, using the same radius as human racers.
export function botCheckpointReached(racer, checkpoints, step, radius = CHECKPOINT_RADIUS) {
  const point = checkpoints[Math.min(step, checkpoints.length - 1)];
  return !!point && Math.hypot(racer.x - point.x, racer.z - point.z) <= radius;
}
export { currentCheckpoint };
