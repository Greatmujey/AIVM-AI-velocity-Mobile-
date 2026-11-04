import { HOME_CENTER } from './home.js';
import { blocked } from './navigation.js';
const rect=(x,z,w,d)=>({x:x+HOME_CENTER.x,z:z+HOME_CENTER.z,halfX:w/2,halfZ:d/2});
// Only solid furniture is included. Carpets and thin wall decorations aren't.
export const INTERIOR_BLOCKS={
 home:[rect(-3.7,-3.4,4.4,5),rect(4.7,2.8,2.8,1.2),rect(3.2,1.1,2.2,1.1),rect(3.5,-5.8,3.1,1),rect(5.8,-3.9,.8,.8)],
 hub:[rect(0,-4.5,9,1.3)], friend:[rect(-4,-3,3.4,1.4),rect(-2,-1,2.3,1.4),rect(3,-3.6,3.4,3.5)],
 church:[...[-3,3].flatMap(x=>[-3,0,3].map(z=>rect(x,z,3,.8))),rect(0,-5.1,3,1)], mosque:[],
 hotel:[rect(0,-4.6,8,1.3),rect(-4,1,2.5,1.1),rect(4,1,2.5,1.1)],
 casino:[...[-5,-3,3,5].map(x=>rect(x,-4.8,1.4,1.2)),...[-6,6].flatMap(x=>[1,3].map(z=>rect(x,z,1.2,1.4))),rect(0,-1,3.3,2.3)],
 shop:[rect(0,-4.7,10,1.2),...[-5,5].flatMap(x=>[-2,1,4].map(z=>rect(x,z,1.1,1.6)))],
 // Wave-5 rooms: counters, booths, beds, racks, crates and cars you cannot walk
 // through. Each room keeps the doorway at (0, +3) clear so nobody spawns stuck.
 diner:[rect(0,-5,11,1.2),...[-4.6,4.6].flatMap(x=>[-1,2].map(z=>rect(x,z,2.6,1.5)))],
 campdiner:[rect(0,-5,11,1.2),...[-4.6,4.6].flatMap(x=>[-1,2].map(z=>rect(x,z,2.6,1.5)))],
 cafe:[rect(-1,-5,8,1.2),...[-4.4,4.4].flatMap(x=>[-1.6,2.6].map(z=>rect(x,z,1.2,1.2)))],
 apartment:[rect(-4,-3,3.4,1.5),rect(3,-3.6,3.4,3.5),rect(-2,-1,2.3,1.4),rect(-1.4,-5.4,2.2,1.4),rect(-5.4,3.4,1.6,.9)],
 clinic:[rect(0,-5.2,6,1.2),...[-4.6,4.6].map(x=>rect(x,1.6,2.4,1.6)),rect(1.4,-1.4,.7,.7)],
 club:[rect(0,-5.4,3,1.2),rect(-2.6,4.4,7,1.2),...[-6,6].map(x=>rect(x,-4,1.2,1.2))],
 office:[rect(0,-5,6,1.3),...[-3,3].map(x=>rect(x,2.4,2.6,1.2)),...[-6,6].map(x=>rect(x,4.6,1.4,1.4))],
 garage:[...[-4.2,0,4.2].map(x=>rect(x,x===0?-3.6:-3.4,2.2,4.2)),rect(-6,3.4,2.4,1.2),rect(4.6,4.6,4,1)],
 market:[...[-4.4,0,4.4].map(x=>rect(x,-3.6,3,1.5)),...[1.6,3.6].map(z=>rect(-3.4,z,6,1.1)),...[-5.6,2.4,5.6].map(x=>rect(x,4.6,.9,.9))],
 gym:[rect(-1.4,1.4,2.2,1),rect(4.4,-2.4,3.4,1.2),...[-4.6,4.6].map(x=>rect(x,-5.4,1.8,.6))],
 fishmarket:[...[-4,0,4].map(x=>rect(x,-3.4,3,1.4)),...[-5.4,5.4].flatMap(x=>[1.4,3.4].map(z=>rect(x,z,1.2,1.2)))],
 warehouse:[...[-5,5].flatMap(x=>[-4.4,-1.4].map(z=>rect(x,z,2.6,2.6))),...[2,3.6].map(z=>rect(-2.4,z,3,1.2)),rect(4.4,3.6,2.6,1.1),rect(-6,4.6,1.6,1)],
 lodge:[rect(-5.6,-5.6,2.6,1),...[-1.6,2.4].map(x=>rect(x,1.4,2.4,1.3)),rect(4.6,-4.4,3.4,1.6),rect(-2.4,-5.2,2.4,.9)],
};
export function moveInside(position,dx,dz,kind){const beforeX=position.x,beforeZ=position.z,boxes=INTERIOR_BLOCKS[kind]||[];const x=Math.max(-6.2,Math.min(6.2,position.x+dx)),z=Math.max(HOME_CENTER.z-5.6,Math.min(HOME_CENTER.z+5.8,position.z+dz));if(!blocked(x,position.z,boxes,.2))position.x=x;if(!blocked(position.x,z,boxes,.2))position.z=z;return Math.hypot(position.x-beforeX,position.z-beforeZ)}
