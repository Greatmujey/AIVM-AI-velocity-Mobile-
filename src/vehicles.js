// The city's vehicle catalog. Every drivable thing in AIVM comes from here, so
// traffic, parked cars, races and the dealership all agree on looks and stats.
// Brand names are invented for this game (as open-world satires do); no real
// manufacturer, model or badge is used or implied.

// `variant` is the local GLB file, `length` the scale in metres, `top` the top
// speed and `steer` the turn rate used while the player drives it.
export const VEHICLE_CATALOG = [
  // --- Bikes: their own class, own tracks, own races ---
  {id:'kestrel-250',brand:'KESTREL',model:'STREET 250',kind:'bike',segment:'COMMUTER',variant:'motorcycle',length:3.1,price:900,top:19,steer:1.75,tints:[0xc2e34e,0xe8e3d6,0x9fc2d8],traffic:6,sale:true},
  {id:'orbit-600',brand:'ORBIT',model:'R600 SPORT',kind:'bike',segment:'SUPERBIKE',variant:'motorcycle',length:3.25,price:3600,top:23,steer:1.9,tints:[0xf0683f,0xf2d45c,0xdfe6ea],traffic:2,sale:true},
  {id:'mara-trail',brand:'MARA',model:'TRAIL 450',kind:'bike',segment:'OFF-ROAD',variant:'motorcycle',length:3.2,price:2100,top:18,steer:2.0,tints:[0x8d9a5b,0xb08a5e,0x6f8b96],traffic:2,sale:true},
  {id:'zephyr-cruiser',brand:'ZEPHYR',model:'CRUISER 900',kind:'bike',segment:'CRUISER',variant:'motorcycle',length:3.4,price:4400,top:20,steer:1.5,tints:[0x6d6f7a,0x3f4a52,0xc8b48a],traffic:1,sale:true},
  // --- Cars ---
  {id:'sable-240',brand:'SABLE',model:'240 SALOON',kind:'car',segment:'FAMILY',variant:'sedan',length:4.8,price:2600,top:17,steer:1.6,tints:[0xd9d4c7,0x9fb4c4,0xb9a58d,0x8fa08c],traffic:8,sale:true},
  {id:'sable-gth',brand:'SABLE',model:'GT-H HATCH',kind:'car',segment:'HOT HATCH',variant:'hatchback-sports',length:4.4,price:3100,top:19,steer:1.85,tints:[0xe0654f,0x6f92c8,0xd9d2c0],traffic:5,sale:true},
  {id:'vantor-s',brand:'VANTOR',model:'S-LINE',kind:'car',segment:'EXECUTIVE',variant:'sedan-sports',length:5.0,price:5200,top:20,steer:1.7,tints:[0x2f3b45,0x9db9c8,0xcfc7b6],traffic:4,sale:true},
  {id:'vantor-gl',brand:'VANTOR',model:'GL TOURER',kind:'car',segment:'LUXURY SUV',variant:'suv-luxury',length:5.2,price:6400,top:19,steer:1.5,tints:[0x33404a,0xb9b2a3,0x7d8c7a],traffic:3,sale:true},
  {id:'tundra-trail',brand:'TUNDRA',model:'TRAIL 4',kind:'car',segment:'SUV',variant:'suv',length:5.0,price:3400,top:18,steer:1.55,tints:[0xa8b2a2,0xc9b591,0x8fa2b0,0xb98f7a],traffic:6,sale:true},
  {id:'corsair-blaze',brand:'CORSAIR',model:'BLAZE GT',kind:'car',segment:'RACE',variant:'race',length:4.6,price:9800,top:23,steer:2.0,tints:[0xe8552f,0x4f7fd0,0xe6dfc9],traffic:1,sale:true},
  {id:'halcyon-proto',brand:'HALCYON',model:'PROTO X',kind:'car',segment:'SUPERCAR',variant:'race-future',length:4.9,price:14500,top:25,steer:2.05,tints:[0xd8d3e2,0x4a5560,0xe8c66a],traffic:1,sale:true},
  {id:'haulmaster-900',brand:'HAULMASTER',model:'900 PICKUP',kind:'car',segment:'UTILITY',variant:'truck',length:6.2,price:3800,top:16,steer:1.35,tints:[0xc6c0b1,0x9aa8a0,0xb99a7c],traffic:4,sale:true},
  {id:'bruma-carrier',brand:'BRUMA',model:'CARRIER VAN',kind:'car',segment:'VAN',variant:'van',length:5.8,price:2200,top:15,steer:1.4,tints:[0xd6d2c6,0xa9b6bd,0xc8b394],traffic:4,sale:true},
  {id:'fallow-flatbed',brand:'FALLOW',model:'FLATBED 30',kind:'car',segment:'UTILITY',variant:'truck-flat',length:5.9,price:2900,top:16,steer:1.4,tints:[0xb7c3bd,0xcbbfa6,0x93a4b2],traffic:3,sale:true},
  {id:'palm-kart',brand:'PALM KART',model:'SPRINTER',kind:'car',segment:'KART',variant:'kart-oobi',length:2.6,price:600,top:14,steer:2.3,tints:[0xe2603f,0x5fa8d3,0xe8d24a],traffic:0,sale:true},
  // --- City services and commerce (traffic only, still hijackable) ---
  {id:'palm-cab',brand:'PALM CAB',model:'METER TAXI',kind:'service',segment:'TAXI',variant:'taxi',length:4.8,price:0,top:16,steer:1.6,tints:[0xf0c36e],traffic:5,sale:false},
  {id:'breeze-courier',brand:'BREEZE',model:'COURIER VAN',kind:'service',segment:'DELIVERY',variant:'delivery',length:5.9,price:0,top:15,steer:1.35,tints:[0xe6e1d4],traffic:4,sale:false},
  {id:'metro-pd',brand:'METRO PD',model:'PATROL 400',kind:'emergency',segment:'POLICE',variant:'police',length:5.0,price:0,top:21,steer:1.8,tints:[0xffffff],traffic:3,sale:false},
  {id:'metro-ems',brand:'METRO EMS',model:'RESPONDER',kind:'emergency',segment:'AMBULANCE',variant:'ambulance',length:6.0,price:0,top:19,steer:1.45,tints:[0xffffff],traffic:2,sale:false},
  {id:'city-sanitation',brand:'CITY WORKS',model:'COLLECTOR',kind:'service',segment:'SANITATION',variant:'garbage-truck',length:6.8,price:0,top:12,steer:1.15,tints:[0xdfe3da],traffic:2,sale:false},
  {id:'metro-fire',brand:'METRO FIRE',model:'ENGINE 7',kind:'emergency',segment:'FIRE',variant:'firetruck',length:6.6,price:0,top:19,steer:1.3,tints:[0xe8dede],traffic:1,sale:false},
  {id:'harvest-tractor',brand:'HARVEST',model:'FIELD 20',kind:'service',segment:'FARM',variant:'tractor',length:4.0,price:0,top:9,steer:1.5,tints:[0xc9d08a],traffic:1,sale:false},
];

export const VEHICLE_IDS = VEHICLE_CATALOG.map(entry => entry.id);
export const vehicleById = id => VEHICLE_CATALOG.find(entry => entry.id === id) || null;
export const catalogForKind = kind => VEHICLE_CATALOG.filter(entry => entry.kind === kind);
// `class` is what the race room shows: cars and bikes never share a grid.
export const raceClassOf = entry => (entry?.kind === 'bike' ? 'bike' : 'car');
export const vehiclesForSale = cls => VEHICLE_CATALOG.filter(entry => entry.sale && (!cls || raceClassOf(entry) === cls));

// Weighted pick for ambient traffic, so common saloons outnumber supercars.
export function pickTrafficVehicle(random = Math.random) {
  const pool = VEHICLE_CATALOG.filter(entry => entry.traffic > 0);
  const total = pool.reduce((sum, entry) => sum + entry.traffic, 0);
  let roll = Math.floor(random() * total);
  for (const entry of pool) { roll -= entry.traffic; if (roll < 0) return entry; }
  return pool[0];
}
export function pickTrafficBike(random = Math.random) {
  const pool = catalogForKind('bike').filter(entry => entry.traffic > 0);
  const total = pool.reduce((sum, entry) => sum + entry.traffic, 0);
  let roll = Math.floor(random() * total);
  for (const entry of pool) { roll -= entry.traffic; if (roll < 0) return entry; }
  return pool[0];
}
export function tintFor(entry, random = Math.random) {
  const tints = entry?.tints?.length ? entry.tints : [0xffffff];
  return tints[Math.floor(random() * tints.length) % tints.length];
}
// A catalog entry turned into the fields the world/vehicle builders read.
export function applyCatalog(vehicle, entry, tint) {
  if (!vehicle || !entry) return vehicle;
  vehicle.catalog = entry.id; vehicle.variant = entry.variant; vehicle.length = entry.length;
  vehicle.type = entry.kind === 'bike' ? 'bike' : 'car'; vehicle.tint = tint ?? tintFor(entry);
  vehicle.brand = entry.brand; vehicle.model = entry.model; vehicle.segment = entry.segment;
  vehicle.topSpeed = entry.top; vehicle.steerRate = entry.steer; vehicle.kind = entry.kind;
  return vehicle;
}
// Player handling: purchased cars keep their catalog stats, the dealer upgrade
// adds a little on top, and an unknown ride falls back to the old defaults.
export function handlingFor(vehicle, {carUpgrade = false} = {}) {
  const bike = vehicle?.type === 'bike';
  const top = vehicle?.topSpeed || (bike ? 19 : 16);
  const steer = vehicle?.steerRate || 1.65;
  const bonus = !bike && carUpgrade ? 3 : 0;
  return {top:top + bonus, steer};
}
export const DEALERSHIP_NAME = 'HALCYON MOTORS';
export function dealershipStock(cls) {
  return vehiclesForSale(cls).map(entry => ({...entry, cls:raceClassOf(entry)}));
}
