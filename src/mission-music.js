// Music helpers shared by settings and mission runs.
// Missions own their own loop while they are active and hand back afterwards.
export const MISSION_MUSIC = 'missions';
export const MISSION_COMPLETE_MUSIC = 'coast';
export function musicForMission(active, preferred) {
  if (active) return MISSION_MUSIC;
  return preferred;
}
