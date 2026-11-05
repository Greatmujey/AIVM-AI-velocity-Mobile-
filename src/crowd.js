// City life simulation: where people walk, where they gather, when they stop to
// talk face to face, and what they say. Pure data and maths — the renderer in
// main.js only reads positions, headings and the current line of a conversation.
import { LANDMARKS, DISTRICTS, districtAt, DISTRICT_DENSITY, entrance } from './city-data.js';

export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pedestrians keep to the pavement strip beside each street. Streets are 13m
// wide on a 28m grid, blocks are 11m wide, so 7.6m from a street centre is on
// the pavement and clear of every doorway and wall.
export const LANE_OFFSET = 7.6;
export const ROAD_STEP = 28;
export const ROAD_LIMIT = 140;

export function pedestrianLanes({limit = ROAD_LIMIT, step = ROAD_STEP, offset = LANE_OFFSET} = {}) {
  const lanes = [];
  for (let road = -limit; road <= limit; road += step) {
    lanes.push({axis:'z', fixed:road - offset, from:-limit, to:limit});
    lanes.push({axis:'z', fixed:road + offset, from:-limit, to:limit});
  }
  return lanes;
}

// Plazas are the open pavement in front of every door the player can enter, so
// crowds collect exactly where the player is heading.
export function gatherSpots(places = LANDMARKS) {
  return places.map(place => {
    const door = entrance(place);
    return {x:door.x, z:door.z + 2.4, district:place.district || districtAt(place.x, place.z), radius:5.2, id:place.id};
  });
}

export const ROLES = ['civilian','civilian-female','civilian-warm','civilian-dark','civilian-elder','civilian-teen','civilian-business','civilian-child'];

// Benches and low walls where a few people always sit and watch the street.
export const BENCH_SPOTS = [
  {x:-7.8,z:17,ry:Math.PI/2},{x:7.8,z:-17,ry:-Math.PI/2},{x:-7.8,z:-34,ry:Math.PI/2},{x:7.8,z:34,ry:-Math.PI/2},
  {x:-7.8,z:-73,ry:Math.PI/2},{x:7.8,z:-73,ry:-Math.PI/2},{x:-7.8,z:73,ry:Math.PI/2},{x:7.8,z:73,ry:-Math.PI/2},
  {x:36,z:22.4,ry:0},{x:-36,z:-22.4,ry:Math.PI},{x:92,z:78.4,ry:0},{x:-92,z:-78.4,ry:Math.PI},
];

// Ambient chatter. Lines are short so a speech bubble never covers the street.
export const CHATTER = {
  market:[
    ['How much for the tomatoes?','Two thousand. Last price, I swear.'],
    ['This market is full today.','Every day is full now until the festival.'],
    ['Did the fish arrive?','Two crates, and the ice is already going.'],
    ['Move your basket, please.','Sorry, sorry. The aisle is too narrow.'],
    ['I need fabric for a dress.','Third stall, ask for Mama Nkechi.'],
  ],
  downtown:[
    ['The lift is broken again.','Twelve floors by stairs. Wonderful.'],
    ['Meeting at four, do not be late.','I am never late. You are early.'],
    ['They are racing cars tonight.','Bikes tonight. Cars on Friday.'],
    ['Did you park in the tower lot?','Two hours cost more than lunch.'],
    ['My phone is dead.','There is a socket by the diner counter.'],
  ],
  city:[
    ['You seen the new showroom?','They have a supercar behind the glass.'],
    ['Walk with me to the hub.','Only if we take the shade side.'],
    ['Somebody stole a taxi.','Down by the palms. The driver is fine.'],
    ['Are you working tonight?','Later. First I want to eat.'],
    ['The buses never stop here.','They stop when they want to.'],
  ],
  village:[
    ['The boats came in late.','The current is strong this week.'],
    ['Salt is on everything now.','My window will not close properly.'],
    ['Are you swimming?','Only up to my waist. The tide is high.'],
    ['The fish market is loud today.','Loud means fresh.'],
  ],
  harbor:[
    ['Container nine is missing.','Paperwork says it never arrived.'],
    ['Do not walk near the cranes.','I know, I know. Night shift.'],
    ['A truck is blocking dock two.','Tell the foreman, not me.'],
    ['You hear the casino is busy?','It is always busy.'],
  ],
  hills:[
    ['That climb took my breath.','Take the corner slowly on a bike.'],
    ['The lodge has hot food now.','Since when?','Since the owner came back.'],
    ['Fog comes fast up here.','Then we go down before dark.'],
  ],
  desert:[
    ['Bring water, the shade is gone.','I have two bottles.'],
    ['Somebody left a car in the sand.','It has been there since Tuesday.'],
    ['The camp diner is open.','Good. I have not eaten since morning.'],
  ],
};
export const VENDOR_CALLS = ['Fresh fish, come and see!','Cold drinks, cold drinks!','Two for one today!','Bread straight from the oven!','Phone credit here!','Look, look, best price in the city!','Hot grills, hot grills!'];
export const GREETINGS = ['Morning.','Hey, how far?','You good?','Watch the traffic.','Nice bike.','See you later.'];

export function chatterFor(district, random = Math.random) {
  const pool = CHATTER[district] || CHATTER.city;
  return pool[Math.floor(random() * pool.length) % pool.length];
}
export function vendorCall(random = Math.random) {
  return VENDOR_CALLS[Math.floor(random() * VENDOR_CALLS.length) % VENDOR_CALLS.length];
}
export function greeting(random = Math.random) {
  return GREETINGS[Math.floor(random() * GREETINGS.length) % GREETINGS.length];
}

// How many people each district holds. Denser districts feel like a city centre.
export function districtQuotas({perDistrict = DISTRICT_DENSITY, districts = DISTRICTS, base = 26} = {}) {
  const quotas = {};
  for (const district of districts) quotas[district.id] = Math.max(4, Math.round(base * (perDistrict[district.id] ?? 1)));
  return quotas;
}

// A lane that runs through a district, so people stay where they live.
function laneInDistrict(lanes, district, random, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const lane = lanes[Math.floor(random() * lanes.length) % lanes.length];
    const along = lane.from + random() * (lane.to - lane.from);
    const point = lane.axis === 'z' ? {x:lane.fixed, z:along} : {x:along, z:lane.fixed};
    if (districtAt(point.x, point.z) === district) {
      const span = 26 + random() * 34;
      return {lane, at:point, from:Math.max(lane.from, along - span / 2), to:Math.min(lane.to, along + span / 2)};
    }
  }
  return null;
}

export function createCrowd({seed = 7, base = 26, quotas = districtQuotas({base}), lanes = pedestrianLanes(), spots = gatherSpots()} = {}) {
  const random = mulberry32(seed);
  const agents = [];
  const districtIds = Object.keys(quotas);
  let id = 0;
  // The district a person belongs to is the ground they stand on, so chatter and
  // gathering always match what the player can see around them.
  const push = agent => { agent.id = id++; agent.district = districtAt(agent.x, agent.z); agents.push(agent); return agent; };
  for (const district of districtIds) {
    const districtSpots = spots.filter(spot => spot.district === district);
    const count = quotas[district];
    for (let i = 0; i < count; i++) {
      const role = ROLES[Math.floor(random() * ROLES.length) % ROLES.length];
      const speed = .95 + random() * .85;
      // A third of each district's crowd loiters around a doorway, a stall or a
      // corner; the rest walk the pavement lanes.
      const loiter = districtSpots.length > 0 && random() < (district === 'market' ? .55 : .38);
      if (loiter) {
        const spot = districtSpots[Math.floor(random() * districtSpots.length) % districtSpots.length];
        const angle = random() * Math.PI * 2, distance = random() * spot.radius;
        push({
          district, role, speed:speed * .55, mode:random() < .18 ? 'vendor' : 'stand',
          x:spot.x + Math.cos(angle) * distance, z:spot.z + Math.sin(angle) * distance,
          anchor:{x:spot.x, z:spot.z}, radius:spot.radius, ry:random() * Math.PI * 2,
          pause:random() * 3, think:random() * 6, line:null, lineUntil:0, cooldown:0, lane:null,
        });
        continue;
      }
      const found = laneInDistrict(lanes, district, random);
      if (!found) continue;
      const along = found.at;
      push({
        district, role, speed, mode:'walk',
        x:along.x, z:along.z, ry:random() * Math.PI * 2,
        lane:{axis:found.lane.axis, fixed:found.lane.axis === 'z' ? along.x : along.z, from:found.from, to:found.to},
        dir:random() < .5 ? -1 : 1, pause:random() * 4, think:random() * 8,
        anchor:null, radius:0, line:null, lineUntil:0, cooldown:random() * 4, partner:null,
      });
    }
  }
  // Sitters give the street corners a settled, watching crowd.
  for (const [index, bench] of BENCH_SPOTS.entries()) {
    const howMany = 1 + (index % 2);
    for (let seat = 0; seat < howMany; seat++) {
      push({
        district:districtAt(bench.x + seat * .8, bench.z), role:ROLES[(index + seat) % ROLES.length],
        speed:0, mode:'sit', x:bench.x + seat * .85, z:bench.z + (seat ? .3 : -.3), ry:bench.ry,
        anchor:{x:bench.x, z:bench.z}, radius:0, lane:null, pause:0,
        think:2 + random() * 8, line:null, lineUntil:0, cooldown:0, partner:null,
      });
    }
  }
  // Seed a few conversations immediately, so the city is already talking when
  // the player arrives instead of filling up over the first minute.
  seedConversations(agents, random, Math.max(6, Math.round(agents.length / 14)));
  return agents;
}

export function pairDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
export function headingTo(from, to) { return Math.atan2(-(to.x - from.x), -(to.z - from.z)); }

// Two agents face each other, stand still and trade lines until one gets bored.
export function startConversation(a, b, time, random = Math.random) {
  if (!a || !b || a === b) return false;
  if (a.mode === 'talk' || b.mode === 'talk') return false;
  if (a.cooldown > time || b.cooldown > time) return false;
  const midX = (a.x + b.x) / 2, midZ = (a.z + b.z) / 2;
  const gap = .68;
  const angle = Math.atan2(b.z - a.z, b.x - a.x) || random() * Math.PI * 2;
  a.x = midX - Math.cos(angle) * gap; a.z = midZ - Math.sin(angle) * gap;
  b.x = midX + Math.cos(angle) * gap; b.z = midZ + Math.sin(angle) * gap;
  a.ry = headingTo(a, b); b.ry = headingTo(b, a);
  const duration = 9 + random() * 12;
  const lines = chatterFor(a.district, random);
  for (const [agent, previous] of [[a, a.mode], [b, b.mode]]) {
    agent.talk = {until:time + duration, next:time + random() * 1.6, lines, turn:agent === a ? 0 : 1, previous, partner:agent === a ? b.id : a.id};
    agent.mode = 'talk'; agent.line = null; agent.lineUntil = 0;
  }
  return true;
}

export function endConversation(agent, time, random = Math.random) {
  const talk = agent.talk;
  agent.talk = null; agent.mode = talk?.previous === 'vendor' ? 'vendor' : talk?.previous || 'walk';
  agent.cooldown = time + 10 + random() * 22; agent.partner = null; agent.line = null; agent.lineUntil = 0;
  if (agent.mode === 'walk' && !agent.lane) agent.mode = 'stand';
  if (agent.mode === 'walk') agent.dir = random() < .5 ? -1 : 1;
}

export function seedConversations(agents, random = Math.random, count = 8, time = 0) {
  let made = 0, guard = 0;
  while (made < count && guard++ < count * 40) {
    const a = agents[Math.floor(random() * agents.length) % agents.length];
    if (!a || a.mode === 'talk') continue;
    // Prefer somebody from the same district standing nearby.
    let best = null, bestScore = Infinity;
    for (const b of agents) {
      if (b === a || b.mode === 'talk' || b.district !== a.district) continue;
      const distance = pairDistance(a, b);
      if (distance < 1.2 || distance > 26) continue;
      const score = distance + random() * 6;
      if (score < bestScore) { best = b; bestScore = score; }
    }
    if (best && startConversation(a, best, time, random)) made++;
  }
  return made;
}

// One step of the whole crowd. `focus` is the player, used to keep people out of
// the way of gunfire and to skip work that nobody can see.
export function stepCrowd(agents, dt, {time = 0, focus = null, flee = false, viewDistance = 90, random = Math.random} = {}) {
  const talking = [];
  for (const agent of agents) {
    const near = !focus || Math.hypot(agent.x - focus.x, agent.z - focus.z) < viewDistance;
    if (agent.mode === 'talk') {
      const talk = agent.talk;
      if (!talk || time >= talk.until) { endConversation(agent, time, random); continue; }
      if (time >= talk.next) {
        const index = talk.turn % talk.lines.length;
        const raw = talk.lines[index] || '';
        agent.line = Array.isArray(raw) ? (raw[talk.turn % raw.length] || raw[0]) : raw;
        agent.lineUntil = time + 3.6;
        talk.next = time + 3.6 + random() * 1.8;
        talk.turn += 1;
        // Face the partner again: people drift apart when they get animated.
        const partner = agents.find(other => other.id === talk.partner);
        if (partner) {
          agent.ry = headingTo(agent, partner);
          if (partner.mode === 'talk') {
            const gap = pairDistance(agent, partner);
            if (gap > 1.9) {
              const pull = (gap - 1.6) / 2;
              agent.x += (partner.x - agent.x) / gap * pull; agent.z += (partner.z - agent.z) / gap * pull;
              partner.x += (agent.x - partner.x) / gap * pull; partner.z += (agent.z - partner.z) / gap * pull;
            }
          }
        }
      }
      if (near && agent.line && time < agent.lineUntil) talking.push(agent);
      continue;
    }
    if (agent.mode === 'vendor') {
      agent.think -= dt;
      if (agent.think <= 0) { agent.think = 7 + random() * 9; agent.line = near ? vendorCall(random) : null; agent.lineUntil = time + 2.6; }
      if (near && agent.line && time < agent.lineUntil) talking.push(agent);
      continue;
    }
    // Panic: anybody close to gunfire turns and runs.
    const scared = flee && focus && Math.hypot(agent.x - focus.x, agent.z - focus.z) < 22;
    if (agent.mode === 'sit') {
      // Sitters chat too: they turn toward whoever sits next to them.
      agent.think -= dt;
      if (agent.think <= 0) { agent.think = 9 + random() * 12; agent.line = near ? greeting(random) : null; agent.lineUntil = time + 2.4; }
      if (near && agent.line && time < agent.lineUntil) talking.push(agent);
      continue;
    }
    if (agent.mode === 'stand') {
      agent.think -= dt;
      if (agent.think <= 0) {
        agent.think = 3 + random() * 6;
        if (!agent.anchor) { agent.mode = 'walk'; continue; }
        const angle = random() * Math.PI * 2, distance = random() * agent.radius;
        agent.target = {x:agent.anchor.x + Math.cos(angle) * distance, z:agent.anchor.z + Math.sin(angle) * distance};
      }
      if (agent.target) {
        const dx = agent.target.x - agent.x, dz = agent.target.z - agent.z, distance = Math.hypot(dx, dz);
        if (distance < .3) agent.target = null;
        else if (near) {
          const step = Math.min(distance, agent.speed * dt);
          agent.x += dx / distance * step; agent.z += dz / distance * step;
          agent.ry = headingTo(agent, {x:agent.x + dx, z:agent.z + dz});
        }
      }
      // Somebody walking past can be stopped for a chat.
      if (!scared && near && agent.cooldown < time && random() < dt * .5) {
        for (const other of agents) {
          if (other === agent || other.mode === 'talk' || other.district !== agent.district) continue;
          if (other.mode !== 'walk' && other.mode !== 'stand') continue;
          if (pairDistance(agent, other) < 2.6 && other.cooldown < time) { startConversation(agent, other, time, random); break; }
        }
      }
      continue;
    }
    // mode === 'walk'
    if (!agent.lane) { agent.mode = 'stand'; continue; }
    if (agent.pause > 0) { agent.pause -= dt; continue; }
    const lane = agent.lane;
    if (scared) {
      agent.dir = (lane.axis === 'z' ? agent.z - focus.z : agent.x - focus.x) >= 0 ? 1 : -1;
      agent.speed = Math.max(agent.speed, 3.4);
    }
    const value = lane.axis === 'z' ? agent.z : agent.x;
    const step = agent.speed * dt * agent.dir;
    const next = value + step;
    if (next > lane.to || next < lane.from) {
      agent.dir *= -1;
      agent.pause = random() < .35 ? .6 + random() * 2.4 : 0;
    } else if (lane.axis === 'z') agent.z = next; else agent.x = next;
    agent.ry = lane.axis === 'z'
      ? (agent.dir > 0 ? Math.PI : 0)
      : (agent.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    if (random() < dt * .06) agent.pause = .8 + random() * 2.2;
  }
  return talking;
}

// The conversations close enough to the player to deserve a speech bubble.
export function nearestConversations(agents, focus, {limit = 3, radius = 19} = {}) {
  if (!focus) return [];
  const talkingAgents = agents.filter(agent => (agent.mode === 'talk' || agent.mode === 'vendor') && agent.line);
  const scored = talkingAgents
    .map(agent => ({agent, distance:Math.hypot(agent.x - focus.x, agent.z - focus.z)}))
    .filter(item => item.distance < radius)
    .sort((a, b) => a.distance - b.distance);
  // One bubble per pair, shown on whoever spoke last.
  const seen = new Set(), result = [];
  for (const item of scored) {
    const key = item.agent.talk ? `pair-${Math.min(item.agent.id, item.agent.talk.partner)}-${Math.max(item.agent.id, item.agent.talk.partner)}` : `solo-${item.agent.id}`;
    if (seen.has(key)) continue;
    seen.add(key); result.push(item.agent);
    if (result.length >= limit) break;
  }
  return result;
}

export function crowdCount(agents) {
  const byDistrict = {};
  for (const agent of agents) byDistrict[agent.district] = (byDistrict[agent.district] || 0) + 1;
  return {total:agents.length, byDistrict};
}
