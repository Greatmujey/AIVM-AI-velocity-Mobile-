import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {HOME_CENTER} from '../src/home.js';import {moveInside,INTERIOR_BLOCKS} from '../src/interior-collision.js';import {blocked} from '../src/navigation.js';import {createInteriors} from '../src/interiors.js';
test('entry points are clear and solid furniture blocks passage',()=>{for(const [name,boxes] of Object.entries(INTERIOR_BLOCKS)){const entry={x:0,z:HOME_CENTER.z+(name==='home'?0:3)};assert.equal(blocked(entry.x,entry.z,boxes,.2),false,name)}const p={x:0,z:HOME_CENTER.z+2};for(let i=0;i<100;i++)moveInside(p,0,-.1,'casino');assert.ok(p.z>=HOME_CENTER.z+.14)});
test('interior walls clamp movement and empty floor remains walkable',()=>{const p={x:0,z:HOME_CENTER.z};assert.ok(moveInside(p,1,0,'mosque')>.9);for(let i=0;i<200;i++)moveInside(p,.1,0,'mosque');assert.equal(p.x,6.2)});

test('nobody inside a room stands in a wall of furniture',()=>{
  const scene=new THREE.Scene(),{spots}=createInteriors(scene);
  let checked=0;
  for(const [name,boxes] of Object.entries(INTERIOR_BLOCKS)){
    const entry={x:0,z:HOME_CENTER.z+(name==='home'?0:3)};
    assert.equal(blocked(entry.x,entry.z,boxes,.2),false,`${name} doorway`);
    for(const person of spots[name]||[]){checked++;assert.equal(blocked(person.x+HOME_CENTER.x,person.z+HOME_CENTER.z,boxes,.2),false,`${name} person at ${person.x},${person.z}`)}
  }
  assert.ok(checked>20,`expected interior people to be checked, got ${checked}`);
});
