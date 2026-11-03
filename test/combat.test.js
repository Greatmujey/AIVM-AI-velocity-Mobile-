import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAimTarget } from '../src/combat.js';
const enemy=(x,z)=>({alive:true,mesh:{position:{x,z}}});
const origin={x:0,z:0};
test('aim assist targets in front, not behind',()=>{const front=enemy(0,-10),back=enemy(0,2);assert.equal(selectAimTarget(origin,0,[back,front],30,[]),front)});
test('aim assist respects building cover and range',()=>{const target=enemy(0,-10),blocks=[{x:0,z:-5,halfX:2,halfZ:2}];assert.equal(selectAimTarget(origin,0,[target],30,blocks),null);assert.equal(selectAimTarget(origin,0,[target],5,[]),null)});
test('aim tracks camera rotation',()=>{const left=enemy(-10,0);assert.equal(selectAimTarget(origin,Math.PI/2,[left],30,[]),left)});
test('narrow aim cones exclude targets off the reticle',()=>{const offAxis=enemy(10,-10);assert.equal(selectAimTarget(origin,0,[offAxis],30,[],Math.PI/8),null)});
