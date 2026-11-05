import { movePosition } from './navigation.js';

// Follow a street-network route, without overshooting junctions or clipping walls.
export function advancePursuit(position, route, dt, blocks, speed = 11) {
  while (route.length > 1 && Math.hypot(route[1].x-position.x,route[1].z-position.z) <= 1.2) route.shift();
  const next = route[1];
  if (!next) return null;
  const dx=next.x-position.x,dz=next.z-position.z,distance=Math.hypot(dx,dz);
  const step=Math.min(distance,speed*dt);
  movePosition(position,dx/distance*step,dz/distance*step,blocks,.6);
  return Math.atan2(-dx,-dz);
}
