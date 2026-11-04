import test from 'node:test';import assert from 'node:assert/strict';
import {RACE_TRACKS,TRACK_IDS,MAX_RACERS,makeRoomCode,normalizeCode,staticRoomCode,createRaceState,advanceCheckpoint,createRoom,joinRoom,addBot,startRoom,updateRoomClock,updateRacerPosition,markFinished,standings,startGrid,formatRaceTime,encodeMessage,decodeMessage,snapshot,COUNTDOWN_MS,RACE_CLASSES,RACE_CLASS_IDS,tracksForClass,classOfTrack,normalizeRaceClass,defaultTrackFor,prizeFor,roomPeerId} from '../src/race.js';
import {advanceBot,botCheckpointReached,botTarget} from '../src/race-ai.js';
import {describePeerError,hostPeerId,peerOptions,PEER_PREFIX} from '../src/race-net.js';

test('tracks use reachable road intersections',()=>{for(const track of Object.values(RACE_TRACKS)){for(const p of track.checkpoints){assert.ok(Math.abs(p.x)<=140&&Math.abs(p.z)<=140);assert.ok(Math.abs(p.x%28)<.001&&Math.abs(p.z%28)<.001,`${track.name} checkpoint off the grid`)}}assert.ok(TRACK_IDS.length>=11)});
test('room codes are short, typeable and stable peer ids',()=>{const code=makeRoomCode(()=>0);assert.equal(code,'AAAAA');assert.equal(normalizeCode(' ab-c1o 2 '),'ABC2');assert.equal(normalizeCode('ab1'),'AB');assert.equal(staticRoomCode('ab'),'AB000');assert.equal(hostPeerId('ab'),PEER_PREFIX+'car-AB000');assert.equal(hostPeerId('ab','bike'),PEER_PREFIX+'bike-AB000');assert.notEqual(hostPeerId('ab','car'),hostPeerId('ab','bike'));assert.equal(peerOptions().config.iceServers.length,3)});
test('checkpoints must be reached in order and the last one finishes the race',()=>{const state=createRaceState('city');assert.equal(advanceCheckpoint(state,{x:0,z:-56}),null);assert.equal(advanceCheckpoint(state,{x:0,z:0}),'checkpoint');assert.equal(state.step,1);for(let i=1;i<4;i++)assert.equal(advanceCheckpoint(state,{x:state.checkpoints[state.step].x,z:state.checkpoints[state.step].z}),'checkpoint');assert.equal(advanceCheckpoint(state,{x:0,z:0}),'finish');assert.equal(state.finished,true);assert.equal(advanceCheckpoint(state,{x:0,z:0}),null)});
test('a lobby holds 2 to 5 racers and refuses more',()=>{const room=createRoom({code:'AAAAA',trackId:'city',hostName:'HOST'});assert.equal(joinRoom(room,{id:'g1',name:'ONE'}).ok,true);assert.equal(joinRoom(room,{id:'g1',name:'ONE'}).ok,false);for(const id of ['g2','g3','g4'])assert.equal(joinRoom(room,{id,name:id.toUpperCase()}).ok,true);assert.equal(room.players.length,MAX_RACERS);assert.deepEqual(joinRoom(room,{id:'g5'}),{ok:false,reason:'RACE IS FULL (5 RACERS)'});assert.equal(canStartWithBots(room),true)});
function canStartWithBots(room){return room.players.length>=2}
test('bots fill the grid up to the limit only',()=>{const room=createRoom({code:'BBBBB',trackId:'coast'});assert.equal(addBot(room,'CPU 1').kind,'bot');assert.equal(addBot(room,'CPU 2').kind,'bot');addBot(room,'CPU 3');addBot(room,'CPU 4');assert.equal(room.players.length,MAX_RACERS);assert.equal(addBot(room,'CPU 5'),null)});
test('countdown starts the race and standings rank finishers by time',()=>{const room=createRoom({code:'CCCCC',trackId:'hills'});joinRoom(room,{id:'g1',name:'ONE'});assert.equal(startRoom(room,0),true);assert.equal(room.status,'countdown');updateRoomClock(room,COUNTDOWN_MS-1);assert.equal(room.status,'countdown');updateRoomClock(room,COUNTDOWN_MS);assert.equal(room.status,'running');updateRacerPosition(room,'g1',{x:56,z:-56,step:2,lap:0});updateRacerPosition(room,'host',{x:56,z:-112,step:1,lap:0});assert.equal(standings(room)[0].id,'g1');markFinished(room,'host',52000);assert.equal(standings(room)[0].id,'host');markFinished(room,'g1',48000);assert.equal(standings(room)[0].id,'g1');assert.equal(standings(room)[0].time,48000);updateRoomClock(room,COUNTDOWN_MS+1);assert.equal(room.status,'finished')});
test('progress cannot move backwards and finished racers stop updating',()=>{const room=createRoom({code:'DDDDD',trackId:'port'});joinRoom(room,{id:'g1',name:'ONE'});startRoom(room,0);updateRoomClock(room,COUNTDOWN_MS);updateRacerPosition(room,'g1',{step:3,lap:0,x:1,z:1});updateRacerPosition(room,'g1',{step:1,lap:0});assert.equal(room.players[1].step,3);markFinished(room,'g1',30000);updateRacerPosition(room,'g1',{x:99});assert.equal(room.players[1].x,1)});
test('start grid staggers racers behind the first checkpoint',()=>{const [a,b]=RACE_TRACKS.city.checkpoints;const g0=startGrid(RACE_TRACKS.city,0),g1=startGrid(RACE_TRACKS.city,1);assert.ok(Math.hypot(g0.x-a.x,g0.z-a.z)<12);assert.notDeepEqual([g0.x,g0.z],[g1.x,g1.z]);assert.ok(Math.abs(Math.sin(g0.yaw)*(b.x-a.x)+Math.cos(g0.yaw)*(b.z-a.z))>0)});
test('messages round-trip and bad data is ignored',()=>{const room=createRoom({code:'EEEEE',trackId:'desert'});joinRoom(room,{id:'g1',name:'ONE'});const snap=snapshot(room,123);const decoded=decodeMessage(encodeMessage(snap));assert.equal(decoded.t,'snap');assert.equal(decoded.players.length,2);assert.equal(decodeMessage('{bad'),null);assert.equal(decodeMessage('{"no":"type"}'),null);assert.equal(formatRaceTime(95000),'1:35');assert.equal(formatRaceTime(null),'--:--')});
test('bots drive toward their checkpoint and can reach it',()=>{const checkpoints=RACE_TRACKS.city.checkpoints,racer={x:0,z:8,step:0,lane:1};const target=botTarget(racer,checkpoints,0);assert.ok(Math.abs(target.x)>0);for(let i=0;i<400;i++){if(botCheckpointReached(racer,checkpoints,0))break;advanceBot(racer,checkpoints,.05,{speed:12})}assert.equal(botCheckpointReached(racer,checkpoints,0),true)});
test('peer errors become readable messages',()=>{assert.match(describePeerError({type:'unavailable-id'}),/already hosting/);assert.match(describePeerError('peer-unavailable'),/No race found/);assert.match(describePeerError({type:'network'}),/internet/);assert.match(describePeerError(null),/problem/)});

// --- Cars and bikes are separate disciplines ---
test('cars and bikes have their own tracks, rooms, codes and prizes',()=>{
  assert.deepEqual(RACE_CLASS_IDS,['car','bike']);
  const cars=tracksForClass('car'),bikes=tracksForClass('bike');
  assert.ok(cars.length>=5&&bikes.length>=5);
  assert.equal(cars.filter(id=>bikes.includes(id)).length,0,'a track belongs to one discipline only');
  for(const id of cars)assert.equal(classOfTrack(id),'car');
  for(const id of bikes)assert.equal(classOfTrack(id),'bike');
  assert.equal(normalizeRaceClass('BIKE'),'bike');
  assert.equal(normalizeRaceClass(undefined),'car');
  assert.equal(normalizeRaceClass('truck'),'car');
  assert.equal(defaultTrackFor('bike'),bikes[0]);
  assert.ok(prizeFor('car',1)>prizeFor('bike',1));
  assert.equal(prizeFor('bike',5),prizeFor('bike',3),'places beyond the podium pay the same');
});

test('a room refuses a track from the other discipline and remembers its class',()=>{
  const car=createRoom({code:'AAAAA',trackId:'city',hostName:'HOST',vehicleClass:'car'});
  assert.equal(car.vehicleClass,'car');
  assert.equal(car.className,'CAR RACES');
  const bike=createRoom({code:'BBBBB',trackId:'alley',hostName:'HOST'});
  assert.equal(bike.vehicleClass,'bike','the track decides the class when none is given');
  assert.equal(createRoom({code:'CCCCC',trackId:'alley',vehicleClass:'car'}),null,'cars cannot race a bike track');
  assert.equal(createRoom({code:'DDDDD',trackId:'city',vehicleClass:'bike'}),null,'bikes cannot race a car track');
  const snap=decodeMessage(encodeMessage(snapshot(bike,7)));
  assert.equal(snap.cls,'bike','guests learn the discipline from the host snapshot');
  assert.equal(snap.trackId,'alley');
});

test('bike rooms live on their own peer id, so a code cannot mix disciplines',()=>{
  assert.equal(hostPeerId('AB2CD','car'),'aivm-race-v2-car-AB2CD');
  assert.equal(hostPeerId('AB2CD','bike'),'aivm-race-v2-bike-AB2CD');
  assert.notEqual(hostPeerId('AB2CD'),hostPeerId('AB2CD','bike'));
});

test('bike tracks are twistier than car tracks, as a bike course should be',()=>{
  const turns=id=>{const points=RACE_TRACKS[id].checkpoints;let total=0;for(let i=1;i<points.length;i++)total+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);return total};
  const shortestBike=Math.min(...tracksForClass('bike').map(turns));
  const longestCar=Math.max(...tracksForClass('car').map(turns));
  assert.ok(shortestBike<224*1.5,`bike courses should stay short, got ${shortestBike}`);
  assert.ok(longestCar>=shortestBike,`car circuits should not be shorter than every bike course (${longestCar} vs ${shortestBike})`);
  for(const id of tracksForClass('bike')){
    const points=RACE_TRACKS[id].checkpoints;
    assert.equal(points.length,5);
    assert.deepEqual(points[0],points.at(-1),'a course is a loop');
  }
});

test('a bike lobby still holds 2-5 racers and finishes the same way',()=>{
  const room=createRoom({code:'BIKE1',trackId:'alley',hostName:'HOST'});
  assert.equal(room.vehicleClass,'bike');
  assert.equal(addBot(room,'RIVAL').kind,'bot');
  assert.equal(startRoom(room,0),true);
  updateRoomClock(room,COUNTDOWN_MS);
  const points=RACE_TRACKS.alley.checkpoints;
  updateRacerPosition(room,'bot-1',{x:points[1].x,z:points[1].z,step:1});
  markFinished(room,'bot-1',41000);
  markFinished(room,'host',44000);
  updateRoomClock(room,COUNTDOWN_MS+1);
  assert.equal(room.status,'finished');
  assert.equal(standings(room)[0].id,'bot-1');
  assert.equal(prizeFor('bike',1),300);
});
