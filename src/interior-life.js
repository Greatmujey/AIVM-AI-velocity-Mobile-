import { mulberry32 } from './crowd.js';

// The people inside a room are not statues: they mill about between the places
// the room furnishes, stop to talk in facing pairs, and step out through the
// door while somebody else comes in from the street. Pure simulation — the
// renderer only copies positions, so this can be tested headlessly.
export const DOOR = { x: 0, z: 5.2 };
const BOUNDS = { x: 5.9, zMin: -5.9, zMax: 5.4 };
const WALK_SPEED = 1.15;
export const heading = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));

export function createInteriorLife(spots, { seed = 1, minPeople = 2 } = {}) {
  const random = mulberry32(seed);
  const agents = spots.map((spot, i) => ({
    id: i, x: spot.x, z: spot.z, ry: spot.ry, role: spot.role, spot: i,
    mode: 'stand', wait: 1 + random() * 5, think: 2 + random() * 5, talkUntil: 0,
    partner: null, target: null, intent: null, outUntil: 0, phase: random() * 6,
  }));
  // Two regulars are already mid-chat when the door opens: stand them side by
  // side so the first conversation starts within seconds, not a minute.
  if (agents.length >= 2 && spots.length) {
    const a0 = agents[0], a1 = agents[1];
    const len = Math.hypot(a0.x, a0.z) || 1;
    a1.x = a0.x + (-a0.x / len) * 1.2; a1.z = a0.z + (-a0.z / len) * 1.2;
    a1.spot = -1;
    for (const a of [a0, a1]) { a.mode = 'stand'; a.wait = .6 + random() * 1.2; a.think = 2 + random() * 2; }
    a0.ry = heading(a0, a1); a1.ry = heading(a1, a0);
  }
  // And somebody is always on their way out as you come in, so the doorway
  // itself is part of the show.
  if (agents.length >= 3) {
    const a2 = agents[2];
    a2.mode = 'walk'; a2.intent = 'out'; a2.wait = 0; a2.think = 0;
    a2.target = { x: DOOR.x, z: DOOR.z, spot: -1 };
  }
  // A room with a single occupant still gets a walker, so every door you open
  // reveals somebody moving.
  while (agents.length < minPeople) {
    const i = agents.length;
    agents.push({
      id: i, x: DOOR.x, z: DOOR.z - .4, ry: 0, role: 'civilian', spot: -1,
      mode: 'walk', wait: 0, think: 0, talkUntil: 0, partner: null, intent: null, outUntil: 0, phase: random() * 6,
      target: pickPoint(agents, spots, random),
    });
  }
  return agents;
}

function pickPoint(agents, spots, random) {
  if (spots.length && random() < .8) {
    for (let tries = 0; tries < 6; tries++) {
      const spot = spots[Math.floor(random() * spots.length)];
      const taken = agents.some(a => a.mode !== 'out' && Math.hypot(a.x - spot.x, a.z - spot.z) < .7)
        || agents.some(a => a.target && Math.hypot(a.target.x - spot.x, a.target.z - spot.z) < .7);
      if (!taken) return { x: spot.x, z: spot.z, spot: spots.indexOf(spot) };
    }
  }
  if (spots.length) {
    const spot = spots[Math.floor(random() * spots.length)];
    return { x: spot.x + (random() - .5) * .9, z: spot.z + (random() - .5) * .9, spot: -1 };
  }
  return { x: (random() * 2 - 1) * 2, z: (random() * 2 - 1) * 1.5, spot: -1 };
}
const visible = agents => agents.filter(a => a.mode !== 'out').length;
const leaving = agents => agents.filter(a => a.mode === 'out' || (a.mode === 'walk' && a.intent === 'out')).length;

// Advances the room and returns door events so the street can mirror them:
// {type:'exit'|'enter', id} — somebody left onto the pavement / came in.
export function stepInteriorLife(agents, spots, dt, { time, random = Math.random }) {
  const events = [];
  for (const agent of agents) {
    agent.phase += dt;
    if (agent.mode === 'out') {
      if (time >= agent.outUntil) {
        agent.mode = 'walk'; agent.x = DOOR.x; agent.z = DOOR.z - .3; agent.intent = null;
        agent.target = pickPoint(agents, spots, random);
        agent.ry = heading(agent, agent.target);
        events.push({ type: 'enter', id: agent.id });
      }
      continue;
    }
    if (agent.mode === 'talk') {
      const partner = agents.find(a => a.id === agent.partner);
      if (!partner || partner.mode !== 'talk' || partner.partner !== agent.id) { agent.mode = 'stand'; agent.wait = 1 + random() * 3; agent.think = time + agent.wait + 1 + random() * 3; agent.partner = null; continue }
      agent.ry = heading(agent, partner);
      if (time >= agent.talkUntil) { agent.mode = 'stand'; agent.wait = 1 + random() * 4; agent.think = time + agent.wait + 1 + random() * 4; agent.partner = null; partner.partner = null }
      continue;
    }
    if (agent.mode === 'walk') {
      const dx = agent.target.x - agent.x, dz = agent.target.z - agent.z, dist = Math.hypot(dx, dz);
      if (dist < .12) {
        agent.x = agent.target.x; agent.z = agent.target.z;
        if (agent.intent === 'out') {
          agent.mode = 'out'; agent.outUntil = time + 8 + random() * 14; agent.spot = -1;
          events.push({ type: 'exit', id: agent.id });
        } else {
          agent.mode = 'stand'; agent.spot = agent.target.spot ?? -1;
          agent.wait = 2 + random() * 7; agent.think = time + agent.wait + 2 + random() * 5;
        }
        continue;
      }
      const step = Math.min(dist, WALK_SPEED * dt);
      agent.x += dx / dist * step; agent.z += dz / dist * step;
      agent.ry = heading(agent, agent.target);
      agent.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, agent.x));
      agent.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, agent.z));
      continue;
    }
    // standing: look around, chat, wander, or head for the door. Once the wait
    // runs out the person lingers (available for a chat) until their think time.
    agent.wait -= dt;
    if (agent.wait > 0) continue;
    if (time < agent.think) continue;
    const roll = random();
    const near = agents.find(a => a !== agent && a.mode === 'stand' && a.wait <= .3 && Math.hypot(a.x - agent.x, a.z - agent.z) < 2.6 && Math.hypot(a.x - agent.x, a.z - agent.z) > .5);
    if (near && roll < .5) {
      const until = time + 6 + random() * 9;
      agent.mode = near.mode = 'talk'; agent.partner = near.id; near.partner = agent.id; near.wait = 0;
      events.push({ type: 'talk', id: agent.id });
      agent.talkUntil = near.talkUntil = until;
      agent.ry = heading(agent, near); near.ry = heading(near, agent);
      continue;
    }
    if (roll < .58) {
      agent.mode = 'walk'; agent.intent = null;
      const company = agents.filter(a => a !== agent && a.mode !== 'out');
      if (company.length && random() < .45) {
        const other = company[Math.floor(random() * company.length)];
        const angle = random() * Math.PI * 2, gap = .9 + random() * .7;
        agent.target = {
          x: Math.max(-BOUNDS.x, Math.min(BOUNDS.x, other.x + Math.cos(angle) * gap)),
          z: Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, other.z + Math.sin(angle) * gap)),
          spot: -1,
        };
      } else agent.target = pickPoint(agents, spots, random);
      continue;
    }
    if (roll < .74 && leaving(agents) < Math.max(1, agents.length - 2)) { agent.mode = 'walk'; agent.intent = 'out'; agent.target = { x: DOOR.x, z: DOOR.z, spot: -1 }; continue }
    agent.wait = 1.5 + random() * 4; agent.think = time + agent.wait + 2 + random() * 5;
    agent.ry += (random() - .5) * 1.4;
  }
  return events;
}

export function interiorVisible(agents) { return visible(agents) }
