import * as THREE from 'three';
export const HOME_CENTER = {x:0,z:350};
// A compact interior is kept away from the city and entered through a door
// transition. Its geometry is only visible while the player is at home.
export function createHome(scene) {
  const group=new THREE.Group();group.position.set(HOME_CENTER.x,0,HOME_CENTER.z);scene.add(group);group.visible=false;
  const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.83,...options});
  const wall=mat(0xe4d1b4), floor=mat(0x9a7153), wood=mat(0x5e4232), cream=mat(0xe9e2d5), teal=mat(0x467d77), dark=mat(0x263b3c), brass=mat(0xd7b77d,{metalness:.5});
  function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;group.add(o);return o}
  box(14,.3,13,floor,0,-.15,0);box(14,4.6,.25,wall,0,2.3,-6.5);box(.25,4.6,13,wall,-7,2.3,0);box(.25,4.6,13,wall,7,2.3,0);box(14,4.6,.25,wall,0,2.3,6.5);box(14,.15,13,cream,0,4.6,0);
  box(3,.08,4,teal,0,.03,0); // rug
  box(4.4,.45,5,wood,-3.7,.4,-3.4);box(4.2,.65,4.6,cream,-3.7,.9,-3.35);box(4.2,.25,2.4,teal,-3.7,1.35,-2.25);box(1.5,.25,.9,cream,-4.6,1.4,-4.8);box(1.5,.25,.9,cream,-2.8,1.4,-4.8);
  box(3.1,1.1,1,wood,3.5,.6,-5.8);box(2.4,1.6,.18,dark,3.5,1.85,-6.3);box(1,.06,.5,brass,3.5,1.2,-5.6);
  box(2.8,.8,1.2,teal,4.7,.55,2.8);box(2.8,.9,.3,teal,4.7,1.3,3.25);box(2.2,.1,1.1,wood,3.2,.65,1.1);
  box(2.2,2.8,.12,wood,0,1.4,-6.3);box(1.7,2.5,.12,teal,0,1.5,-6.2);box(.2,.2,.2,brass,.6,1.3,-6.05);
  box(2,1.5,.09,teal,-5.6,2.7,-6.3);box(1.8,1.3,.08,mat(0x8bbfc1),-5.6,2.7,-6.2);
  box(.8,1.2,.8,wood,5.8,.6,-3.9);box(.4,1,.4,mat(0x72905e),5.8,1.7,-3.9);
  return group;
}
