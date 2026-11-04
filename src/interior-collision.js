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
};
export function moveInside(position,dx,dz,kind){const beforeX=position.x,beforeZ=position.z,boxes=INTERIOR_BLOCKS[kind]||[];const x=Math.max(-6.2,Math.min(6.2,position.x+dx)),z=Math.max(HOME_CENTER.z-5.6,Math.min(HOME_CENTER.z+5.8,position.z+dz));if(!blocked(x,position.z,boxes,.2))position.x=x;if(!blocked(position.x,z,boxes,.2))position.z=z;return Math.hypot(position.x-beforeX,position.z-beforeZ)}
