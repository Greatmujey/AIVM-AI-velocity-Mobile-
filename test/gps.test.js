import test from 'node:test';
import assert from 'node:assert/strict';
import { roadRoute } from '../src/gps.js';
const pathLength=path=>path.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-path[i].x)+Math.abs(p.z-path[i].z),0);
test('routes between intersections use short street segments',()=>{const path=roadRoute({x:0,z:0},{x:56,z:-28});assert.equal(pathLength(path),84);for(let i=1;i<path.length;i++)assert.ok(path[i].x===path[i-1].x||path[i].z===path[i-1].z)});
test('routes directly along the same street',()=>{const path=roadRoute({x:0,z:10},{x:0,z:-10});assert.equal(pathLength(path),20)});
test('off-centre start projects to the nearest street',()=>{const path=roadRoute({x:4,z:10},{x:0,z:-28});assert.deepEqual(path[1],{x:0,z:10});assert.equal(pathLength(path),42)});
test('same position does not create duplicate waypoints',()=>{const path=roadRoute({x:0,z:0},{x:0,z:0});assert.deepEqual(path,[{x:0,z:0}])});
