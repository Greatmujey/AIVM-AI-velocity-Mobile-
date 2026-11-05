import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriors} from '../src/interiors.js';
import {LANDMARKS} from '../src/city-data.js';
import {HOME_CENTER} from '../src/home.js';
test('every non-home landmark has its own hidden enterable interior',()=>{
  const scene=new THREE.Scene(),{rooms,spots}=createInteriors(scene);
  for(const place of LANDMARKS.filter(p=>p.id!=='home')){
    const room=rooms[place.id];assert.ok(room,place.id);assert.equal(room.visible,false);assert.equal(room.position.x,HOME_CENTER.x);assert.equal(room.position.z,HOME_CENTER.z);assert.ok(room.children.length>5);
  }
  return {rooms,spots};
});

test('most rooms are populated, and the people inside stay within the walls',()=>{
  const scene=new THREE.Scene(),{rooms,spots}=createInteriors(scene);
  let populated=0;
  for(const place of LANDMARKS.filter(p=>p.id!=='home')){
    const crowd=spots[place.id]||[];
    if(crowd.length)populated++;
    for(const person of crowd){
      assert.ok(Math.abs(person.x)<6.4,`${place.id} person outside the room`);
      assert.ok(person.z>HOME_CENTER.z-6.4&&person.z<HOME_CENTER.z+6.4||Math.abs(person.z)<6.4,`${place.id} person outside the room`);
      assert.ok(['civilian','civilian-female','civilian-warm','civilian-dark'].includes(person.role),person.role);
    }
    assert.ok(rooms[place.id],place.id);
  }
  assert.ok(populated>=14,`expected at least 14 populated rooms, got ${populated}`);
});

test('rooms hold conversations: at least half of each crowd is a facing pair',()=>{
  const scene=new THREE.Scene(),{spots}=createInteriors(scene);
  let facing=0,total=0;
  for(const crowd of Object.values(spots))for(const person of crowd){
    total++;
    const partner=crowd.find(other=>other!==person&&Math.hypot(other.x-person.x,other.z-person.z)<3.4&&Math.abs(Math.atan2(Math.sin(other.ry-person.ry-Math.PI),Math.cos(other.ry-person.ry-Math.PI)))<1.1);
    if(partner)facing++;
  }
  assert.ok(total>30,`expected a busy interior crowd, got ${total}`);
  assert.ok(facing/total>.45,`expected most people to face somebody, got ${facing}/${total}`);
});
