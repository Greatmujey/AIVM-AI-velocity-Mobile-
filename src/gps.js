// A tiny road-network router. This city uses streets on a 28m grid; routes are
// calculated on intersections rather than pointing through occupied blocks.
import { ROAD_LIMIT } from './city-data.js';
const ROADS = Array.from({length: ROAD_LIMIT / 14 + 1}, (_, i) => -ROAD_LIMIT + i * 28);
const nearest = value => ROADS.reduce((best, road) => Math.abs(value-road)<Math.abs(value-best)?road:best, ROADS[0]);
const clamp = value => Math.max(ROADS[0],Math.min(ROADS.at(-1),value));

function project(pos){
  const x=nearest(pos.x),z=nearest(pos.z);
  if(Math.abs(pos.x-x)<=Math.abs(pos.z-z)) return {x,z:clamp(pos.z),axis:'v'};
  return {x:clamp(pos.x),z,axis:'h'};
}
function neighbors(point){
  const variable=point.axis==='v'?point.z:point.x;
  return ROADS.filter((r,i)=>r<=variable && (i===ROADS.length-1||ROADS[i+1]>=variable) || r>=variable && (i===0||ROADS[i-1]<=variable))
    .map(r=>point.axis==='v'?{x:point.x,z:r}:{x:r,z:point.z});
}
const key=(x,z)=>`${x},${z}`;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);

export function roadRoute(start,end){
  const a=project(start),b=project(end),nodes=new Map();
  for(const x of ROADS)for(const z of ROADS)nodes.set(key(x,z),{x,z,edges:[]});
  function link(u,v,cost){u.edges.push([v,cost]);v.edges.push([u,cost])}
  for(const x of ROADS)for(const z of ROADS){const n=nodes.get(key(x,z));if(x<ROAD_LIMIT)link(n,nodes.get(key(x+28,z)),28);if(z<ROAD_LIMIT)link(n,nodes.get(key(x,z+28)),28)}
  const first={...a,edges:[]},last={...b,edges:[]};
  for(const n of neighbors(a))link(first,nodes.get(key(n.x,n.z)),distance(a,n));
  for(const n of neighbors(b))link(last,nodes.get(key(n.x,n.z)),distance(b,n));
  if((a.axis==='v'&&b.axis==='v'&&a.x===b.x)||(a.axis==='h'&&b.axis==='h'&&a.z===b.z))link(first,last,distance(a,b));
  const d=new Map([[first,0]]),prev=new Map(),queue=new Set([first,...nodes.values(),last]);
  while(queue.size){let current=null,best=Infinity;for(const n of queue){const v=d.get(n)??Infinity;if(v<best){current=n;best=v}}if(!current||current===last)break;queue.delete(current);for(const [next,cost] of current.edges){if(!queue.has(next))continue;const score=best+cost;if(score<(d.get(next)??Infinity)){d.set(next,score);prev.set(next,current)}}}
  const path=[];for(let n=last;n;n=prev.get(n)){path.unshift({x:n.x,z:n.z});if(n===first)break}
  const result=[{x:start.x,z:start.z},...path,{x:end.x,z:end.z}];
  return result.filter((p,i)=>i===0||distance(p,result[i-1])>.01);
}
