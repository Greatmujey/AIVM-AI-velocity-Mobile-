// Landmarks share their coordinates between the world, navigation and map.
export const CITY_BOUND = 156;
export const ROAD_LIMIT = 140;

// Every entry is a door the player can actually walk through. `kind` selects the
// interior style and the exterior building shape, so several places can share a
// style while keeping their own identity, name and district.
export const LANDMARKS = [
  // --- Palm Grove centre ---
  {id:'home',name:'YOUR HOME',x:-14,z:14,color:'#72e2b6',kind:'home',district:'city',blurb:'Your own space. Rest, recover and head back out.'},
  {id:'hub',name:'MISSION HUB',x:14,z:14,color:'#f4d46c',kind:'hub',district:'city',blurb:'Find work and upgrade your gear. Complete jobs to earn in-game cash.'},
  {id:'cafe',name:'TEA & GRILL CAFE',x:-14,z:42,color:'#e8b98a',kind:'cafe',district:'market',blurb:'Tea, grilled plantain and gossip. Regulars talk all evening.'},
  {id:'apartment',name:'PARK VIEW FLATS',x:-42,z:-14,color:'#b9c9d6',kind:'apartment',district:'city',blurb:'A friend lets you use the spare room. Rest here for free.'},
  // --- Meridia Downtown ---
  {id:'diner',name:'PALM DINER 24/7',x:-14,z:-70,color:'#f2a1a1',kind:'diner',district:'downtown',blurb:'Open all night. Eat to restore health, listen to the counter talk.'},
  {id:'garage',name:'HALCYON MOTORS',x:14,z:-70,color:'#8fd0e8',kind:'garage',district:'downtown',blurb:'Showroom and workshop. Buy cars and bikes with in-game cash.'},
  {id:'clinic',name:'CITY CLINIC',x:-42,z:-98,color:'#d8f0e0',kind:'clinic',district:'downtown',blurb:'Nurses patch you up and sell body armour.'},
  {id:'club',name:'NIGHT OWL LOUNGE',x:42,z:-98,color:'#c9a3f0',kind:'club',district:'downtown',blurb:'Music, dancers and the loudest rumours in the city.'},
  {id:'office',name:'MERIDIA TOWER',x:42,z:-42,color:'#a8b8cc',kind:'office',district:'downtown',blurb:'Offices above, a job board in the lobby.'},
  // --- Old Market Row ---
  {id:'friend',name:"FRIEND'S HOUSE",x:-42,z:42,color:'#f2a78c',kind:'friend',district:'market',blurb:"A familiar face in the market rows."},
  {id:'shop',name:'PALM GROVE SHOP',x:42,z:42,color:'#f0d17d',kind:'shop',district:'market',blurb:'Browse permanent gear upgrades or restore your health using earned in-game cash.'},
  {id:'market',name:'MARKET HALL',x:14,z:70,color:'#e8c46a',kind:'market',district:'market',blurb:'Stalls, bargains and arguments. Cheapest ammo in the city.'},
  {id:'gym',name:'IRON PALM GYM',x:-14,z:98,color:'#9fd6a8',kind:'gym',district:'market',blurb:'Train here and you sprint longer for a while.'},
  // --- Coastal Village ---
  {id:'mosque',name:'MOSQUE',x:98,z:42,color:'#94dec8',kind:'mosque',district:'village',blurb:'A quiet room with mats and a courtyard.'},
  {id:'fishmarket',name:'BEACH FISH MARKET',x:98,z:98,color:'#8fc9e0',kind:'fishmarket',district:'village',blurb:'Ice, crates and morning auctions by the water.'},
  // --- South Port ---
  {id:'casino',name:'CASINO',x:-70,z:-42,color:'#ee85bd',kind:'casino',district:'harbor',blurb:'Slots, tables and arcade machines.'},
  {id:'warehouse',name:'DOCK 9 OFFICE',x:-98,z:-70,color:'#c0a98d',kind:'warehouse',district:'harbor',blurb:'Container paperwork. Dock jobs are posted here.'},
  // --- Highland Road ---
  {id:'hotel',name:'HOTEL',x:70,z:-42,color:'#ffbb87',kind:'hotel',district:'hills',blurb:'A room with a view of the ridge. Rest for cash.'},
  {id:'lodge',name:'HILLTOP LODGE',x:98,z:-98,color:'#d8b48a',kind:'lodge',district:'hills',blurb:'Riders stop here. Bike work and hot food.'},
  // --- Sandy Outskirts ---
  {id:'church',name:'CHURCH',x:-98,z:42,color:'#ccd9ff',kind:'church',district:'desert',blurb:'Bench rows, a pulpit and shade from the sun.'},
  {id:'campdiner',name:'DESERT CAMP DINER',x:-98,z:98,color:'#e8cfa0',kind:'diner',district:'desert',blurb:'Fuel, water and a cook who has seen everything.'},
];
export const landmarkById = id => LANDMARKS.find(place => place.id === id) || null;
export const entrance = place => ({x:place.x,z:place.z+8});
// One map letter per place, used by the full-map pins and the legend.
export const MAP_LETTERS = {
  home:'H',hub:'M',friend:'F',church:'C',mosque:'Q',hotel:'T',shop:'S',casino:'$',
  cafe:'A',apartment:'P',diner:'D',garage:'G',clinic:'+',club:'N',office:'O',
  market:'K',gym:'Y',fishmarket:'W',warehouse:'L',lodge:'R',campdiner:'E',
};
export const mapLetter = place => MAP_LETTERS[place?.id] || MAP_LETTERS[place?.kind] || '•';

// Seven connected districts, not separate instances: the player can drive or
// walk between all of them. Waypoints sit in clear road space, never in blocks.
export const DISTRICTS = [
  {id:'city',name:'PALM GROVE',label:'CITY CENTRE',x:0,z:28,color:'#e2c982'},
  {id:'downtown',name:'MERIDIA DOWNTOWN',label:'DOWNTOWN',x:0,z:-84,color:'#9fc0d8'},
  {id:'market',name:'OLD MARKET ROW',label:'MARKET',x:0,z:84,color:'#e0b46a'},
  {id:'village',name:'COASTAL VILLAGE',label:'VILLAGE',x:112,z:84,color:'#9dcc90'},
  {id:'harbor',name:'SOUTH PORT',label:'HARBOR',x:-112,z:-84,color:'#85b8c4'},
  {id:'hills',name:'HIGHLAND ROAD',label:'HILLS',x:112,z:-84,color:'#9fbfa5'},
  {id:'desert',name:'SANDY OUTSKIRTS',label:'DESERT',x:-112,z:84,color:'#d8ac76'},
];
export const districtById = id => DISTRICTS.find(d => d.id === id) || DISTRICTS[0];
export function districtAt(x,z) {
  if(x > 56) return z >= 0 ? 'village' : 'hills';
  if(x < -56) return z >= 0 ? 'desert' : 'harbor';
  if(z <= -42) return 'downtown';
  if(z >= 42) return 'market';
  return 'city';
}
export const districtName = id => districtById(id).name;
export const DISTRICT_LETTERS = {city:'G',downtown:'DT',market:'MK',village:'V',harbor:'P',hills:'L',desert:'D'};
// How crowded a district feels. Denser places get more people and more chatter.
export const DISTRICT_DENSITY = {city:1.0,downtown:1.25,market:1.5,village:.8,harbor:.7,hills:.5,desert:.45};
