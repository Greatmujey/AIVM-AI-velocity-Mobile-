import * as THREE from 'three';
import { LANDMARKS } from './city-data.js';
import { HOME_CENTER as HOME_ORIGIN } from './home.js';

// Rooms live on an off-map stage beside the city. Only the room being visited is
// visible, and exterior collision and navigation never depend on their geometry.
// `LANDMARKS` drives the list, so every door in the city has a real interior.
const ROOM_STYLES = {
  hub:{floor:0xb49c7e,wall:0xe3d4b9}, friend:{floor:0xb49c7e,wall:0xe3d4b9},
  church:{floor:0xece1ce,wall:0xe5dbca}, mosque:{floor:0x568d77,wall:0xd2d7c2},
  hotel:{floor:0xb49c7e,wall:0xe3d4b9}, casino:{floor:0x9c5448,wall:0xe3d4b9},
  shop:{floor:0xb49c7e,wall:0xe3d4b9}, diner:{floor:0xd9d2c2,wall:0xf0dcd0},
  garage:{floor:0x8f969a,wall:0xd7d2c6}, clinic:{floor:0xdfe8e2,wall:0xf1f4ef},
  club:{floor:0x2c2436,wall:0x3d2f4a}, office:{floor:0xc9c6bd,wall:0xe6e3da},
  cafe:{floor:0xc0a383,wall:0xe8d6bd}, apartment:{floor:0xb08d68,wall:0xe5d8c3},
  market:{floor:0xa8977a,wall:0xe0d3bb}, gym:{floor:0x9aa79f,wall:0xdfe3da},
  fishmarket:{floor:0x9fb3b8,wall:0xdfe8e6}, warehouse:{floor:0x8d8f88,wall:0xc6c3b6},
  lodge:{floor:0x9a7550,wall:0xdcc7a8},
};

// Where people stand or sit inside each style. Pairs face each other so the room
// reads as a conversation, not a queue of statues.
export const INTERIOR_CROWD = {
  diner:[[-4.4,-3.2,0,'civilian-warm'],[-4.6,-2.2,Math.PI,'civilian'],[4.6,-4.2,Math.PI,'civilian-female'],[1.6,3.4,Math.PI/2,'civilian-dark'],[-1.4,3.4,-Math.PI/2,'civilian']],
  garage:[[4.6,3.4,0,'civilian'],[4.6,1.8,0,'civilian-warm'],[-2.1,-1.2,0,'civilian-dark']],
  clinic:[[-4.8,-2.4,Math.PI/2,'civilian-female'],[-4.8,-.8,-Math.PI/2,'civilian'],[4.4,3.2,Math.PI,'civilian-warm']],
  club:[[-3.2,1.4,Math.PI,'civilian-dark'],[-3.2,3,0,'civilian-female'],[3.4,-2.6,Math.PI,'civilian'],[3.4,-1,0,'civilian-warm']],
  office:[[0,4.2,Math.PI,'civilian'],[-4.6,-3.4,Math.PI/2,'civilian-female'],[4.6,-3.4,-Math.PI/2,'civilian-dark']],
  cafe:[[-5.3,-1.6,0,'civilian-warm'],[-3.5,-1.6,0,'civilian'],[5.3,2.6,0,'civilian-female'],[3.5,2.6,0,'civilian-dark']],
  apartment:[[0.6,-3.2,0,'civilian-female'],[-1.2,-3.2,0,'civilian']],
  market:[[-4.4,-2.3,0,'civilian-warm'],[-2.6,-2.3,0,'civilian-female'],[1.4,-2.3,0,'civilian'],[3.2,-2.3,0,'civilian-dark'],[0,0.4,0,'civilian']],
  gym:[[3.8,-3.6,Math.PI,'civilian'],[-3.8,-3.6,Math.PI,'civilian-dark'],[-4.4,2.4,-Math.PI/2,'civilian-female']],
  fishmarket:[[-4.4,-2.3,0,'civilian-warm'],[-4.4,-0.9,0,'civilian'],[4.2,2.4,0,'civilian-dark']],
  warehouse:[[-2.2,-4.2,0,'civilian'],[-0.4,-4.2,0,'civilian-dark'],[4.4,2.6,0,'civilian-warm'],[4.4,1.2,0,'civilian']],
  lodge:[[-4.2,-2.8,Math.PI/2,'civilian-warm'],[-4.2,-1.2,-Math.PI/2,'civilian'],[4.4,3,Math.PI,'civilian']],
  campdiner:[[-4.4,-3.2,0,'civilian-dark'],[-4.6,-2.2,Math.PI,'civilian-warm'],[4.4,3.8,Math.PI,'civilian']],
  hub:[[0,-5.65,Math.PI,'civilian']], friend:[[4,1,Math.PI,'civilian-warm']],
  hotel:[[0,-5.8,Math.PI,'civilian-female']], casino:[[0,-4.6,Math.PI,'civilian-dark'],[-4.4,1.6,0,'civilian'],[-4.4,3.2,0,'civilian-warm']],
  shop:[[0,-3.4,0,'civilian-warm'],[1.8,-3.4,0,'civilian']],
  church:[[-3,-3.6,Math.PI,'civilian'],[3,-3.6,Math.PI,'civilian-female'],[0,3.4,Math.PI,'civilian-dark']],
  mosque:[[-3,-2.6,Math.PI,'civilian'],[3,-2.6,Math.PI,'civilian-warm']],
};

export function createInteriors(scene) {
  const result = {}, spots = {};
  const material = color => new THREE.MeshStandardMaterial({color,roughness:.85});
  const wood = material(0x76513a), dark = material(0x39433c),
    gold = material(0xd5b573), green = material(0x568d77), red = material(0x9c5448),
    blue = material(0x71919b), cream = material(0xece1ce), steel = material(0x9aa4a8),
    glassy = new THREE.MeshStandardMaterial({color:0x9fd2d8,roughness:.25,metalness:.2}),
    neonPink = new THREE.MeshBasicMaterial({color:0xff7ad1}), neonLime = new THREE.MeshBasicMaterial({color:0xc9fc51}),
    neonBlue = new THREE.MeshBasicMaterial({color:0x6fd0ff});

  for (const place of LANDMARKS) {
    if (place.id === 'home') continue;
    const style = place.kind;
    const palette = ROOM_STYLES[style] || {floor:0xb49c7e,wall:0xe3d4b9};
    const g = new THREE.Group();
    g.position.set(HOME_ORIGIN.x, 0, HOME_ORIGIN.z);
    g.visible = false; scene.add(g); result[place.id] = g;
    const floor = material(palette.floor), wall = material(palette.wall);
    function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;g.add(o);return o}
    // Shared shell: four walls, a floor, a ceiling and a door on the south wall.
    box(14,.25,13,floor,0,-.13,0);
    box(14,4.5,.2,wall,0,2.25,-6.5);box(.2,4.5,13,wall,-7,2.25,0);box(.2,4.5,13,wall,7,2.25,0);
    box(14,4.5,.2,wall,0,2.25,6.5);box(14,.12,13,cream,0,4.5,0);
    box(2.2,2.8,.12,wood,0,1.4,6.35);box(.15,.15,.15,gold,.7,1.25,6.2);
    for(const x of [-4,4]){box(2.1,1.5,.08,wood,x,2.8,-6.35);box(1.8,1.2,.08,blue,x,2.8,-6.28)}
    // A hanging sign inside the door keeps each room identifiable. Skipped when
    // there is no DOM (Node tests build the rooms to check their geometry).
    if(typeof document!=='undefined'&&document.createElement){
      const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=96;
      const sctx=signCanvas.getContext('2d');sctx.fillStyle=place.color;sctx.fillRect(0,0,512,96);
      sctx.fillStyle='#17241f';sctx.font='bold 44px sans-serif';sctx.textAlign='center';sctx.fillText(place.name,256,62);
      const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
      box(6.4,.85,.1,new THREE.MeshStandardMaterial({map:signTexture,roughness:.8}),0,3.85,6.3);
    }

    if(style==='church'||style==='mosque'){
      box(8,.06,8,style==='mosque'?red:cream,0,.04,-1);
      if(style==='church'){for(const x of [-3,3])for(const z of [-3,0,3]){box(3,.5,.8,wood,x,.45,z);box(3,.8,.12,wood,x,1.05,z+.36)}box(3,.9,1,wood,0,.5,-5.1);box(.18,2,.14,gold,0,2.8,-6.28);box(1.2,.18,.14,gold,0,3,-6.28)}
      else {for(const z of [-3,-1,1,3])box(8,.025,.07,gold,0,.08,z);box(2.2,2.6,.1,cream,0,1.5,-6.3);box(1.6,2,.12,green,0,1.4,-6.22)}
    }else if(style==='casino'){
      box(9,.05,8,red,0,.04,-1);
      for(const x of [-5,-3,3,5]){box(1.4,2,1.2,dark,x,1,-4.8);box(1,.8,.08,blue,x,1.5,-4.14);box(.9,.12,.35,gold,x,.9,-4.05)}
      for(const x of [-6,6])for(const z of [1,3]){box(1.2,2,1.4,dark,x,1,z);box(.08,.8,1,blue,x+(x<0?.65:-.65),1.5,z);box(.3,.12,.9,gold,x+(x<0?.7:-.7),.9,z)}
      box(3,.75,2,green,0,.85,-1);box(3.3,.12,2.3,wood,0,1.25,-1);
    }else if(style==='shop'){
      box(10,1.2,1,wood,0,.6,-4.7);box(10,.12,1.2,cream,0,1.24,-4.7);
      for(const x of [-5,5])for(const z of [-2,1,4]){for(const dz of [-.7,.7])box(.1,2.8,.1,wood,x,1.4,z+dz);for(let y=.4;y<2.7;y+=.7){box(1.1,.12,1.6,wood,x,y,z);for(const dz of [-.4,0,.4])box(.35,.4,.25,((Math.round(z+y*10+dz*10)%3+3)%3===0)?red:((dz===0)?green:gold),x,y+.26,z+dz)}}
    }else if(style==='hub'){
      box(9,1.2,1,wood,0,.6,-4.5);box(9,.13,1.3,green,0,1.22,-4.5);box(3,1.5,.1,dark,0,2.7,-6.3);box(2.6,1.1,.08,green,0,2.7,-6.2);
    }else if(style==='hotel'){
      box(8,1.2,1.2,wood,0,.6,-4.6);box(8,.12,1.3,cream,0,1.22,-4.6);box(2.5,.8,1.1,green,-4,.5,1);box(2.5,.8,1.1,green,4,.5,1);box(3,.08,2,red,0,.05,2);
    }else if(style==='diner'){
      box(11,1.05,1.1,steel,0,.55,-5);box(11.2,.1,1.3,cream,0,1.1,-5);box(3,.9,.9,glassy,-3.4,1.55,-5);
      for(const x of [-4.5,-2.5,-.5,1.5,3.5])box(.5,.75,.5,red,x,.4,-3.7);
      for(const z of [-1,2])for(const x of [-4.6,4.6]){box(2.6,.7,1.4,red,x,.55,z);box(2.6,.9,.25,red,x,1.2,z+(x<0?.7:-.7));box(.9,.08,.9,cream,x,.95,z)}
      box(1.6,.5,1,steel,5.6,.3,-5.4);box(.2,1.4,.2,steel,5.6,1.2,-5.4);box(.9,.16,.5,neonPink,0,3.5,-6.3);
      box(.06,1.6,5.2,neonPink,-6.9,2.6,0);
    }else if(style==='garage'){
      box(13,.06,12,material(0x7d8488),0,.02,0);
      for(const [x,z,tint] of [[-4.2,-3.4,0xd8d3c6],[0,-3.6,0x4f7fd0],[4.2,-3.4,0xe8552f]]){
        box(2.1,.62,4.1,material(tint),x,.62,z);box(1.8,.55,2.1,glassy,x,1.2,z+.1);
        for(const sx of [-1,1])for(const sz of [-1.3,1.3]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.3,12),dark);w.rotation.z=Math.PI/2;w.position.set(x+sx*.95,.42,z+sz);g.add(w)}
      }
      box(2.4,2.1,1.2,steel,-6,1.05,3.4);box(2.2,.16,1,material(0xc9d08a),-6,2.2,3.4);
      for(const z of [1,2.4,3.8]){const tyre=new THREE.Mesh(new THREE.TorusGeometry(.5,.2,8,14),dark);tyre.rotation.x=Math.PI/2;tyre.position.set(6.1,.55,z);g.add(tyre)}
      box(4,1.1,1,wood,4.6,.55,4.6);box(3.6,.1,1.2,cream,4.6,1.14,4.6);box(2.6,1.5,.1,dark,4.6,2.6,-6.3);box(2.2,1.1,.08,neonLime,4.6,2.6,-6.22);
    }else if(style==='clinic'){
      box(6,1.1,1,cream,0,.55,-5.2);box(6.2,.1,1.2,steel,0,1.14,-5.2);box(.9,.5,.5,green,-2,1.4,-5.2);
      for(const x of [-4.6,4.6]){box(2.4,.65,1.5,cream,x,.6,1.6);box(2.4,.14,1.5,material(0xbcd8e6),x,1,0);box(.14,2.2,.14,steel,x,1.1,2.4);box(1.9,.06,1.1,material(0xe8eef0),x,2.2,1.6)}
      box(.3,1.4,.3,steel,1.4,.7,-1.4);box(.5,.35,.5,cream,1.4,1.5,-1.4);
      for(const x of [-2.4,0,2.4])box(1.6,1.9,.08,material(0xcfe0d8),x,1.6,-6.3);
      box(.14,1.4,3.4,material(0xe6ecec),-6.9,1.4,-2);box(.14,1.4,3.4,material(0xe6ecec),6.9,1.4,-2);
    }else if(style==='club'){
      box(9,.06,8,material(0x241d2e),0,.03,0);
      for(let i=0;i<5;i++)box(1.7,.05,1.7,i%2?neonPink:neonBlue,-3.4+i*1.7,.07,-1.6);
      box(3,1.1,1.2,dark,0,.55,-5.4);box(2.4,.8,.8,steel,0,1.5,-5.4);box(1.4,.5,.4,neonLime,0,1.95,-5.4);
      for(const x of [-6,6]){box(1.2,2.6,1.2,dark,x,1.3,-4);box(1,.4,.4,neonPink,x,2.4,-3.3)}
      box(7,1.05,1.1,material(0x4a3550),-2.6,.55,4.4);box(7.2,.1,1.3,steel,-2.6,1.12,4.4);
      for(const z of [-4,4])box(.06,2.4,.06,neonBlue,z*.9,2.6,-6.3);
      box(3.4,.06,3.4,material(0x3a2c46),4.4,.06,3.4);
    }else if(style==='office'){
      box(6,1.1,1.2,wood,0,.55,-5);box(6.2,.1,1.4,cream,0,1.14,-5);
      for(const x of [-4.6,4.6])box(1.9,3.1,.14,steel,x,1.7,-6.32);
      for(const x of [-3,3]){box(2.6,.55,1.1,material(0x6f7d86),x,.5,2.4);box(2.6,.5,.14,material(0x6f7d86),x,.95,2.9)}
      box(1.4,.4,1.4,green,-6,1.3,4.6);box(1.1,.7,1.1,material(0x5f7f57),-6,1.9,4.6);
      box(1.4,.4,1.4,green,6,1.3,4.6);box(1.1,.7,1.1,material(0x5f7f57),6,1.9,4.6);
      box(3.4,2,.1,material(0xdad6c8),0,2.2,-6.3);box(3,1.6,.06,material(0xf0ead8),0,2.2,-6.24);
    }else if(style==='cafe'){
      box(8,1.1,1,wood,-1,.55,-5);box(8.2,.1,1.2,cream,-1,1.14,-5);box(1.6,.7,.9,steel,4.4,.4,-5.4);box(1.4,.2,.8,dark,4.4,.85,-5.4);
      for(const [x,z] of [[-4.4,-1.6],[4.4,-1.6],[-4.4,2.6],[4.4,2.6]]){box(1.3,.08,1.3,wood,x,.85,z);box(.16,.85,.16,wood,x,.42,z);
        for(const d of [[-.9,0],[.9,0],[0,-.9]])box(.42,.5,.42,material(0xb98f6a),x+d[0],.28,z+d[1])}
      for(const x of [-4,0,4]){const lamp=new THREE.Mesh(new THREE.ConeGeometry(.45,.4,10,1,true),material(0xe8c98a));lamp.position.set(x,3.5,-1);g.add(lamp)}
      box(2.4,1.6,.12,material(0x8c6a4a),6.9,2,-2);box(2,1.2,.08,neonLime,6.86,2.1,-2);
    }else if(style==='apartment'){
      box(3.4,.7,1.4,green,-4,.5,-3);box(3.4,.8,.25,green,-4,1.15,-3.6);box(2.3,.14,1.4,wood,-2,.65,-1);
      box(3.4,.7,3.5,cream,3,.55,-3.6);box(3.4,.15,1.8,blue,3,1,-2.9);box(1.6,1,.2,dark,0,1.8,-6.2);
      box(2.2,.1,1.4,material(0x8e9aa2),-1.4,1.1,-5.4);box(1.6,.9,.9,steel,-5.4,.5,3.4);box(1.4,.1,.8,dark,-5.4,1,3.4);
      box(3,.08,2.2,material(0x9c5f52),0,.05,2.6);
      const fan=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.6,6),steel);fan.position.set(5.6,3.2,3.6);g.add(fan);
    }else if(style==='market'){
      [-4.4,0,4.4].forEach((x,slot)=>{box(3,1,1.4,wood,x,.5,-3.6);box(3.2,.1,1.6,cream,x,1.04,-3.6);
        for(let i=0;i<4;i++)box(.5,.34,.42,[red,green,gold,material(0xc98f5a)][i%4],x-1.1+i*.72,1.24,-3.6);
        box(3.4,.1,1.9,slot%2?material(0xd8b46a):material(0x9fbfa5),x,2.9,-3.6)});
      for(const z of [1.6,3.6])box(6,.9,1.1,wood,-3.4,.45,z);
      for(const [x,z] of [[-5.6,4.6],[5.6,4.6],[2.4,4.6]]){box(.9,1.1,.9,material(0xb08a5e),x,.55,z);box(.8,.5,.8,material(0xc9a97a),x,1.3,z)}
      box(.5,1.2,.5,steel,-6.4,.6,0);box(1,.08,.7,cream,-6.4,1.24,0);
    }else if(style==='gym'){
      box(6,.1,4,material(0x54615a),0,.06,-3.4);
      for(const x of [-4.6,4.6]){box(.2,2.2,.2,steel,x,1.1,-5.4);box(1.6,.16,.16,steel,x,1.9,-5.4);
        for(const d of [-.6,.6]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.14,12),dark);plate.rotation.z=Math.PI/2;plate.position.set(x+d,1.9,-5.4);g.add(plate)}}
      box(2.2,.55,1,red,-1.4,.4,1.4);box(2,.14,.9,dark,-1.4,.74,1.4);
      const bag=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,1.5,10),material(0x7a3a34));bag.position.set(3.6,2.4,1.6);g.add(bag);
      box(3.4,.16,1.2,steel,4.4,.9,-2.4);box(3,.1,.9,dark,4.4,1.04,-2.4);box(.14,1.2,.14,steel,-6.6,.6,-2);
      box(6.4,2.4,.08,glassy,0,1.6,-6.34);
    }else if(style==='fishmarket'){
      for(const x of [-4,0,4]){box(3,.9,1.3,steel,x,.5,-3.4);box(3,.16,1.4,material(0xdff0f4),x,1,-3.4);
        for(let i=0;i<3;i++)box(.8,.18,.4,material(0x9fb4b8),x-.9+i*.9,1.14,-3.4)}
      for(const z of [1.4,3.4]){box(1.2,1,1.2,material(0xb08a5e),-5.4,.5,z);box(1.2,1,1.2,material(0x9c7a52),5.4,.5,z)}
      const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.55,.5,1.1,12),material(0x8a6a48));barrel.position.set(2.2,.55,3.4);g.add(barrel);
      for(const x of [-3.4,0,3.4])box(.1,1.4,.1,steel,x,3.4,-1);
      box(.5,1.2,.5,steel,-6.4,.6,-1);box(1,.08,.7,cream,-6.4,1.24,-1);
    }else if(style==='warehouse'){
      for(const [x,z,tint] of [[-5,-4.4,0xb4654a],[-5,-1.4,0x4f7fa8],[5,-4.4,0x6f8f5a],[5,-1.4,0xc9a24a]]){box(2.6,2.4,2.6,material(tint),x,1.2,z);box(2.7,.14,2.7,dark,x,2.46,z)}
      for(const z of [2,3.6]){box(3,.14,1.2,wood,-2.4,.9,z);box(.16,.9,.16,wood,-3.8,.45,z);box(.16,.9,.16,wood,-1,.45,z)}
      box(2.6,1.1,1.1,wood,4.4,.55,3.6);box(2.4,.1,1.2,cream,4.4,1.14,3.6);box(1,.7,.5,dark,4.4,1.5,3.6);
      for(const x of [-4,0,4])box(1.4,.1,.5,material(0xe8dcb8),x,3.6,0);
      box(1.6,1.9,.9,material(0xc9a24a),-6,1,4.6);
    }else if(style==='lodge'){
      box(2.6,2.2,1,material(0x8d7a63),-5.6,1.1,-5.6);box(2,1.6,.14,dark,-5.6,1,-5.05);box(2.2,.2,.2,neonPink,-5.6,2,-5);
      for(const [x,z] of [[-1.6,1.4],[2.4,1.4]]){box(2.4,.12,1.3,wood,x,.85,z);for(const d of [[-1,-.5],[1,-.5],[-1,.5],[1,.5]])box(.16,.85,.16,wood,x+d[0],.42,z+d[1])}
      box(3.4,.7,1.6,wood,4.6,.5,-4.4);box(3.2,.5,1.4,material(0xbcd0c0),4.6,.95,-4.4);
      box(2.4,.6,.9,material(0xc2e34e),-2.4,.8,-5.2);box(.2,.7,.2,steel,-3.2,1.4,-5.2);box(1,.12,.12,steel,-2.6,1.7,-5.2);
      box(2.4,1.6,.1,material(0xd9cba6),2.4,2.2,-6.32);box(2,1.2,.06,material(0x9fbfa5),2.4,2.2,-6.26);
    }else{
      box(3.4,.7,1.4,green,-4,.5,-3);box(3.4,.8,.25,green,-4,1.15,-3.6);box(2.3,.14,1.4,wood,-2,.65,-1);box(3.4,.7,3.5,cream,3,.55,-3.6);box(3.4,.15,1.8,blue,3,1,-2.9);box(1.6,1,.2,dark,0,1.8,-6.2);
    }
    const list = (INTERIOR_CROWD[place.id] || INTERIOR_CROWD[style] || []).map(([x,z,ry,role]) => ({x,z,ry,role}));
    // Face whoever you are standing with: the authored yaw is only a fallback for
    // people who are on their own, so every pair inside really looks at each other.
    for (const person of list) {
      const partner = list.find(other => other !== person && Math.hypot(other.x - person.x, other.z - person.z) < 3.4);
      if (partner) person.ry = Math.atan2(-(partner.x - person.x), -(partner.z - person.z));
    }
    spots[place.id] = list;
  }
  return {rooms:result, spots};
}
