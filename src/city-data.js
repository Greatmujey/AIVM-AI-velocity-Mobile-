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
  {id:'casino',name:'CASINO',x:-70,z:-42,color:'#ee85bd',kind:'casino'},
];
export const entrance = place => ({x:place.x,z:place.z+8});
