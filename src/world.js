import * as THREE from 'three';

// The city is generated locally; licensed character and vehicle models load separately.
export function createWorld(scene) {
  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({color, roughness: .8, ...options});
  const dark = mat(0x1b242a), pavement = mat(0x89918c), trim = mat(0x2c353b);
  const texLoader=new THREE.TextureLoader();
  function surface(path,repeatX,repeatY){const t=texLoader.load(`${import.meta.env.BASE_URL}assets/textures/${path}`);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=2;return t}
  const roadVertical=mat(0x626966,{map:surface('asphalt_color.jpg',3,50)}),roadHorizontal=mat(0x626966,{map:surface('asphalt_color.jpg',50,3)});
  pavement.map=surface('concrete_color.jpg',3,3);
  const glass = mat(0x668a9b, {metalness:.35, roughness:.25});
  const glow = new THREE.MeshBasicMaterial({color:0xd7f977});
  const red = new THREE.MeshBasicMaterial({color:0xef6e55});
  const blocks = [], buildingMeshes = [], staticBoxes = []; let collectingStatic = true;
  function box(w,h,d,m,x,y,z,parent=scene,shadow=true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z); mesh.castShadow=shadow; mesh.receiveShadow=true; parent.add(mesh); if(collectingStatic&&parent===scene&&!shadow)staticBoxes.push(mesh); return mesh;
  }
  box(390,.4,390,mat(0x6e7970),0,-.3,0,scene,false);
  const markGeometry = new THREE.BoxGeometry(.13,.025,2.2);
  const marks = new THREE.InstancedMesh(markGeometry,mat(0xe7d7a6),7*30*2);
  const helper = new THREE.Object3D(); let markCount=0;
  for(let n=-84;n<=84;n+=28){
    box(13,.06,210,roadVertical,n,.01,0,scene,false);box(210,.06,13,roadHorizontal,0,.02,n,scene,false);
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
  // The map keeps its navigable street grid, but each block has a distinct
  // neighbourhood identity: low homes, commercial corners and a distant CBD.
  const stucco=[mat(0xd7bda0),mat(0xc9b8a0),mat(0xb7c2b1),mat(0xddc3a5),mat(0xb4a99c)];
  const roofs=[mat(0x66504a),mat(0x725a4c),mat(0x5d6259),mat(0x795e4d)];
  const concrete=mat(0xb4a89a), wood=mat(0x7b6854), greenery=mat(0x687b53), windowMat=mat(0x637f84,{metalness:.15,roughness:.3});
  const shops=['MESA MARKET','SUNDOWN AUTO','PALM LIQUOR','SUNSET MOTEL','SILVER DINER','CORNER MART'];
  const billboardImage=texLoader.load(`${import.meta.env.BASE_URL}assets/coast-billboard.jpg`);billboardImage.colorSpace=THREE.SRGBColorSpace;const billboardArt=new THREE.MeshStandardMaterial({map:billboardImage,roughness:.85});
  const signs=shops.map((text,i)=>{const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=['#d6b765','#b95a42','#578075','#c68b55','#e4c8a1','#739093'][i];ctx.fillRect(0,0,512,128);ctx.strokeStyle='#493c34';ctx.lineWidth=8;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#243132';ctx.textAlign='center';ctx.font='bold 46px sans-serif';ctx.fillText(text,256,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.85})});
  const towerFacades=Array.from({length:3},(_,seed)=>{
    const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=['#a99e8e','#a6a9a0','#bfaa91'][seed];ctx.fillRect(0,0,256,512);
    for(let y=16;y<495;y+=44){ctx.fillStyle='#786f65';ctx.fillRect(0,y+31,256,3);for(let x=10;x<256;x+=49){ctx.fillStyle='#556a70';ctx.fillRect(x,y,32,27);ctx.fillStyle='#94a5a4';ctx.fillRect(x+3,y+3,26,21);ctx.fillStyle='#d2c9b9';ctx.fillRect(x+15,y+3,2,21)}}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.9});
  });
  function structure(w,h,d,x,z,material){const mesh=box(w,h,d,material,x,h/2+.25,z);buildingMeshes.push(mesh);blocks.push({x,z,halfX:w/2+.7,halfZ:d/2+.7});return mesh}
  function gableRoof(x,y,z,w,d,material){
    const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,2.1);shape.lineTo(w/2,0);shape.lineTo(-w/2,0);
    const geom=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});const roof=new THREE.Mesh(geom,material);roof.position.set(x,y,z-d/2);roof.castShadow=true;roof.receiveShadow=true;scene.add(roof);
  }
  function house(x,z,seed){
    const w=9.2+(seed%2)*1.2,d=9.8,h=3.6+(seed%2)*.5;structure(w,h,d,x,z,stucco[seed%stucco.length]);gableRoof(x,h+.25,z,w+1,d+1,roofs[seed%roofs.length]);
    // Porch, door and windows face the road and make the scale feel residential.
    box(w*.78,.16,1.35,roofs[seed%roofs.length],x,2.5,z+d/2+.6,scene,false);
    box(.13,2.35,.13,wood,x-w*.34,1.4,z+d/2+1.05,scene,false);box(.13,2.35,.13,wood,x+w*.34,1.4,z+d/2+1.05,scene,false);
    box(1.1,2.15,.12,wood,x,1.34,z+d/2+.08,scene,false);
    for(const side of [-1,1]){box(1.6,1.15,.08,concrete,x+side*w*.31,2,z+d/2+.08,scene,false);box(1.35,.95,.09,windowMat,x+side*w*.31,2,z+d/2+.15,scene,false);box(.06,.95,.1,concrete,x+side*w*.31,2,z+d/2+.21,scene,false)}
    box(2.2,.13,1.4,concrete,x,.26,z+d/2+.75,scene,false);
    for(const side of [-1,1])for(const offset of [-2.7,2.7]){
      box(.09,1.25,1.7,concrete,x+side*(w/2+.06),2,z+offset,scene,false);
      box(.1,1.05,1.45,windowMat,x+side*(w/2+.12),2,z+offset,scene,false);
      box(.12,1.05,.08,concrete,x+side*(w/2+.19),2,z+offset,scene,false);
    }
    // Small lawn patch and a low hedge sit on the private side of the sidewalk.
    box(3,.12,1.3,greenery,x-w*.31,.32,z+d/2+.7,scene,false);
    box(3,.12,1.3,greenery,x+w*.31,.32,z+d/2+.7,scene,false);
  }
  function store(x,z,seed){
    const w=11.8,d=10.8,h=4.4+(seed%2)*.6;structure(w,h,d,x,z,stucco[(seed+2)%stucco.length]);box(w+.45,.35,d+.45,roofs[seed%roofs.length],x,h+.4,z);
    box(w*.88,.26,1.55,roofs[(seed+1)%roofs.length],x,2.85,z+d/2+.65,scene,false);
    box(w*.82,1.05,.12,signs[seed%signs.length],x,3.65,z+d/2+.09,scene,false);
    box(w*.76,2,.08,windowMat,x,1.35,z+d/2+.08,scene,false);box(1.25,2.3,.12,wood,x,1.4,z+d/2+.17,scene,false);
    for(const side of [-1,1]){
      box(.1,2.2,.1,concrete,x+side*w*.36,1.35,z+d/2+.2,scene,false);
      box(.1,1.75,3.6,windowMat,x+side*(w/2+.08),1.55,z,scene,false);
      box(.12,.12,3.8,concrete,x+side*(w/2+.14),2.5,z,scene,false);
    }
    // Rooftop equipment and a small wall-mounted sign add skyline detail.
    box(1.5,.8,1.2,trim,x+2,h+.9,z+1,scene,false);box(1.6,.12,1.3,concrete,x+2,h+1.35,z+1,scene,false);
    if(x===-14&&z===-14){
      box(.2,2,.2,trim,x-3,h+1,z+1,scene,false);box(.2,2,.2,trim,x+3,h+1,z+1,scene,false);
      box(8.4,3.9,.3,trim,x,h+3.1,z+1,scene,false);box(8,3.5,.06,billboardArt,x,h+3.1,z+1.18,scene,false);
    }
  }
  function apartment(x,z,seed){
    const w=10.5,d=10.5,h=11+(seed%4)*4;structure(w,h,d,x,z,towerFacades[seed%towerFacades.length]);box(w+.45,.38,d+.45,trim,x,h+.45,z);
    box(w*.8,.18,1.3,roofs[seed%roofs.length],x,3.2,z+d/2+.55,scene,false);box(1.6,2.3,.1,wood,x,1.4,z+d/2+.08,scene,false);
    box(2,.8,1.5,trim,x+2,h+.9,z,scene,false);
  }
  for(let x=-70;x<=70;x+=28)for(let z=-70;z<=70;z+=28){
    const xi=(x+70)/28,zi=(z+70)/28,seed=(xi*37+zi*53+xi*zi*19)%113;
    box(15,.25,15,pavement,x,.1,z,scene,false);
    if(z>=14&&Math.abs(x)<=70)house(x,z,seed);
    else if(z>=-14||seed%3===0)store(x,z,seed);
    else apartment(x,z,seed);
  }
  // Lamps and small street furniture, clear of the main driving lanes.
  for(let x=-84;x<=84;x+=28)for(let z=-84;z<=84;z+=28){
    if((x+z)%56===0){box(.16,5.5,.16,trim,x+6.6,2.75,z+6.6,scene,false);box(1.4,.12,.16,trim,x+6,5.4,z+6.6,scene,false);box(.55,.12,.4,glow,x+5.4,5.3,z+6.6,scene,false)}
  }
  // Street furniture is placed close to the curb, outside the driving lanes.
  for(let x=-56;x<=56;x+=56)for(let z=-56;z<=56;z+=56){
    box(.18,4.5,.18,trim,x-7,2.25,z-7,scene,false);box(.7,1.5,.45,trim,x-7,4,z-7,scene,false);
    box(.4,.3,.08,red,x-7,4.45,z-6.76,scene,false);box(.4,.3,.08,glow,x-7,3.65,z-6.76,scene,false);
  }
  // Tall curved palms: a warm, recognisable street silhouette without borrowed game art.
  const bark=mat(0x81725a), leaf=mat(0x526c43,{side:THREE.DoubleSide});
  const frondGeom=new THREE.BufferGeometry();
  frondGeom.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.48,.15,1.3,0,.65,1.5,0,0,0,0,.65,1.5,.48,.15,1.3, -.48,.15,1.3,-.32,-.22,2.5,0,-.05,2.65, -.48,.15,1.3,0,-.05,2.65,0,.65,1.5, 0,.65,1.5,0,-.05,2.65,.32,-.22,2.5,0,.65,1.5,.32,-.22,2.5,.48,.15,1.3],3));frondGeom.computeVertexNormals();
  for(let x=-70;x<=70;x+=28)for(let z=-70;z<=70;z+=28){
    const seed=Math.abs(x+z);if(seed%56!==0)continue;
    const tx=x+6.4,tz=z-6.4,height=7+(seed%3);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.14,.35,height,7),bark);trunk.position.set(tx,height/2,tz);trunk.rotation.z=.035;trunk.castShadow=true;scene.add(trunk);
    for(let i=0;i<7;i++){const frond=new THREE.Mesh(frondGeom,leaf);frond.position.set(tx,height,tz);frond.rotation.y=i*Math.PI*2/7;frond.castShadow=true;scene.add(frond)}
  }
  // Sidewalk details remain decorative and leave travel lanes clear.
  const post=mat(0xb75d3e), metalDetail=mat(0x9fafa4), shrub=mat(0x6a8058);
  for(let x=-56;x<=56;x+=56)for(let z=-56;z<=56;z+=56){
    box(.5,.9,.5,post,x+6.8,.45,z+9.4,scene,false);box(.85,.16,.2,post,x+6.8,.8,z+9.4,scene,false);
    box(1.5,.45,1.1,concrete,x-7.6,.25,z+10,scene,false);box(1.35,.55,.95,shrub,x-7.6,.72,z+10,scene,false);
    box(.14,3,.14,metalDetail,x+7,1.5,z-8,scene,false);box(1.7,.6,.1,signs[(Math.abs(x)+Math.abs(z))%shops.length],x+7,2.8,z-8,scene,false);
  }
  // Utility poles and overhead cables add depth along the residential streets.
  const cable=mat(0x403c36);for(let z=-56;z<=56;z+=28){box(.16,7,.16,wood,-6.8,3.5,z,scene,false);box(1.4,.14,.14,wood,-6.8,6.7,z,scene,false);if(z<56)box(.05,.05,28,cable,-6.8,6.7,z+14,scene,false)}
  // Distant silhouettes frame the horizon without affecting navigation.
  const skyline=mat(0x667b81);for(let i=0;i<32;i++){const a=i/32*Math.PI*2,dist=145,h=18+(i*19%38);box(13,h,13,skyline,Math.sin(a)*dist,h/2,Math.cos(a)*dist,scene,false)}
  // Batch decorative static boxes by material and 56m cell, retaining frustum
  // culling and leaving collision/raycast building meshes untouched.
  collectingStatic=false;
  const batches=new Map();
  for(const mesh of staticBoxes){
    const key=`${mesh.material.uuid}:${Math.floor(mesh.position.x/56)}:${Math.floor(mesh.position.z/56)}`;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  const unitBox=new THREE.BoxGeometry(1,1,1),instanceHelper=new THREE.Object3D();
  for(const meshes of batches.values()){
    if(meshes.length<2)continue;
    const instances=new THREE.InstancedMesh(unitBox,meshes[0].material,meshes.length);instances.receiveShadow=true;
    meshes.forEach((mesh,i)=>{const {width,height,depth}=mesh.geometry.parameters;instanceHelper.position.copy(mesh.position);instanceHelper.scale.set(width,height,depth);instanceHelper.updateMatrix();instances.setMatrixAt(i,instanceHelper.matrix);scene.remove(mesh);mesh.geometry.dispose()});
    instances.computeBoundingSphere();scene.add(instances);
  }
  staticBoxes.length=0;batches.clear();
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
