// The playable city is bounded by -100..100 in both world axes. Keep the full
// map north-up, with a small margin around those bounds for symbols and labels.
export const MAP_BOUND = 105;
export function worldToMap(x, z, size, bound = MAP_BOUND) {
  return { x: (x + bound) * size / (bound * 2), y: (z + bound) * size / (bound * 2) };
}

export function drawFullMap(canvas, { blocks, position, target, route, enemies, vehicles, cameraYaw }) {
  const ctx = canvas.getContext('2d'), size = canvas.width, scale = size / (MAP_BOUND * 2);
  const point = p => worldToMap(p.x, p.z, size);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#314640'; ctx.fillRect(0, 0, size, size);
  // District backgrounds follow the actual north/south division in world.js.
  const band = (top, bottom, color) => { ctx.fillStyle = color; ctx.fillRect(0, point({x:0,z:top}).y, size, (bottom-top)*scale); };
  band(-105, -14, '#354949'); band(-14, 14, '#4b5345'); band(14, 105, '#495b49');
  ctx.fillStyle = '#7d8982';
  for (let road = -84; road <= 84; road += 28) {
    const p = point({x:road,z:road});
    ctx.fillRect(p.x - 6.5*scale, 0, 13*scale, size);
    ctx.fillRect(0, p.y - 6.5*scale, size, 13*scale);
  }
  // Building footprints are taken from the collision map, not invented blocks.
  ctx.fillStyle = '#1c302e';
  for (const block of blocks) {
    const p = point(block);
    ctx.fillRect(p.x-block.halfX*scale, p.y-block.halfZ*scale, block.halfX*2*scale, block.halfZ*2*scale);
  }
  if (route.length > 1) {
    ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b2921'; ctx.beginPath();
    route.forEach((p,i) => {const v=point(p); if(i===0)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y)}); ctx.stroke();
    ctx.strokeStyle = '#c9fc51'; ctx.lineWidth = 5; ctx.stroke();
  }
  // Parked and occupied rideable vehicles, live enemies and the current objective.
  for (const v of vehicles) {
    const p = point(v.mesh.position); ctx.fillStyle = '#72cbeb'; ctx.fillRect(p.x-6,p.y-6,12,12);
  }
  ctx.fillStyle = '#ff806d';
  for (const e of enemies) if (e.alive) { const p=point(e.mesh.position); ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill(); }
  const goal=point(target); ctx.save();ctx.translate(goal.x,goal.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#c9fc51';ctx.strokeStyle='#1a251b';ctx.lineWidth=3;ctx.fillRect(-10,-10,20,20);ctx.strokeRect(-10,-10,20,20);ctx.restore();
  const player=point(position);ctx.save();ctx.translate(player.x,player.y);ctx.rotate(-cameraYaw);ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(10,10);ctx.lineTo(0,6);ctx.lineTo(-10,10);ctx.closePath();ctx.fillStyle='#fff';ctx.strokeStyle='#1a251b';ctx.lineWidth=3;ctx.fill();ctx.stroke();ctx.restore();
}
