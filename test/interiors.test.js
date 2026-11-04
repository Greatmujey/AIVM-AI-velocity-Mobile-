import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriors} from '../src/interiors.js';
import {LANDMARKS} from '../src/city-data.js';
import {HOME_CENTER} from '../src/home.js';
test('every non-home landmark has its own hidden enterable interior',()=>{
  const scene=new THREE.Scene(),rooms=createInteriors(scene);
  for(const place of LANDMARKS.filter(p=>p.id!=='home')){
    const room=rooms[place.id];assert.ok(room,place.id);assert.equal(room.visible,false);assert.equal(room.position.x,HOME_CENTER.x);assert.equal(room.position.z,HOME_CENTER.z);assert.ok(room.children.length>5);
  }
});
