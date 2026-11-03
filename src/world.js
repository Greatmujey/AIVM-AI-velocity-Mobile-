import * as THREE from 'three';

// All city art is generated locally so the prototype does not need external assets.
export function createWorld(scene) {
  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...options});
  const dark = mat(0x1b242a), road = mat(0x3a4145), pavement = mat(0x68716f), trim = mat(0x2c353b);
  const glass = mat(0x668a9b, {metalness:.35, roughness:.25});
  const glow = new THREE.MeshBasicMaterial({color:0xd7f977});
  const red = new THREE.MeshBasicMaterial({color:0xef6e55});
  const blocks = [], buildingMeshes = [];
  function box(w,h,d,m,x,y,z,parent=scene,shadow=true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z); mesh.castShadow=shadow; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  box(390,.4,390,mat(0x6e7970),0,-.3,0,scene,false);
  const markGeometry = new THREE.BoxGeometry(.13,.025,2.2);
  const marks = new THREE.InstancedMesh(markGeometry,mat(0xe7d7a6),7*30*2);
  const helper = new THREE.Object3D(); let markCount=0;
  for(let n=-84;n<=84;n+=28){
    box(13,.06,210,road,n,.01,0,scene,false);box(210,.06,13,road,0,.02,n,scene,false);
    for(let p=-98;p<=98;p+=7){helper.position.set(n,.07,p);helper.rotation.y=0;helper.updateMatrix();marks.setMatrixAt(markCount++,helper.matrix);helper.position.set(p,.08,n);helper.rotation.y=Math.PI/2;helper.updateMatrix();marks.setMatrixAt(markCount++,helper.matrix)}
  }
  marks.count=markCount;marks.receiveShadow=true;scene.add(marks);
  // Zebra crossings at every junction, drawn in one instanced mesh for mobile.
  const crossing = new THREE.InstancedMesh(new THREE.BoxGeometry(1,.025,.48),mat(0xd4d3bc),7*7*4*6);let crossCount=0;
  for(let x=-84;x<=84;x+=28)for(let z=-84;z<=84;z+=28)for(let j=0;j<6;j++){
    for(const side of [-1,1]){
      helper.rotation.y=0;helper.position.set(x-4.2+j*1.65,.11,z+side*8.2);helper.updateMatrix();crossing.setMatrixAt(crossCount++,helper.matrix);
      helper.rotation.y=Math.PI/2;helper.position.set(x+side*8.2,.11,z-4.2+j*1.65);helper.updateMatrix();crossing.setMatrixAt(crossCount++,helper.matrix);
    }
  }crossing.count=crossCount;scene.add(crossing);
  function facade(seed) {
    const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');
    const palettes=[['#606c70','#a3bbc0'],['#8f8980','#b9c9c4'],['#596b73','#9db5bc'],['#797d79','#c1c7bd'],['#746d67','#b0bdc2']];
    const [wall,window]=palettes[seed%palettes.length];ctx.fillStyle=wall;ctx.fillRect(0,0,256,512);
    for(let y=14;y<495;y+=38){ctx.fillStyle='rgba(17,27,32,.18)';ctx.fillRect(0,y+27,256,3);for(let x=11;x<256;x+=48){ctx.fillStyle='#334650';ctx.fillRect(x,y,32,23);ctx.fillStyle=(x+y+seed*17)%7===0?'#efdca8':window;ctx.globalAlpha=.75;ctx.fillRect(x+3,y+3,26,17);ctx.globalAlpha=1;ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x+5,y+3,3,17)}}
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;return new THREE.MeshStandardMaterial({map:texture,roughness:.95});
  }
  const facades=Array.from({length:5},(_,i)=>facade(i));
  for(let x=-70;x<=70;x+=28)for(let z=-70;z<=70;z+=28){
    box(15,.25,15,pavement,x,.1,z,scene,false);
    const seed=Math.abs((x*3+z*7)/14)|0, h=8+Math.abs(x*7+z*13)%19,w=10+(seed%3),d=10+((seed+1)%3);
    const mesh=box(w,h,d,facades[seed%5],x,h/2+.25,z);buildingMeshes.push(mesh);blocks.push({x,z,halfX:w/2+.7,halfZ:d/2+.7});
    box(w+.5,.35,d+.5,trim,x,h+.43,z);box(3,.8,2,trim,x+1,h+1,z,scene,false);
    // Shop awnings and illuminated signs break up the street-level skyline.
    const awning=mat([0xcd6a50,0x5c938c,0xd0a16b][seed%3]);
    box(w*.65,.18,1.2,awning,x,3,z+d/2+.55,scene,false);
    box(w*.55,.75,.12,trim,x,3.65,z+d/2+.08,scene,false);
    box(w*.43,.1,.14,seed%2?glow:red,x,3.65,z+d/2+.17,scene,false);
  }
  // Lamps and small street furniture, clear of the main driving lanes.
  for(let x=-84;x<=84;x+=28)for(let z=-84;z<=84;z+=28){
    if((x+z)%56===0){box(.16,5.5,.16,trim,x+6.6,2.75,z+6.6,scene,false);box(1.4,.12,.16,trim,x+6,5.4,z+6.6,scene,false);box(.55,.12,.4,glow,x+5.4,5.3,z+6.6,scene,false)}
  }
  // Palm trees give the district a warmer, lived-in street-level silhouette.
  const bark=mat(0x665647), leaf=mat(0x405e4c), treeGeometry=new THREE.ConeGeometry(1.8,4.8,5);
  for(let x=-70;x<=70;x+=28)for(let z=-70;z<=70;z+=28){
    const seed=Math.abs(x+z);if(seed%56!==0)continue;
    const tx=x+6.4,tz=z-6.4;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.3,4.7,6),bark);trunk.position.set(tx,2.35,tz);trunk.castShadow=true;scene.add(trunk);
    for(let i=0;i<5;i++){const frond=new THREE.Mesh(treeGeometry,leaf);const a=i*Math.PI*2/5;frond.position.set(tx+Math.sin(a)*.8,4.6,tz+Math.cos(a)*.8);frond.rotation.set(.8*Math.cos(a),0,-.8*Math.sin(a));frond.castShadow=true;scene.add(frond)}
  }
  // Distant silhouettes frame the horizon without affecting navigation.
  const skyline=mat(0x667b81);for(let i=0;i<32;i++){const a=i/32*Math.PI*2,dist=145,h=18+(i*19%38);box(13,h,13,skyline,Math.sin(a)*dist,h/2,Math.cos(a)*dist,scene,false)}
  function person(color) {
    const g=new THREE.Group(), jacket=mat(color), pants=mat(0x202e35), skin=mat(0xa97e65), vest=mat(0x253139);
    const torso=box(1.15,1.4,.58,jacket,0,1.8,0,g);
    box(1.05,.95,.15,vest,0,1.78,-.36,g);box(1,.9,.13,vest,0,1.8,.34,g);box(.45,.15,.16,mat(0xc5d85c),0,2.08,-.45,g);box(.5,.6,.22,mat(0x374238),0,1.75,.43,g);box(1.16,.2,.7,vest,0,1.22,0,g);
    box(.62,.68,.61,skin,0,2.87,0,g);box(.68,.22,.67,vest,0,3.2,0,g);box(.72,.08,.8,vest,0,3.07,-.05,g);
    const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();leftLeg.position.set(-.3,1.1,0);rightLeg.position.set(.3,1.1,0);g.add(leftLeg,rightLeg);
    box(.46,1.05,.52,pants,0,-.52,0,leftLeg);box(.5,.22,.75,dark,0,-1.05,-.1,leftLeg);
    box(.46,1.05,.52,pants,0,-.52,0,rightLeg);box(.5,.22,.75,dark,0,-1.05,-.1,rightLeg);
    const leftArm=new THREE.Group(),rightArm=new THREE.Group();leftArm.position.set(-.72,2.25,0);rightArm.position.set(.72,2.25,0);g.add(leftArm,rightArm);
    box(.35,.95,.38,jacket,0,-.4,0,leftArm);box(.35,.95,.38,jacket,0,-.4,0,rightArm);
    box(.23,.25,1.15,dark,0,-.55,-.6,rightArm);box(.15,.3,.2,dark,0,-.7,-.35,rightArm);
    g.userData={torso,leftLeg,rightLeg,leftArm,rightArm};return g;
  }
  function vehicle(type,x,z){
    const g=new THREE.Group(), bike=type==='bike',body=mat(bike?0xc2e34e:0xc55e47,{metalness:.3,roughness:.38}),rubber=mat(0x11191d),metal=mat(0x7c8d91,{metalness:.75,roughness:.3}),wheels=[];
    function wheel(px,pz,r,width){const group=new THREE.Group();group.position.set(px,r,pz);const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width,16),rubber);t.rotation.z=Math.PI/2;group.add(t);const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,width+.02,12),metal);hub.rotation.z=Math.PI/2;group.add(hub);g.add(group);wheels.push(group)}
    if(bike){wheel(0,-1.25,.55,.38);wheel(0,1.25,.55,.38);box(.65,.55,2,body,0,1.05,0,g);box(.56,.3,.85,dark,0,1.48,.35,g);box(.18,.75,.18,metal,0,1.45,-.9,g);box(1,.12,.12,metal,0,1.78,-.9,g);box(.5,.25,.16,glow,0,1.25,-1.1,g);box(.4,.15,.15,red,0,1.1,1.18,g)}
    else {for(const sx of [-1,1])for(const sz of [-1.5,1.5])wheel(sx*1.4,sz,.52,.4);box(2.8,.75,4.8,body,0,1,0,g);box(2.45,.8,2.35,glass,0,1.73,.15,g);box(2.5,.16,2.4,body,0,2.18,.15,g);for(const sx of [-1,1]){box(.09,.8,2.3,metal,sx*1.2,1.73,.15,g);box(.1,.1,.55,dark,sx*1.43,1.24,.65,g)}box(2.6,.22,.15,dark,0,.7,-2.46,g);for(const x of [-.9,.9]){box(.5,.22,.1,glow,x,1.12,-2.43,g);box(.55,.2,.1,red,x,1.12,2.43,g)}box(2.5,.13,.12,metal,0,.85,2.46,g)}
    g.position.set(x,0,z);scene.add(g);return {type,mesh:g,wheels};
  }
  return {mat,box,blocks,buildingMeshes,person,vehicle};
}
