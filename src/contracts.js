// Standardised long-range elimination contracts. Every contract carries the
// same structured fields (code, target count, reward, zone, vantage point) so
// the mission board can present them uniformly and the HUD can track progress.
export const CONTRACTS = [
  {
    id: 'ct-tower', code: 'CT-01', title: 'TOWER CLEANSE', targets: 3, reward: 3000,
    zone: 'MERIDIA DOWNTOWN', zoneId: 'downtown', vantage: 'DOWNTOWN HIGH-RISE ROOF', roofId: 'tower', roof: { x: -42, z: -126, h: 24, w: 12, d: 12, floors: 7 },
    blurb: 'Armed contractors are holding the streets below the new downtown high-rise. Take the roof, pick your angles and eliminate every target on the list before they scatter.',
    spawns: [[0, -112], [28, -112], [0, -140], [28, -140]],
  },
  {
    id: 'ct-docks', code: 'CT-02', title: 'DOCKS SWEEP', targets: 4, reward: 4200,
    zone: 'SOUTH PORT', zoneId: 'harbor', vantage: 'DOCK TOWER ROOF', roofId: 'crane', roof: { x: -98, z: -42, h: 18, w: 11, d: 11, floors: 5 },
    blurb: 'Smugglers move crates under the harbour lights at dusk. A client wants the crew removed from a high angle before the next shipment touches the quay.',
    spawns: [[-56, -56], [-56, -28], [-84, -56], [-84, -28]],
  },
  {
    id: 'ct-ridge', code: 'CT-03', title: 'RIDGE OVERWATCH', targets: 5, reward: 5600,
    zone: 'HIGHLAND ROAD', zoneId: 'hills', vantage: 'HIGHLAND TOWER ROOF', roofId: 'ridge', roof: { x: 126, z: -70, h: 30, w: 12, d: 12, floors: 9 },
    blurb: 'A rival crew is taxing every rider on Highland Road. Overwatch from the ridge tower roof and eliminate the collectors as they work the road below.',
    spawns: [[84, -84], [84, -56], [112, -84], [112, -56], [84, -112]],
  },
];
export const CONTRACT_IDS = CONTRACTS.map(c => c.id);
export const contractById = id => CONTRACTS.find(c => c.id === id) || null;

export function createContract(id) {
  const definition = contractById(id);
  if (!definition) return null;
  return { ...definition, killed: 0, status: 'active' };
}
// One standard objective string for HUD and board alike.
export function contractObjective(contract) {
  if (!contract) return '';
  const reward = contract.reward.toLocaleString('en-US');
  return `${contract.code} · ELIMINATE ${Math.min(contract.killed, contract.targets)} / ${contract.targets} TARGET HOSTILES · $${reward} ON COMPLETION`;
}
export function registerContractKill(contract) {
  if (!contract || contract.status !== 'active') return null;
  contract.killed++;
  if (contract.killed >= contract.targets) { contract.status = 'done'; return 'complete'; }
  return 'kill';
}
// Flat, structured card data so the board UI never invents its own format.
export function contractCard(contract, state = 'open') {
  const reward = contract.reward.toLocaleString('en-US');
  return {
    code: contract.code, title: contract.title, blurb: contract.blurb, state,
    lines: [
      `TARGETS: ${contract.targets} HOSTILES`,
      `REWARD: $${reward}`,
      `ZONE: ${contract.zone}`,
      `VANTAGE: ${contract.vantage}`,
      `STATUS: ${state.toUpperCase()}`,
    ],
  };
}
