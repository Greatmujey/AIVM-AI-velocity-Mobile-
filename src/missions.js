// Extra story jobs. Each mission is a small sequence of steps that the main
// loop advances; nothing here touches rendering, so the logic is testable.
// A step either reaches a place, clears enemies, or follows a vehicle.
export const SIDE_MISSIONS = {
  patrol: {
    name:'NIGHT PATROL', description:'Walk the waterfront beats and check every alley.', reward:900,
    steps:[
      {kind:'reach', label:'Check the harbour alley', point:{x:-56,z:-56}},
      {kind:'clear', label:'Clear the loiterers', count:3, spawns:[[-56,-62],[-63,-56],[-49,-58]]},
      {kind:'reach', label:'Report back at the mission hub', point:{x:14,z:22}},
    ],
  },
  chase: {
    name:'RUNAWAY COURIER', description:'A stolen van is heading for the hills. Catch it.', reward:1100,
    steps:[
      {kind:'chase', label:'Catch the stolen van', target:{x:56,z:-56}, follow:[[56,-56],[84,-56],[112,-56],[112,-84],[112,-112]]},
      {kind:'reach', label:'Recover the parcel at the overlook', point:{x:112,z:-112}},
      {kind:'reach', label:'Deliver it to the shop', point:{x:42,z:50}},
    ],
  },
  guard: {
    name:'SHOP WATCH', description:'Guard the Palm Grove shop through the evening rush.', reward:1000,
    steps:[
      {kind:'reach', label:'Get to the shop front', point:{x:42,z:50}},
      {kind:'clear', label:'Hold off the break-in crew', count:4, spawns:[[36,50],[42,56],[48,50],[42,44]]},
      {kind:'reach', label:'Walk the owner home', point:{x:-14,z:22}},
    ],
  },
  delivery: {
    name:'DESERT RUN', description:'Long haul out to the desert settlement and back.', reward:800,
    steps:[
      {kind:'reach', label:'Collect crates at the village', point:{x:112,z:84}},
      {kind:'reach', label:'Cross to the sandy outskirts', point:{x:-112,z:84}},
      {kind:'reach', label:'Return the paperwork to the hub', point:{x:14,z:22}},
    ],
  },
};
export const SIDE_MISSION_IDS = Object.keys(SIDE_MISSIONS);

export function createSideMission(id) {
  const definition = SIDE_MISSIONS[id];
  if (!definition) return null;
  return {id, name:definition.name, description:definition.description, reward:definition.reward, step:0, cleared:0, done:false};
}
export function sideMissionTarget(mission) {
  if (!mission || mission.done) return null;
  const step = SIDE_MISSIONS[mission.id]?.steps[mission.step];
  if (!step) return null;
  return step.point || (step.target ? {x:step.target.x, z:step.target.z} : null);
}
export function sideMissionObjective(mission) {
  if (!mission) return '';
  const step = SIDE_MISSIONS[mission.id]?.steps[mission.step];
  return step ? step.label : '';
}
export function sideMissionCounter(mission) {
  const step = mission && SIDE_MISSIONS[mission.id]?.steps[mission.step];
  if (!step || step.kind !== 'clear') return null;
  return `${step.label.toUpperCase()}  ${Math.min(mission.cleared, step.count)} / ${step.count}`;
}
// Advance when the player reaches the step point or clears enough targets.
export function advanceSideMission(mission, position, cleared = mission?.cleared || 0, radius = 5, forced = false) {
  if (!mission || mission.done) return null;
  const step = SIDE_MISSIONS[mission.id]?.steps[mission.step];
  if (!step) { mission.done = true; return 'complete'; }
  const reached = position && step.point && Math.hypot(position.x - step.point.x, position.z - step.point.z) <= radius;
  const clearedEnough = step.kind === 'clear' && cleared >= step.count;
  if (!reached && !clearedEnough && !forced) return null;
  mission.step++;
  mission.cleared = 0;
  if (mission.step >= SIDE_MISSIONS[mission.id].steps.length) { mission.done = true; return 'complete'; }
  return 'step';
}
// The chase step follows a moving van along a fixed route.
export function advanceChase(chase, dt, blocks = [], move) {
  if (!chase || chase.done) return null;
  while (chase.points.length > 1 && Math.hypot(chase.points[1].x - chase.x, chase.points[1].z - chase.z) < 2) chase.points.shift();
  const next = chase.points[1];
  if (!next) { chase.done = true; return 'done'; }
  const dx = next.x - chase.x, dz = next.z - chase.z, distance = Math.hypot(dx, dz), step = Math.min(distance, (chase.speed || 10) * dt);
  const nx = dx / distance * step, nz = dz / distance * step;
  if (move) move(chase, nx, nz, blocks, .8); else { chase.x += nx; chase.z += nz }
  chase.yaw = Math.atan2(-dx, -dz);
  return 'move';
}
export function chaseCaught(chase, position, radius = 8) {
  return !!chase && !chase.done && Math.hypot(chase.x - position.x, chase.z - position.z) <= radius;
}
