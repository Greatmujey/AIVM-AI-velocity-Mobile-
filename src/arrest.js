// Arrest sequence for a patrol car that has caught the player.
// patrol  -> the car is chasing and has line of sight within contact range
// exit    -> after a short catch window, officers climb out and close in
// arrest  -> an officer reaches the player; cuffing takes a moment
// booked  -> cuffing finished; the caller books the player (bustPlayer)
export const ARREST = { contactRange: 6, catchWindow: 1.6, officerRange: 2.2, cuffTime: 1.4, officerSpeed: 4.6, fallbackBust: 6 };

export function createArrest() {
  return { phase: 'patrol', catch: 0, cuff: 0, age: 0 };
}
// `dist` is the car-to-player distance; `officerDist` the nearest officer's
// distance to the player (Infinity when no officer has been deployed yet).
export function arrestStep(state, { dist, sees, officerDist = Infinity, dt }) {
  if (!state || state.phase === 'booked') return state;
  state.age += dt;
  if (state.phase === 'patrol') {
    if (dist < ARREST.contactRange && sees) state.catch += dt;
    else state.catch = Math.max(0, state.catch - dt * .6);
    if (state.catch >= ARREST.catchWindow) state.phase = 'exit';
  } else if (state.phase === 'exit') {
    if (officerDist <= ARREST.officerRange) state.phase = 'arrest';
  } else if (state.phase === 'arrest') {
    if (officerDist > ARREST.officerRange * 2.5) state.phase = 'exit';
    else {
      state.cuff += dt;
      if (state.cuff >= ARREST.cuffTime) state.phase = 'booked';
    }
  }
  // Safety net so a stuck sequence can never hold the player forever.
  if (state.phase !== 'booked' && state.age > ARREST.fallbackBust + ARREST.cuffTime + 2) state.phase = 'booked';
  return state;
}
