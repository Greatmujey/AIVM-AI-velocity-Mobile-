import test from 'node:test';
import assert from 'node:assert/strict';
import { streetConversation, applyStreetEffect, nearestLandmarkId, SNACK_PRICE, STREET_BET } from '../src/street-talk.js';
import { LANDMARKS } from '../src/city-data.js';

test('a street conversation is shaped by district, cash and heat',()=>{
  const convo=streetConversation({npc:{name:'AMA'},district:'market',cash:500,heat:0,seed:3,nearPlaceId:'market'});
  assert.equal(convo.title,'AMA');
  assert.ok(convo.opening.length>2);
  const labels=convo.options.map(o=>o.label);
  assert.ok(labels.includes('SAY HELLO')&&labels.includes('GOODBYE'));
  assert.ok(labels.some(label=>label.includes(`$${SNACK_PRICE}`)),'food is on offer when you can pay');
  assert.ok(labels.some(label=>label.includes('ASK ABOUT MARKET HALL')),'they know the place you are standing at');
  assert.ok(!labels.some(label=>label.includes('POLICE')),'nobody mentions the police when you are clean');

  const broke=streetConversation({npc:{name:'TUNDE'},district:'desert',cash:0,heat:0,seed:3});
  assert.ok(!broke.options.some(o=>o.effect?.kind==='buy'),'no shopping without cash');
  const wanted=streetConversation({npc:{name:'MUSA'},district:'downtown',cash:900,heat:2,seed:3});
  assert.ok(wanted.options.some(o=>o.id==='heat'),'being wanted changes the conversation');
  assert.ok(!wanted.options.some(o=>o.effect?.kind==='race'),'nobody bets with a fugitive');
});

test('every district has its own small talk',()=>{
  const seen=new Set();
  for(const district of ['city','downtown','market','village','harbor','hills','desert']){
    const convo=streetConversation({npc:{name:'X'},district,cash:1000,heat:0,seed:district.length+1});
    const tip=convo.options.find(o=>o.id==='tip');
    assert.ok(tip&&tip.reply.length>10,`${district} has nothing to say`);
    seen.add(tip.reply);
  }
  assert.equal(seen.size,7,'each district says something different');
});

test('buying food takes cash and restores health, but only once you can pay',()=>{
  const effect={kind:'buy',cost:SNACK_PRICE,health:18,toast:'GRILL PLATE · HEALTH +18'};
  const fed=applyStreetEffect(effect,{money:100,health:60});
  assert.equal(fed.money,100-SNACK_PRICE);
  assert.equal(fed.health,78);
  assert.equal(fed.toast,'GRILL PLATE · HEALTH +18');
  const broke=applyStreetEffect(effect,{money:5,health:60});
  assert.equal(broke.money,5);assert.equal(broke.health,60);assert.equal(broke.toast,'NOT ENOUGH CASH');
  const full=applyStreetEffect(effect,{money:100,health:99});
  assert.equal(full.health,100,'health never goes above 100');
});

test('gifts, routes and race bets change the right things',()=>{
  assert.equal(applyStreetEffect({kind:'gift',amount:50},{money:10}).money,60);
  const routed=applyStreetEffect({kind:'route',placeId:'garage',toast:'GPS SET'},{money:10});
  assert.equal(routed.placeId,'garage');
  const bet=applyStreetEffect({kind:'race',stake:STREET_BET,prize:260,rival:'AMA',bike:true},{money:300,health:80});
  assert.equal(bet.money,300-STREET_BET);
  assert.deepEqual(bet.race,{stake:STREET_BET,prize:260,rival:'AMA',bike:true});
  assert.equal(applyStreetEffect({kind:'race',stake:STREET_BET,prize:260,rival:'AMA'},{money:10}).race,null);
  assert.equal(applyStreetEffect({kind:'close'},{}).close,true);
  assert.equal(applyStreetEffect(null,{money:7}).money,7);
});

test('the nearest door is the one they give directions to',()=>{
  const garage=LANDMARKS.find(p=>p.id==='garage');
  assert.equal(nearestLandmarkId(garage.x+3,garage.z+9),'garage');
  assert.equal(nearestLandmarkId(400,400),null,'nothing out in the open sea');
  for(const place of LANDMARKS)assert.equal(nearestLandmarkId(place.x,place.z+8),place.id,place.id);
});
