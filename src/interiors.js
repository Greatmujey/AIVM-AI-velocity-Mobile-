import * as THREE from 'three';
import { HOME_CENTER } from './home.js';

// Separate rooms share an off-map stage. Only the currently visited room is
// visible; exterior collision and navigation never depend on their geometry.
export function createInteriors(scene) {
  const result={};
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
  const wall=material(0xe3d4b9),floor=material(0xb49c7e),dark=material(0x39433c),wood=material(0x76513a),gold=material(0xd5b573),green=material(0x568d77),red=material(0x9c5448),blue=material(0x71919b),cream=material(0xece1ce);
  for(const kind of ['hub','friend','church','mosque','hotel','casino','shop']){
    const g=new THREE.Group();g.position.set(HOME_CENTER.x,0,HOME_CENTER.z);g.visible=false;scene.add(g);result[kind]=g;
    function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;g.add(o);return o}
    box(14,.25,13,kind==='mosque'?green:floor,0,-.13,0);
    box(14,4.5,.2,wall,0,2.25,-6.5);box(.2,4.5,13,wall,-7,2.25,0);box(.2,4.5,13,wall,7,2.25,0);
    box(14,4.5,.2,wall,0,2.25,6.5);box(14,.12,13,cream,0,4.5,0);
    box(2.2,2.8,.12,wood,0,1.4,6.35);box(.15,.15,.15,gold,.7,1.25,6.2);
    for(const x of [-4,4]){box(2.1,1.5,.08,wood,x,2.8,-6.35);box(1.8,1.2,.08,blue,x,2.8,-6.28)}
    if(kind==='church'||kind==='mosque'){
      box(8,.06,8,kind==='mosque'?red:cream,0,.04,-1);
      if(kind==='church'){for(const x of [-3,3])for(const z of [-3,0,3]){box(3,.5,.8,wood,x,.45,z);box(3,.8,.12,wood,x,1.05,z+.36)}box(3,.9,1,wood,0,.5,-5.1);box(.18,2,.14,gold,0,2.8,-6.28);box(1.2,.18,.14,gold,0,3,-6.28)}
      else {for(const z of [-3,-1,1,3])box(8,.025,.07,gold,0,.08,z);box(2.2,2.6,.1,cream,0,1.5,-6.3);box(1.6,2,.12,green,0,1.4,-6.22)}
    }else if(kind==='casino'){
      box(9,.05,8,red,0,.04,-1);
      for(const x of [-5,-3,3,5]){box(1.4,2,1.2,dark,x,1,-4.8);box(1,.8,.08,blue,x,1.5,-4.14);box(.9,.12,.35,gold,x,.9,-4.05)}
      for(const x of [-6,6])for(const z of [1,3]){box(1.2,2,1.4,dark,x,1,z);box(.08,.8,1,blue,x+(x<0?.65:-.65),1.5,z);box(.3,.12,.9,gold,x+(x<0?.7:-.7),.9,z)}
      box(3,.75,2,green,0,.85,-1);box(3.3,.12,2.3,wood,0,1.25,-1);
    }else if(kind==='shop'){
      box(10,1.2,1,wood,0,.6,-4.7);box(10,.12,1.2,cream,0,1.24,-4.7);
      for(const x of [-5,5])for(const z of [-2,1,4]){for(const dz of [-.7,.7])box(.1,2.8,.1,wood,x,1.4,z+dz);for(let y=.4;y<2.7;y+=.7){box(1.1,.12,1.6,wood,x,y,z);for(const dz of [-.4,0,.4])box(.35,.4,.25,((Math.round(z+y*10+dz*10)%3+3)%3===0)?red:((dz===0)?green:gold),x,y+.26,z+dz)}}
    }else if(kind==='hub'){
      box(9,1.2,1,wood,0,.6,-4.5);box(9,.13,1.3,green,0,1.22,-4.5);box(3,1.5,.1,dark,0,2.7,-6.3);box(2.6,1.1,.08,green,0,2.7,-6.2);
    }else if(kind==='hotel'){
      box(8,1.2,1.2,wood,0,.6,-4.6);box(8,.12,1.3,cream,0,1.22,-4.6);box(2.5,.8,1.1,green,-4,.5,1);box(2.5,.8,1.1,green,4,.5,1);box(3,.08,2,red,0,.05,2);
    }else {
      box(3.4,.7,1.4,green,-4,.5,-3);box(3.4,.8,.25,green,-4,1.15,-3.6);box(2.3,.14,1.4,wood,-2,.65,-1);box(3.4,.7,3.5,cream,3,.55,-3.6);box(3.4,.15,1.8,blue,3,1,-2.9);box(1.6,1,.2,dark,0,1.8,-6.2);
    }
  }
  return result;
}
