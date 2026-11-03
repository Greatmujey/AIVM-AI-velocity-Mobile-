import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePursuit } from '../src/pursuit.js';

test('rival follows the next street waypoint without overshooting',()=>{
  const p={x:0,z:0},route=[{x:0,z:0},{x:0,z:-5},{x:28,z:-5}];
  assert.ok(Math.abs(advancePursuit(p,route,1,[],11))<1e-9);
  assert.deepEqual(p,{x:0,z:-5});
  advancePursuit(p,route,.5,[],11);
  assert.equal(p.z,-5);assert.ok(p.x>0&&p.x<28);
});
test('rival movement remains blocked by buildings',()=>{
  const p={x:0,z:0},block={x:0,z:-4,halfX:2,halfZ:2};
  advancePursuit(p,[{x:0,z:0},{x:0,z:-4}],.3,[block],10);
  assert.equal(p.z,0);
});

test('pursuer can navigate a city-grid turn without being trapped by a block', async()=>{
  const {roadRoute}=await import('../src/gps.js');
  const p={x:0,z:-40},target={x:56,z:-40},blocks=[];
  for(let x=-70;x<=70;x+=28)for(let z=-70;z<=70;z+=28)blocks.push({x,z,halfX:6.6,halfZ:6.1});
  let route=[],untilRoute=0;
  for(let i=0;i<500;i++){
    if(untilRoute<=0){route=roadRoute(p,target);untilRoute=.8}
    advancePursuit(p,route,.05,blocks,11);untilRoute-=.05;
  }
  assert.ok(Math.hypot(p.x-target.x,p.z-target.z)<3);
});
