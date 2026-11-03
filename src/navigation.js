// Collision and input math are independent from rendering, so they can be tested.
export function blocked(x, z, blocks, padding = 0) {
  return blocks.some(b => Math.abs(x - b.x) < b.halfX + padding && Math.abs(z - b.z) < b.halfZ + padding);
}
export function movePosition(position, dx, dz, blocks, padding = 0) {
  const x = Math.max(-100, Math.min(100, position.x + dx));
  const z = Math.max(-100, Math.min(100, position.z + dz));
  const beforeX = position.x, beforeZ = position.z;
  if (!blocked(x, position.z, blocks, padding)) position.x = x;
  if (!blocked(position.x, z, blocks, padding)) position.z = z;
  return Math.hypot(position.x - beforeX, position.z - beforeZ);
}
export function hasLineOfSight(a, b, blocks) {
  // Segment against each building rectangle (slab intersection).
  return !blocks.some(({x,z,halfX,halfZ}) => {
    let low=0, high=1;
    for (const [start,delta,min,max] of [[a.x,b.x-a.x,x-halfX,x+halfX],[a.z,b.z-a.z,z-halfZ,z+halfZ]]) {
      if (Math.abs(delta)<1e-8) { if (start<min || start>max) return false; continue; }
      let t1=(min-start)/delta, t2=(max-start)/delta;
      if(t1>t2)[t1,t2]=[t2,t1];
      low=Math.max(low,t1);high=Math.min(high,t2);
      if(low>high)return false;
    }
    return true;
  });
}
export function relativeMovement(x, z, yaw) {
  return {x:x*Math.cos(yaw)+z*Math.sin(yaw), z:-x*Math.sin(yaw)+z*Math.cos(yaw)};
}
// Angle relative to the camera: up is the direction the camera faces.
export function objectiveDirection(dx, dz, cameraYaw) {
  return Math.atan2(dx, -dz) + cameraYaw;
}
