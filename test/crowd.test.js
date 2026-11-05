import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrowd, stepCrowd, startConversation, endConversation, nearestConversations, crowdCount, chatterFor, pedestrianLanes, gatherSpots, districtQuotas, headingTo, pairDistance, mulberry32, BENCH_SPOTS } from '../src/crowd.js';
import { LANDMARKS, DISTRICTS, districtAt } from '../src/city-data.js';

test('the city is densely populated, in every district',()=>{
  const crowd=createCrowd({seed:5});
  const {total,byDistrict}=crowdCount(crowd);
  assert.ok(total>=150,`expected a dense crowd, got ${total}`);
  for(const district of DISTRICTS)assert.ok(byDistrict[district.id]>=4,`${district.id} is empty`);
  // Denser districts really are denser.
  assert.ok(byDistrict.market>byDistrict.desert,'the market should be busier than the desert');
  assert.ok(byDistrict.downtown>byDistrict.hills);
});

test('people stand on pavement lanes and around real doors, never inside walls',()=>{
  const lanes=pedestrianLanes();
  assert.ok(lanes.length>=20);
  for(const lane of lanes){const wrapped=((lane.fixed%28)+28)%28;assert.ok(Math.abs(wrapped-7.6)<.01||Math.abs(wrapped-20.4)<.01,`lane ${lane.fixed} is not on the pavement strip`)}
  const spots=gatherSpots();
  assert.equal(spots.length,LANDMARKS.length,'every door gets a gathering spot');
  for(const spot of spots)assert.equal(spot.district,districtAt(LANDMARKS.find(p=>p.id===spot.id).x, LANDMARKS.find(p=>p.id===spot.id).z));
  const crowd=createCrowd({seed:9});
  for(const person of crowd){
    assert.ok(Math.abs(person.x)<=148&&Math.abs(person.z)<=148,`${person.id} is off the map`);
    assert.equal(person.district,districtAt(person.x,person.z),'people stay in their own district');
  }
  assert.ok(crowd.filter(p=>p.mode==='sit').length>=BENCH_SPOTS.length,'benches are used');
  assert.ok(crowd.filter(p=>p.mode==='vendor').length>0,'somebody is selling something');
});

test('two people can stop and talk face to face',()=>{
  const crowd=createCrowd({seed:3});
  const a=crowd.find(p=>p.mode==='walk'),b=crowd.find(p=>p!==a&&p.mode==='walk'&&p.district===a.district);
  b.x=a.x+3;b.z=a.z+1;a.cooldown=0;b.cooldown=0;
  assert.equal(startConversation(a,b,10,mulberry32(1)),true);
  assert.equal(a.mode,'talk');assert.equal(b.mode,'talk');
  // They stand close together and look at each other.
  assert.ok(pairDistance(a,b)<1.9,'a conversation happens at arm’s length');
  const facing=Math.abs(Math.atan2(Math.sin(b.ry-headingTo(b,a)),Math.cos(b.ry-headingTo(b,a))));
  assert.ok(facing<.01,'they face each other');
  assert.equal(startConversation(a,b,10,mulberry32(2)),false,'nobody joins a conversation twice');
  let time=10,spoken=0,faced=0;
  for(let i=0;i<1200;i++){
    time+=.05;
    stepCrowd(crowd,.05,{time,focus:{x:a.x,z:a.z}});
    if(a.line&&a.line.length>2)spoken++;
    if(a.mode==='talk'&&b.mode==='talk')faced++;
  }
  assert.ok(spoken>40,`somebody says something, saw ${spoken} spoken steps`);
  assert.ok(faced>100,`they stay face to face while talking, saw ${faced} steps`);
  assert.notEqual(a.mode,'talk','conversations end and people move on');
  assert.equal(a.line,null,'the bubble clears when the chat ends');
});

test('conversations keep happening over time and stay near the player',()=>{
  const crowd=createCrowd({seed:21});
  let talkingSeen=0;const focus={x:0,z:14};
  for(let i=0;i<4000;i++){
    const time=i*.05;
    stepCrowd(crowd,.05,{time,focus,random:mulberry32(i+1)});
    if(crowd.some(p=>p.mode==='talk'))talkingSeen++;
  }
  assert.ok(talkingSeen>3000,`the city should usually be talking, saw ${talkingSeen} of 4000 steps`);
});

test('nearestConversations returns one bubble per pair, closest first',()=>{
  const crowd=createCrowd({seed:11});
  const a=crowd.find(p=>p.district==='city'&&p.mode!=='sit'),b=crowd.find(p=>p!==a&&p.district==='city'&&p.mode!=='sit');
  b.x=a.x+2;b.z=a.z;a.cooldown=0;b.cooldown=0;
  assert.equal(startConversation(a,b,10,mulberry32(4)),true);
  const focus={x:a.x,z:a.z};
  for(let i=0;i<200;i++)stepCrowd(crowd,.05,{time:10+i*.05,focus});
  a.line='HELLO THERE';a.lineUntil=99;
  const list=nearestConversations(crowd,focus,{limit:3,radius:12});
  assert.ok(list.length>=1);
  assert.equal(list[0].id,a.id);
  assert.equal(new Set(list.map(p=>p.talk?Math.min(p.id,p.talk.partner):p.id)).size,list.length,'one bubble per pair');
  assert.deepEqual(nearestConversations(crowd,null),[]);
});

test('gunfire makes nearby people run, and chatter fits the district',()=>{
  const crowd=createCrowd({seed:31});
  const target=crowd.find(p=>p.mode==='walk');
  const before={x:target.x,z:target.z};
  target.cooldown=0;target.pause=0;
  for(let i=0;i<300;i++)stepCrowd(crowd,.05,{time:i*.05,focus:before,flee:true});
  assert.ok(Math.hypot(target.x-before.x,target.z-before.z)>1,'people move away from gunfire');
  assert.ok(target.speed>=3,'they run');
  for(const district of DISTRICTS.map(d=>d.id)){
    const line=chatterFor(district,mulberry32(2));
    assert.ok(Array.isArray(line)&&line.length>=2,`${district} has no chatter`);
    assert.ok(line.every(part=>part.length>3));
  }
});

test('crowd quotas follow district density settings',()=>{
  const quotas=districtQuotas({base:20});
  assert.equal(Object.keys(quotas).length,DISTRICTS.length);
  assert.ok(quotas.market>quotas.desert);
  assert.ok(Object.values(quotas).every(value=>value>=4));
  const deterministicA=createCrowd({seed:77}).map(p=>[p.x,p.z]);
  const deterministicB=createCrowd({seed:77}).map(p=>[p.x,p.z]);
  assert.deepEqual(deterministicA,deterministicB,'the same seed gives the same city');
  assert.notDeepEqual(deterministicA,createCrowd({seed:78}).map(p=>[p.x,p.z]));
});

test('ending a conversation puts people back on their way',()=>{
  const crowd=createCrowd({seed:41});
  const a=crowd.find(p=>p.mode==='walk');
  a.mode='talk';a.talk={until:99,next:0,lines:[['HI','HELLO']],turn:0,previous:'walk',partner:-1};
  endConversation(a,10,mulberry32(1));
  assert.equal(a.mode,'walk');
  assert.ok(a.cooldown>10,'they do not immediately start talking again');
  assert.equal(a.talk,null);
});
