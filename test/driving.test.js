import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceVehicleSpeed} from '../src/driving.js';
test('braking stops a moving vehicle before reverse can engage',()=>{
  let speed=10;while(speed>0){speed=advanceVehicleSpeed(speed,-1,.05,16);assert.ok(speed>=0)}
  assert.equal(speed,0);speed=advanceVehicleSpeed(speed,-1,.05,16);assert.ok(speed<0);
});
test('acceleration and coasting stay within speed limits',()=>{
  let speed=0;for(let i=0;i<200;i++)speed=advanceVehicleSpeed(speed,1,.05,16);assert.equal(speed,16);
  for(let i=0;i<40;i++)speed=advanceVehicleSpeed(speed,0,.05,16);assert.ok(speed>0&&speed<.2);
});
