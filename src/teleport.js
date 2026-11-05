// Teleport portal: pricing, destination list, and the timed portal sequence.
// Everything here is plain data/maths so it can be unit-tested; main.js owns
// the THREE objects and the game state that the sequence drives.

export const TELEPORT_SEGMENTS = [
  ['open', 900],      // portal ring grows in front of you
  ['enter', 750],     // you walk (or drive) into the portal and shrink
  ['fadeOut', 300],   // screen darkens
  ['hold', 180],      // black frame: you are moved to the destination
  ['fadeIn', 300],    // light returns at the destination
  ['emerge', 900],    // you step out of the arrival portal onto the spot
  ['close', 350],     // portal collapses
];
export const TELEPORT_TOTAL_MS = TELEPORT_SEGMENTS.reduce((sum, [, ms]) => sum + ms, 0);
export const PORTAL_OFFSET = 2.2;   // departure portal distance in front of you
export const EXIT_OFFSET = 2.0;     // arrival portal distance in front of the spot
export const MIN_TRIP = 15;         // no pointless hops to somewhere you already are
export const BASE_FARE_CENTS = 50;  // $0.50 minimum fare
export const FARE_CENTS_PER_METRE = 2.5;

// Fare in cents: starts at $0.50 and rises with distance (about $3 per 100 m).
export function fareCents(distance) {
  return Math.max(BASE_FARE_CENTS, Math.round(BASE_FARE_CENTS + Math.max(0, distance) * FARE_CENTS_PER_METRE));
}
export function formatFare(cents) {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
// Places sorted nearest-first, each tagged with its distance and fare.
export function destinationList(from, places, minTrip = MIN_TRIP) {
  return places
    .map(p => {
      const distance = Math.round(Math.hypot(p.x - from.x, p.z - from.z));
      return { ...p, distance, cents: fareCents(distance) };
    })
    .filter(p => p.distance >= minTrip)
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}
// Which phase a given elapsed time falls in, and progress 0..1 inside it.
export function teleportPhase(elapsedMs) {
  let start = 0;
  for (const [name, ms] of TELEPORT_SEGMENTS) {
    if (elapsedMs < start + ms) return { phase: name, t: Math.max(0, (elapsedMs - start) / ms) };
    start += ms;
  }
  return { phase: 'done', t: 1 };
}
// Portal centre `offset` metres in front of a point, for a camera yaw. Matches
// the game's forward vector (-sin yaw, -cos yaw).
export function portalFront(from, yaw, offset = PORTAL_OFFSET) {
  return { x: from.x - Math.sin(yaw) * offset, z: from.z - Math.cos(yaw) * offset };
}
export function balanceCents(progress) {
  return (progress.money || 0) * 100 + (progress.cents || 0);
}
// Charge a fare from the balance, keeping the cents remainder. Returns false
// (and leaves the balance untouched) when the player cannot pay.
export function applyFare(progress, cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0) return false;
  const left = balanceCents(progress) - cents;
  if (left < 0) return false;
  progress.money = Math.floor(left / 100);
  if (left % 100) progress.cents = left % 100;
  else delete progress.cents;
  return true;
}
// Screen darkness for a phase. Set every frame, so a frame that skips a phase
// can never leave the screen stuck black.
export function fadeLevel(phase, t = 0) {
  if (phase === 'fadeOut') return Math.max(0, Math.min(1, t));
  if (phase === 'hold') return 1;
  if (phase === 'fadeIn') return Math.max(0, Math.min(1, 1 - t));
  return 0;
}
