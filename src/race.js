// Race rules shared by solo, computer and online races. Pure functions only, so
// the same logic runs on the host, on joining devices and in Node tests.
export const MAX_RACERS = 5;
export const COUNTDOWN_MS = 4000;
export const CHECKPOINT_RADIUS = 7;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Checkpoints sit on road intersections of the existing city grid.
// Car races and bike races are separate disciplines: separate tracks, separate
// rooms, separate codes and separate prizes. A bike room never mixes with cars.
export const RACE_TRACKS = {
  city: {name:'CITY CIRCUIT', class:'car', checkpoints:[{x:0,z:0},{x:0,z:-56},{x:56,z:-56},{x:56,z:0},{x:0,z:0}]},
  downtown: {name:'DOWNTOWN NIGHT LOOP', class:'car', checkpoints:[{x:-28,z:-56},{x:28,z:-56},{x:28,z:-140},{x:-28,z:-140},{x:-28,z:-56}]},
  coast: {name:'VILLAGE SPRINT', class:'car', checkpoints:[{x:56,z:56},{x:112,z:56},{x:112,z:112},{x:56,z:112},{x:56,z:56}]},
  port: {name:'PORT LOOP', class:'car', checkpoints:[{x:-56,z:-56},{x:-56,z:-112},{x:-112,z:-112},{x:-112,z:-56},{x:-56,z:-56}]},
  hills: {name:'HILL RUN', class:'car', checkpoints:[{x:56,z:-56},{x:56,z:-112},{x:112,z:-112},{x:112,z:-56},{x:56,z:-56}]},
  desert: {name:'DESERT DASH', class:'car', checkpoints:[{x:-56,z:56},{x:-112,z:56},{x:-112,z:112},{x:-56,z:112},{x:-56,z:56}]},
  // Bike-only courses: tighter turns, back streets and trails a car cannot use.
  alley: {name:'MARKET ALLEY TT', class:'bike', checkpoints:[{x:28,z:28},{x:28,z:56},{x:56,z:56},{x:56,z:28},{x:28,z:28}]},
  boardwalk: {name:'BOARDWALK BIKE RUN', class:'bike', checkpoints:[{x:84,z:56},{x:112,z:56},{x:140,z:84},{x:112,z:112},{x:84,z:56}]},
  docklane: {name:'DOCK LANE SPRINT', class:'bike', checkpoints:[{x:-56,z:-56},{x:-84,z:-84},{x:-112,z:-56},{x:-84,z:-28},{x:-56,z:-56}]},
  ridge: {name:'RIDGE CLIMB TT', class:'bike', checkpoints:[{x:56,z:-56},{x:84,z:-84},{x:112,z:-56},{x:84,z:-28},{x:56,z:-56}]},
  trail: {name:'DESERT TRAIL RIDE', class:'bike', checkpoints:[{x:-84,z:56},{x:-56,z:84},{x:-84,z:112},{x:-112,z:84},{x:-84,z:56}]},
  downtownBike: {name:'TOWER UNDERPASS', class:'bike', checkpoints:[{x:-28,z:-84},{x:0,z:-112},{x:28,z:-84},{x:0,z:-56},{x:-28,z:-84}]},
};
export const TRACK_IDS = Object.keys(RACE_TRACKS);
export const trackById = id => RACE_TRACKS[id] || null;

// Two racing disciplines. Bikes get their own tracks, prizes and handling.
export const RACE_CLASSES = {
  car: {id:'car', label:'CAR RACES', short:'CARS', blurb:'Five-car grids on the city circuits.', prizes:[400,250,150]},
  bike: {id:'bike', label:'BIKE RACES', short:'BIKES', blurb:'Bike-only courses: tighter turns, quicker starts.', prizes:[300,200,120]},
};
export const RACE_CLASS_IDS = Object.keys(RACE_CLASSES);
export function normalizeRaceClass(value) { return String(value || '').trim().toLowerCase() === 'bike' ? 'bike' : 'car'; }
export function classOfTrack(id) { return normalizeRaceClass(RACE_TRACKS[id]?.class); }
export function tracksForClass(cls) { const c = normalizeRaceClass(cls); return TRACK_IDS.filter(id => RACE_TRACKS[id].class === c); }
export function defaultTrackFor(cls) { return tracksForClass(cls)[0] || TRACK_IDS[0]; }
// A room code carries its class, so a bike code cannot be joined by a car room.
export const PEER_PREFIX = 'aivm-race-v2-';
export function roomPeerId(code, cls = 'car') {
  return `${PEER_PREFIX}${normalizeRaceClass(cls)}-${staticRoomCode(code)}`;
}
export function prizeFor(cls, place) {
  const prizes = RACE_CLASSES[normalizeRaceClass(cls)]?.prizes || RACE_CLASSES.car.prizes;
  return prizes[Math.max(0, Math.min(prizes.length - 1, place - 1))] ?? prizes.at(-1);
}

export function makeRoomCode(random = Math.random, length = 5) {
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return code;
}
// Codes are spoken and typed on phones, so ignore spaces, dashes and case.
export function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z2-9]/g, '').replace(/[01IO]/g, '').slice(0, 5);
}
export function staticRoomCode(code) {
  return normalizeCode(code).padEnd(5, '0').slice(0, 5);
}

// One racer's checkpoint state. A race is a loop; the last checkpoint is the
// finish line, so a one-lap race ends when it is crossed.
export function createRaceState(trackId, {laps = 1} = {}) {
  const track = trackById(trackId);
  if (!track) return null;
  return {trackId, checkpoints:track.checkpoints.map(p => ({...p})), step:0, lap:0, laps:Math.max(1, laps), finished:false, finishTime:null};
}
export function currentCheckpoint(state) {
  if (!state || state.finished) return null;
  return state.checkpoints[state.step] || null;
}
export function advanceCheckpoint(state, position, radius = CHECKPOINT_RADIUS) {
  if (!state || state.finished) return null;
  const point = currentCheckpoint(state);
  if (!point || Math.hypot(position.x - point.x, position.z - point.z) > radius) return null;
  if (state.step < state.checkpoints.length - 1) { state.step++; return 'checkpoint'; }
  if (state.lap + 1 >= state.laps) { state.finished = true; return 'finish'; }
  state.lap++; state.step = 0; return 'lap';
}
export function formatRaceTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--:--';
  const total = Math.floor(ms / 1000), minutes = Math.floor(total / 60), seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
// Staggered grid behind the start line, ordered so the host starts front-left.
export function startGrid(track, index = 0) {
  const [a, b] = track.checkpoints;
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
  const ux = dx / length, uz = dz / length, row = Math.floor(index / 2), side = index % 2 === 0 ? -1 : 1;
  return {x:a.x - ux * (4 + row * 5.5) + -uz * side * 3, z:a.z - uz * (4 + row * 5.5) + ux * side * 3, yaw:Math.atan2(-ux, -uz)};
}

// A room is a lobby of 2-5 racers that becomes one race. The host owns the
// authoritative copy; guests mirror snapshots of it.
export function createRoom({code, trackId, hostName = 'HOST', now = 0, vehicleClass = null}) {
  const track = trackById(trackId);
  if (!track) return null;
  const cls = normalizeRaceClass(vehicleClass || track.class);
  // A car track can never be raced on bikes, or the other way round.
  if (track.class !== cls) return null;
  return {
    code, trackId, trackName:track.name, vehicleClass:cls, className:RACE_CLASSES[cls].label, status:'lobby', hostId:'host', createdAt:now, startAt:null,
    players:[{id:'host', name:String(hostName).slice(0, 12) || 'HOST', kind:'host', x:0, z:0, r:0, step:0, lap:0, finished:false, finishTime:null, connected:true}],
  };
}
export function playerById(room, id) { return room?.players.find(p => p.id === id) || null; }
export function joinRoom(room, {id, name, kind = 'guest', now = 0} = {}) {
  if (!room) return {ok:false, reason:'ROOM NOT FOUND'};
  if (room.status !== 'lobby') return {ok:false, reason:'RACE ALREADY STARTED'};
  if (room.players.length >= MAX_RACERS) return {ok:false, reason:'RACE IS FULL (5 RACERS)'};
  if (playerById(room, id)) return {ok:false, reason:'ALREADY IN THIS RACE'};
  const player = {id, name:(String(name || 'RACER').slice(0, 12) || 'RACER'), kind, x:0, z:0, r:0, step:0, lap:0, finished:false, finishTime:null, connected:true, joinedAt:now};
  room.players.push(player);
  return {ok:true, player};
}
export function leaveRoom(room, id) {
  if (!room) return false;
  const index = room.players.findIndex(p => p.id === id);
  if (index < 0) return false;
  room.players.splice(index, 1);
  return true;
}
export function addBot(room, name, now = 0) {
  if (!room || room.status !== 'lobby' || room.players.length >= MAX_RACERS) return null;
  const id = `bot-${room.players.filter(p => p.kind === 'bot').length + 1}`;
  const result = joinRoom(room, {id, name:name || `CPU ${room.players.length}`, kind:'bot', now});
  return result.ok ? result.player : null;
}
export function canStart(room) { return !!room && room.status === 'lobby' && room.players.length >= 2; }
export function startRoom(room, now = 0) {
  if (!canStart(room)) return false;
  room.status = 'countdown';
  room.startAt = now + COUNTDOWN_MS;
  for (const player of room.players) { player.step = 0; player.lap = 0; player.finished = false; player.finishTime = null; }
  return true;
}
export function updateRoomClock(room, now) {
  if (!room) return room;
  if (room.status === 'countdown' && now >= room.startAt) room.status = 'running';
  if (room.status === 'running' && room.players.every(p => p.finished)) room.status = 'finished';
  return room;
}
export function updateRacerPosition(room, id, {x, z, r = 0, step, lap} = {}) {
  const player = playerById(room, id);
  if (!player || player.finished) return false;
  if (Number.isFinite(x)) player.x = x;
  if (Number.isFinite(z)) player.z = z;
  if (Number.isFinite(r)) player.r = r;
  // Progress only moves forwards, and never beyond the track length.
  if (Number.isInteger(step) && step >= player.step && step <= 4) player.step = step;
  if (Number.isInteger(lap) && lap >= player.lap && lap <= 9) player.lap = lap;
  return true;
}
export function markFinished(room, id, elapsed) {
  const player = playerById(room, id);
  if (!player || room.status !== 'running' || player.finished) return false;
  player.finished = true;
  player.finishTime = Math.max(0, Math.round(Number(elapsed) || 0));
  return true;
}
// Finishers first (fastest time), then whoever is furthest around the track.
export function standings(room) {
  const track = room ? trackById(room.trackId) : null;
  const list = (room?.players || []).slice().sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.lap !== b.lap) return b.lap - a.lap;
    if (a.step !== b.step) return b.step - a.step;
    const point = track?.checkpoints[Math.min(a.step, (track?.checkpoints.length || 1) - 1)];
    if (!point) return 0;
    return Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z);
  });
  let place = 0;
  return list.map((player, index) => {
    if (!player.finished) place = index + 1;
    return {id:player.id, name:player.name, kind:player.kind, step:player.step, lap:player.lap, finished:player.finished, time:player.finishTime, place:player.finished ? index + 1 : place};
  });
}
// Wire format: small JSON objects so a 2-5 player race fits in tiny messages.
export function encodeMessage(message) { try { return JSON.stringify(message); } catch { return null; } }
export function decodeMessage(raw) {
  try { const message = typeof raw === 'string' ? JSON.parse(raw) : raw; return message && typeof message === 'object' && typeof message.t === 'string' ? message : null; } catch { return null; }
}
export function snapshot(room, now) {
  return {
    t:'snap', now, code:room.code, trackId:room.trackId, cls:room.vehicleClass || classOfTrack(room.trackId), status:room.status, startAt:room.startAt,
    players:room.players.map(p => ({id:p.id, name:p.name, kind:p.kind, x:Math.round(p.x * 10) / 10, z:Math.round(p.z * 10) / 10, r:Math.round(p.r * 100) / 100, step:p.step, lap:p.lap, fin:p.finished, ft:p.finishTime})),
  };
}
