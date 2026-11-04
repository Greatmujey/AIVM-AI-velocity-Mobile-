import { CITY_BOUND, ROAD_LIMIT, LANDMARKS, DISTRICTS, entrance } from './city-data.js';
// The playable city is bounded by -100..100 in both world axes. Keep the full
// map north-up, with a small margin around those bounds for symbols and labels.
export const MAP_BOUND = CITY_BOUND + 5;
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
  band(-MAP_BOUND, MAP_BOUND, '#777d67');
  const districtRect=(x1,z1,x2,z2,color)=>{const a=point({x:x1,z:z1}),b=point({x:x2,z:z2});ctx.fillStyle=color;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y)};
  districtRect(-MAP_BOUND,-MAP_BOUND,-56,0,'#3f6c78');districtRect(56,-MAP_BOUND,MAP_BOUND,0,'#618465');
  districtRect(-MAP_BOUND,0,-56,MAP_BOUND,'#b28e65');districtRect(56,0,MAP_BOUND,MAP_BOUND,'#8ca578');
  ctx.fillStyle = '#7d8982';
  for (let road = -ROAD_LIMIT; road <= ROAD_LIMIT; road += 28) {
    const p = point({x:road,z:road});
    ctx.fillRect(p.x - 6.5*scale, 0, 13*scale, size);
    ctx.fillRect(0, p.y - 6.5*scale, size, 13*scale);
  }
  // Building footprints are taken from the collision map, not invented blocks.
  ctx.fillStyle = '#334d4a';
  for (const block of blocks) {
    const p = point(block);
    ctx.fillRect(p.x-block.halfX*scale, p.y-block.halfZ*scale, block.halfX*2*scale, block.halfZ*2*scale);
  }
  // District pins share the same coordinates used by the selector and GPS.
  for(const district of DISTRICTS){const p=point(district);ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.fillStyle=district.color;ctx.fill();ctx.strokeStyle='#172a25';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#172a25';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(({city:'G',village:'V',harbor:'P',hills:'L',desert:'D'})[district.id],p.x,p.y+1)}
  // Key destinations are anchored to the real entrance points.
  for (const place of LANDMARKS) {
    const p = point(entrance(place)); ctx.beginPath(); ctx.arc(p.x,p.y,12,0,Math.PI*2);
    ctx.fillStyle=place.color;ctx.fill();ctx.strokeStyle='#182925';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#122b25';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(({home:'H',hub:'M',friend:'F',church:'C',mosque:'Q',hotel:'T',shop:'S',casino:'$'})[place.id],p.x,p.y+1);
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
