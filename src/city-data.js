// Landmarks share their coordinates between the world, navigation and map.
export const CITY_BOUND = 156;
export const ROAD_LIMIT = 140;
export const LANDMARKS = [
  {id:'home',name:'YOUR HOME',x:-14,z:14,color:'#72e2b6',kind:'home'},
  {id:'hub',name:'MISSION HUB',x:14,z:14,color:'#f4d46c',kind:'hub'},
  {id:'friend',name:"FRIEND'S HOUSE",x:-42,z:42,color:'#f2a78c',kind:'friend'},
  {id:'church',name:'CHURCH',x:-98,z:42,color:'#ccd9ff',kind:'church'},
  {id:'mosque',name:'MOSQUE',x:98,z:42,color:'#94dec8',kind:'mosque'},
  {id:'hotel',name:'HOTEL',x:70,z:-42,color:'#ffbb87',kind:'hotel'},
  {id:'shop',name:'PALM GROVE SHOP',x:42,z:42,color:'#f0d17d',kind:'shop'},
  {id:'casino',name:'CASINO',x:-70,z:-42,color:'#ee85bd',kind:'casino'},
];
export const entrance = place => ({x:place.x,z:place.z+8});

// Five connected districts, not separate instances: the player can drive
// between them. Waypoints sit in clear road space rather than in buildings.
export const DISTRICTS = [
  {id:'city',name:'PALM GROVE',label:'CITY CENTRE',x:0,z:28,color:'#e2c982'},
  {id:'village',name:'COASTAL VILLAGE',label:'VILLAGE',x:112,z:84,color:'#9dcc90'},
  {id:'harbor',name:'SOUTH PORT',label:'HARBOR',x:-112,z:-84,color:'#85b8c4'},
  {id:'hills',name:'HIGHLAND ROAD',label:'HILLS',x:112,z:-84,color:'#9fbfa5'},
  {id:'desert',name:'SANDY OUTSKIRTS',label:'DESERT',x:-112,z:84,color:'#d8ac76'},
];
export function districtAt(x,z) {
  if(x > 56) return z >= 0 ? 'village' : 'hills';
  if(x < -56) return z >= 0 ? 'desert' : 'harbor';
  return 'city';
}
