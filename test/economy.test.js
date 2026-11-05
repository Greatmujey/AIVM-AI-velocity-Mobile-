import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProgress,saveProgress,purchase,reward} from '../src/economy.js';
test('rewards and purchases persist without spending more than the balance',()=>{
 let value;const storage={getItem(){return value},setItem(k,v){value=v}};const p=loadProgress(storage);
 assert.equal(p.money,0);assert.equal(purchase(p,'smg'),false);reward(p,500);assert.equal(purchase(p,'smg'),true);assert.equal(p.money,100);assert.equal(purchase(p,'smg'),false);saveProgress(storage,p);assert.deepEqual(loadProgress(storage),p);
});
test('invalid saved progress and unknown items are safe',()=>{
 assert.deepEqual(loadProgress({getItem(){return '{bad'}}),{money:0,owned:[]});
 const p=loadProgress({getItem(){return '{"money":-3,"owned":["fake","car"]}'}});assert.equal(p.money,0);assert.deepEqual(p.owned,['car']);assert.equal(purchase(p,'fake'),false);
});
test('new weapon unlocks charge once and survive storage',()=>{const p={money:2000,owned:[]};assert.equal(purchase(p,'revolver'),true);assert.equal(purchase(p,'battle'),true);assert.equal(p.money,550);assert.equal(purchase(p,'revolver'),false);let value;saveProgress({setItem(k,v){value=v}},p);assert.deepEqual(loadProgress({getItem(){return value}}),p)});
