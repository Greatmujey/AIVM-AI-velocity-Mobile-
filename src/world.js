import * as THREE from 'three';
import { LANDMARKS, ROAD_LIMIT, districtAt } from './city-data.js';
import { addDistrictDecor } from './district-decor.js';

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
  const blocks = [], buildingMeshes = [], staticBoxes = [], obstacles = []; let collectingStatic = true;
  function box(w,h,d,m,x,y,z,parent=scene,shadow=true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z); mesh.castShadow=shadow; mesh.receiveShadow=true; parent.add(mesh); if(collectingStatic&&parent===scene&&!shadow)staticBoxes.push(mesh); return mesh;
  }
  box(390,.4,390,mat(0x6e7970),0,-.3,0,scene,false);
  addDistrictDecor(scene);
  // Coloured district ground remains below the road surfaces; roads stay
  // connected and drivable rather than swapping only the menu backgrounds.
  const districtGround={village:mat(0x8f9e70),harbor:mat(0x7d8981),hills:mat(0x748b6a),desert:mat(0xbca080),downtown:mat(0x7e868a),market:mat(0x9b8b6c)};
  for(const [kind,x,z] of [['village',106,78],['harbor',-106,-78],['hills',106,-78],['desert',-106,78]])box(100,.08,156,districtGround[kind],x,-.045,z,scene,false);
  // The harbor shoreline is outside the playable streets, so it is visual
  // context rather than an unsupported swimming area.
  const water=mat(0x568c94,{metalness:.1,roughness:.28});box(32,.04,156,water,-179,-.025,-78,scene,false);
  const markGeometry = new THREE.BoxGeometry(.13,.025,2.2);
  const marks = new THREE.InstancedMesh(markGeometry,mat(0xe7d7a6),11*46*2);
  const helper = new THREE.Object3D(); let markCount=0;
  for(let n=-ROAD_LIMIT;n<=ROAD_LIMIT;n+=28){
    box(13,.06,322,roadVertical,n,.01,0,scene,false);box(322,.06,13,roadHorizontal,0,.02,n,scene,false);
    for(let p=-154;p<=154;p+=7){helper.position.set(n,.07,p);helper.rotation.y=0;helper.updateMatrix();marks.setMatrixAt(markCount++,helper.matrix);helper.position.set(p,.08,n);helper.rotation.y=Math.PI/2;helper.updateMatrix();marks.setMatrixAt(markCount++,helper.matrix)}
  }
  marks.count=markCount;marks.receiveShadow=true;scene.add(marks);
  // The village and desert use unpaved roads, so the districts differ on the
  // ground as well as in their buildings. The collision/router grid is unchanged.
  const sandCanvas=document.createElement('canvas');sandCanvas.width=sandCanvas.height=128;const sandCtx=sandCanvas.getContext('2d');sandCtx.fillStyle='#ded5c3';sandCtx.fillRect(0,0,128,128);let sandSeed=5947;for(let i=0;i<4500;i++){sandSeed=(sandSeed*1664525+1013904223)>>>0;const x=sandSeed%128;sandSeed=(sandSeed*1664525+1013904223)>>>0;const y=sandSeed%128;sandCtx.fillStyle=i%2?'#bdb39a55':'#f9f0da55';sandCtx.fillRect(x,y,1,1)}const sandTex=new THREE.CanvasTexture(sandCanvas);sandTex.colorSpace=THREE.SRGBColorSpace;sandTex.wrapS=sandTex.wrapT=THREE.RepeatWrapping;sandTex.repeat.set(8,16);
  const villageDirt=mat(0xb6ac88,{map:sandTex}),desertDirt=mat(0xb89470,{map:sandTex});
  for(const [side,roadMat] of [[1,villageDirt],[-1,desertDirt]]){
    for(const x of [84,112,140])box(13,.07,156,roadMat,x*side,.06,78,scene,false);
    for(const z of [28,56,84,112,140])box(100,.07,13,roadMat,106*side,.061,z,scene,false);
  }
  // Zebra crossings at every junction, drawn in one instanced mesh for mobile.
  const crossing = new THREE.InstancedMesh(new THREE.BoxGeometry(1,.025,.48),mat(0xd4d3bc),11*11*4*6);let crossCount=0;
  for(let x=-ROAD_LIMIT;x<=ROAD_LIMIT;x+=28)for(let z=-ROAD_LIMIT;z<=ROAD_LIMIT;z+=28)for(let j=0;j<6;j++){
    if(Math.abs(x)>56&&z>0)continue;
    for(const side of [-1,1]){
      helper.rotation.y=0;helper.position.set(x-4.2+j*1.65,.11,z+side*8.2);helper.updateMatrix();crossing.setMatrixAt(crossCount++,helper.matrix);
      helper.rotation.y=Math.PI/2;helper.position.set(x+side*8.2,.11,z-4.2+j*1.65);helper.updateMatrix();crossing.setMatrixAt(crossCount++,helper.matrix);
    }
  }crossing.count=crossCount;scene.add(crossing);
  // The map keeps its navigable street grid, but each block has a distinct
  // neighbourhood identity: low homes, commercial corners and a distant CBD.
  // Subtle reusable, locally generated surface detail instead of flat block colours.
  function detailTexture(kind) {
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle=kind==='wall'?'#dedbd2':'#aaa49b';ctx.fillRect(0,0,256,256);
    let seed=kind==='wall'?973:683;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    for(let i=0;i<3400;i++){const x=rand()*256,y=rand()*256,v=rand()>.5?255:30;ctx.fillStyle=`rgba(${v},${v},${v},${rand()*.095})`;ctx.fillRect(x,y,1+rand()*3,1+rand()*3)}
    if(kind==='roof'){ctx.strokeStyle='#4e474044';ctx.lineWidth=1;for(let y=0;y<256;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(y/22%2)*16;x<256;x+=32){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+22);ctx.stroke()}}}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
  }
  const wallDetail=detailTexture('wall'),roofDetail=detailTexture('roof');
  const stucco=[mat(0xd7bda0,{map:wallDetail}),mat(0xc9b8a0,{map:wallDetail}),mat(0xb7c2b1,{map:wallDetail}),mat(0xddc3a5,{map:wallDetail}),mat(0xb4a99c,{map:wallDetail})];
  const roofs=[mat(0x66504a,{map:roofDetail}),mat(0x725a4c,{map:roofDetail}),mat(0x5d6259,{map:roofDetail}),mat(0x795e4d,{map:roofDetail})];
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
  const awningStripes=[mat(0xd5aa87),mat(0xe7d5a9)];
  function store(x,z,seed){
    const w=11.8,d=10.8,h=4.4+(seed%2)*.6;structure(w,h,d,x,z,stucco[(seed+2)%stucco.length]);box(w+.45,.35,d+.45,roofs[seed%roofs.length],x,h+.4,z);
    box(w*.88,.26,1.55,roofs[(seed+1)%roofs.length],x,2.85,z+d/2+.65,scene,false);
    box(w*.82,1.05,.12,signs[Math.abs((seed+Math.round(x/14)*3+Math.round(z/14)*5)%signs.length)],x,3.65,z+d/2+.09,scene,false);
    box(w*.76,2,.08,windowMat,x,1.35,z+d/2+.08,scene,false);box(1.25,2.3,.12,wood,x,1.4,z+d/2+.17,scene,false);
    // Individual panes and alternating awning strips break up the plain frontage.
    for(const side of [-1,1]){box(.08,1.9,.1,concrete,x+side*w*.2,1.35,z+d/2+.16,scene,false);box(w*.29,.07,.1,concrete,x+side*w*.21,1.5,z+d/2+.16,scene,false)}
    const stripe=awningStripes[seed%2];for(let j=0;j<6;j++)box(w*.073,.28,1.55,stripe,x-w*.37+j*w*.148,2.86,z+d/2+.66,scene,false);
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
  // A small downtown cluster: glazed facades and strong horizontal floor lines.
  // Decorations remain batched and collision stays on the building footprint.
  const modernGlass=mat(0x617f88,{metalness:.38,roughness:.3}),modernTrim=mat(0xc4cbc7),modernBase=mat(0x343f41);
  function modernTower(x,z,seed){
    const h=20+(seed%4)*4;structure(11,h,10.5,x,z,modernGlass);
    box(11.4,3,10.9,modernBase,x,1.75,z,scene,false);
    box(1.8,2.5,.12,glass,x,1.5,z+5.5,scene,false);
    for(let y=4.5;y<h;y+=3){box(11.2,.18,.14,modernTrim,x,y,z+5.32,scene,false);box(.14,.18,10.8,modernTrim,x+5.6,y,z,scene,false);box(.14,.18,10.8,modernTrim,x-5.6,y,z,scene,false)}
    for(const dx of [-3.6,0,3.6])box(.13,h-3,.13,modernTrim,x+dx,(h+3)/2,z+5.34,scene,false);
    box(11.6,.45,11,modernTrim,x,h+.45,z,scene,false);
  }
  // District landmarks and neighbourhood architecture share the same
  // collision footprints as other structures; decorative detail stays in lots.
  const villageWalls=[mat(0xe6c99a),mat(0xd9a478),mat(0xbabf99)],thatch=mat(0x9a774c), corrugated=mat(0x687e7c),
    containerMats=[mat(0xb65e44),mat(0x557a83),mat(0xb8a15b)], sandWalls=[mat(0xd8a374),mat(0xc48f6b)], rock=mat(0x848b76);
  const roofCone=new THREE.ConeGeometry(6.4,2.7,10);
  function villageHome(x,z,seed){
    structure(9,3.8,9,x,z,villageWalls[seed%villageWalls.length]);
    const roof=new THREE.Mesh(roofCone,thatch);roof.position.set(x,5.1,z);roof.rotation.y=Math.PI/4;roof.receiveShadow=true;scene.add(roof);
    box(1.2,2.2,.12,wood,x,1.35,z+4.56,scene,false);for(const side of [-1,1])box(1.5,1,.1,windowMat,x+side*2.7,2.1,z+4.57,scene,false);
    box(2.3,.15,1.1,concrete,x,.25,z+5,scene,false);box(1.5,.45,1.2,greenery,x+5.3,.35,z+4.9,scene,false);
  }
  function harborWarehouse(x,z,seed){
    structure(11,5.6,10.5,x,z,containerMats[seed%containerMats.length]);box(11.6,.28,11,corrugated,x,6.05,z,scene,false);
    box(3,3.2,.12,trim,x,1.9,z+5.35,scene,false);for(const side of [-1,1]){box(1.8,1.2,.12,windowMat,x+side*3.3,3.2,z+5.35,scene,false);}
    for(let i=-2;i<=2;i++)box(.08,4.9,.1,concrete,x+i*2,3.05,z+5.42,scene,false);
    // Stacked cargo and small gantries make the dock silhouette unmistakable.
    box(4,1.7,2.4,containerMats[(seed+1)%3],x-2.3,6.95,z,scene,false);box(3.6,1.6,2.2,containerMats[(seed+2)%3],x+2.2,6.9,z-1,scene,false);
    if(seed%3===0){for(const side of [-1,1])box(.3,7,.3,trim,x+side*4.6,9.4,z-3.5,scene,false);box(10,.3,.3,trim,x,12.9,z-3.5,scene,false);}
  }
  function hillsideHome(x,z,seed){
    structure(9.5,4.2,9.5,x,z,villageWalls[(seed+1)%3]);gableRoof(x,4.5,z,10.6,10.4,roofs[2]);
    box(1.2,2.2,.12,wood,x,1.35,z+4.85,scene,false);for(const side of [-1,1])box(1.6,1,.1,windowMat,x+side*2.9,2.1,z+4.85,scene,false);
  }
  function desertHome(x,z,seed){
    structure(10,3.8,9,x,z,sandWalls[seed%2]);box(10.5,.35,9.5,sandWalls[(seed+1)%2],x,4.2,z,scene,false);
    box(1.4,2.2,.12,wood,x,1.35,z+4.58,scene,false);for(const side of [-1,1])box(1.4,1.1,.12,windowMat,x+side*3,2.1,z+4.58,scene,false);
    box(1.8,.3,1.8,rock,x-5.2,.3,z-4.8,scene,false);
  }
  // Distant ridges frame the outskirts but are not climbable gameplay terrain.
  const mountainGeometry=new THREE.SphereGeometry(1,10,7);
  for(let i=0;i<5;i++)for(const [x,z,m] of [[185,-125+i*27,rock],[-185,25+i*27,sandWalls[0]]]){const peak=new THREE.Mesh(mountainGeometry,m);peak.position.set(x,-1,z);peak.scale.set(22,13+(i%3)*2,19);scene.add(peak)}
  // Harbor gantries stand at the shoreline, clear of the playable road.
  const cranePaint=mat(0xc48a4c);for(const z of [-126,-70,-14]){for(const side of [-1,1])box(.65,17,.65,cranePaint,-159,8.5,z+side*5,scene,false);box(.8,.7,12,cranePaint,-159,17,z,scene,false);box(9,.6,.6,cranePaint,-163,17,z,scene,false);box(.1,8,.1,trim,-166,13,z,scene,false);}

  // --- A busier, more varied city ---
  // Each district now has several house and commercial types, so streets do not
  // repeat one box. Footprints stay solid (structure) and detail stays in lots.
  const tinRoof=mat(0x6f7c7a), rail=mat(0x9aa6a2), acUnit=mat(0xb9bfbb), tankBlue=mat(0x4f7f9c), generatorGreen=mat(0x6d8a5c),
    umbrellaRed=mat(0xc2564a), umbrellaBlue=mat(0x4a7fa8), canvasCloth=mat(0xe9e2d0), mudBrick=mat(0xb98a63),
    tentCloth=mat(0xd9c9a6), stoneGrey=mat(0x9a9c93), laundryWhite=mat(0xefe6d2), sack=mat(0xc0a274), crateWood=mat(0xa8835a);
  function townhouse(x,z,seed){
    const w=7.6,d=9.6,h=8.4+(seed%3)*1.7;structure(w,h,d,x,z,stucco[(seed+1)%stucco.length]);box(w+.4,.3,d+.4,tinRoof,x,h+.35,z,scene,false);
    box(1.2,2.2,.12,wood,x-w*.22,1.35,z+d/2+.07,scene,false);box(2.4,.14,1.2,concrete,x-w*.22,.3,z+d/2+.6,scene,false);
    for(let y=4.2;y<h-1;y+=3.4){box(w*.84,.1,1,concrete,x,y,z+d/2+.5,scene,false);for(let i=-2;i<=2;i++)box(.07,.9,.07,rail,x+i*w*.18,y+.5,z+d/2+.95,scene,false);box(w*.84,.07,.07,rail,x,y+.95,z+d/2+.95,scene,false)}
    for(let y=2.4;y<h-1;y+=3.4)for(const side of [-1,1])box(1.1,1.4,.09,windowMat,x+side*w*.28,y,z+d/2+.06,scene,false);
    if(seed%2===0){box(.9,.7,.7,acUnit,x+w*.3,3.5,z+d/2+.45,scene,false);box(.5,.4,.5,tankBlue,x-w*.34,h+.7,z-2,scene,false)}
  }
  function bungalow(x,z,seed){
    const w=10.4,d=9,h=3.4;structure(w,h,d,x,z,stucco[(seed+3)%stucco.length]);gableRoof(x,h+.25,z,w+1.2,d+1.2,roofs[(seed+1)%roofs.length]);
    box(1.15,2.1,.12,wood,x,1.3,z+d/2+.08,scene,false);for(const side of [-1,1])box(1.5,1.05,.09,windowMat,x+side*w*.3,1.9,z+d/2+.07,scene,false);
    box(2.4,.12,1.3,concrete,x,.24,z+d/2+.7,scene,false);
    for(const side of [-1,1])for(let i=-2;i<=2;i++)box(.09,1,.09,wood,x+side*(w/2+.5),.6,z+i*1.9,scene,false);
    for(const side of [-1,1])box(.07,.09,d+1.4,wood,x+side*(w/2+.5),1.05,z,scene,false);
    box(3.2,.1,1.6,greenery,x+w*.2,.3,z+d/2+1.2,scene,false);
    if(seed%3===0){box(1.1,.9,.9,generatorGreen,x+w/2+1.5,.55,z-d*.2,scene,false);box(.16,1.5,.16,tankBlue,x+w/2+1.5,1.6,z-d*.2,scene,false)}
    if(seed%3===1){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,1.5,10),tankBlue);tank.position.set(x-w/2-1.4,2.6,z+d*.2);tank.castShadow=true;scene.add(tank);for(const sx of [-1,1])box(.12,1.9,.12,trim,x-w/2-1.4+sx*.5,.95,z+d*.2,scene,false)}
  }
  function tenementWalkup(x,z,seed){
    const w=10.8,d=10.2,h=13+(seed%3)*3.6;structure(w,h,d,x,z,stucco[(seed+2)%stucco.length]);box(w+.5,.35,d+.5,tinRoof,x,h+.4,z,scene,false);
    box(1.5,2.4,.12,wood,x-w*.24,1.45,z+d/2+.08,scene,false);box(2.8,.16,1.5,concrete,x-w*.24,.32,z+d/2+.75,scene,false);
    for(let y=4.6;y<h-1;y+=3.2){box(w*.36,.1,1.5,rail,x+w*.28,y,z+d/2+.75,scene,false);for(let i=0;i<4;i++)box(.07,.95,.07,rail,x+w*.13+i*w*.1,y+.52,z+d/2+1.45,scene,false);box(.1,.1,1.5,rail,x+w*.11,y+1,z+d/2+.75,scene,false)}
    for(let y=2.8;y<h-1;y+=3.2)for(const side of [-1,1])box(1.25,1.5,.09,windowMat,x+side*w*.3,y,z+d/2+.06,scene,false);
    for(const side of [-1,1]){box(.1,1.8,3.4,windowMat,x+side*(w/2+.07),3.2,z-1,scene,false);box(.9,.7,.7,acUnit,x+side*(w/2+.5),5.4,z+2.4,scene,false)}
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,1.7,10),tankBlue);tank.position.set(x-w*.2,h+1.1,z-2.4);tank.castShadow=true;scene.add(tank);
    if(seed%2===0)for(let i=0;i<3;i++)box(2.6,.05,.9,laundryWhite,x-w*.3+i*2.8,h-1.4,z+d/2+.9,scene,false);
  }
  function terracedShop(x,z,seed){
    const w=11.4,d=10.4,h=7.6+(seed%2)*2.4;structure(w,h,d,x,z,stucco[seed%stucco.length]);box(w+.5,.32,d+.5,tinRoof,x,h+.38,z,scene,false);
    box(w*.86,2.1,.09,windowMat,x,1.4,z+d/2+.07,scene,false);box(1.3,2.3,.12,wood,x+w*.28,1.4,z+d/2+.14,scene,false);
    box(w*.9,.24,1.5,roofs[seed%roofs.length],x,2.9,z+d/2+.7,scene,false);
    const stripe=awningStripes[seed%2];for(let j=0;j<7;j++)box(w*.075,.26,1.5,stripe,x-w*.4+j*w*.133,2.92,z+d/2+.7,scene,false);
    box(w*.8,1,.1,signs[Math.abs(seed*3+Math.round(x/14))%signs.length],x,3.75,z+d/2+.1,scene,false);
    for(let y=5;y<h-1;y+=2.8)for(const side of [-1,1])box(1.3,1.3,.09,windowMat,x+side*w*.3,y,z+d/2+.06,scene,false);
    box(1.4,.9,1.4,crateWood,x-w/2-1.3,.5,z+d/2-.6,scene,false);box(1.1,.7,1.1,sack,x+w/2+1.2,.45,z+d/2-.4,scene,false);
  }
  function marketRow(x,z,seed){
    structure(9.4,3.6,9,x,z,stucco[(seed+4)%stucco.length]);box(10,.3,9.6,tinRoof,x,3.85,z,scene,false);
    for(const dz of [-3,0,3]){box(8,.14,1.7,canvasCloth,x,3.1,z+dz,scene,false);box(.1,2.9,.1,wood,x-3.9,1.5,z+dz,scene,false);box(.1,2.9,.1,wood,x+3.9,1.5,z+dz,scene,false)}
    for(const dz of [-3,0,3])for(let i=-3;i<=3;i++)box(.75,.55,.6,[umbrellaRed,umbrellaBlue,crateWood,sack][(i+dz+9)%4],x+i*1.2,.6,z+dz,scene,false);
    box(1.6,2.2,.12,wood,x-2.6,1.35,z+4.56,scene,false);box(2.2,1.3,.1,windowMat,x+2.4,2,z+4.56,scene,false);
    for(const side of [-1,1])box(.1,3.4,.1,trim,x+side*4.6,1.7,z+4.4,scene,false);
    box(9.6,.1,1.6,awningStripes[(seed+1)%2],x,3.5,z+5.1,scene,false);
  }
  function kiosk(x,z,seed){
    structure(5.4,3.2,5.4,x,z,stucco[(seed+1)%stucco.length]);box(6,.28,6,tinRoof,x,3.4,z,scene,false);
    box(3,.1,1.2,wood,x,1.3,z+2.8,scene,false);box(2.6,1.1,.08,signs[seed%signs.length],x,2.5,z+2.72,scene,false);
    box(1.6,1.5,.1,wood,x-1.6,1,z+2.72,scene,false);
    for(const side of [-1,1])box(.12,3,.12,trim,x+side*3.1,1.5,z+2.9,scene,false);
    box(2.2,.16,2.4,awningStripes[seed%2],x,3.1,z+3.4,scene,false);
    box(1,.9,1,sack,x+3.6,.5,z+1.6,scene,false);box(.9,.7,.9,crateWood,x-3.5,.4,z+1.9,scene,false);
  }
  function officeSlab(x,z,seed){
    const w=13.4,d=11.6,h=15+(seed%3)*4;structure(w,h,d,x,z,modernGlass);box(w+.6,.4,d+.6,modernTrim,x,h+.45,z,scene,false);
    box(w,3.4,d,modernBase,x,1.7,z,scene,false);box(4.6,3,.14,glass,x,1.6,z+d/2+.06,scene,false);
    box(6,.3,2.4,modernTrim,x,3.5,z+d/2+1.1,scene,false);for(const side of [-1,1])box(.24,3.4,.24,modernTrim,x+side*2.9,1.7,z+d/2+2.1,scene,false);
    for(let y=5;y<h;y+=3.1){box(w+.2,.16,.14,modernTrim,x,y,z+d/2+.06,scene,false);box(.14,.16,d+.2,modernTrim,x+w/2+.06,y,z,scene,false);box(.14,.16,d+.2,modernTrim,x-w/2-.06,y,z,scene,false)}
    box(2.4,1.4,2,trim,x+w*.2,h+1.2,z-2,scene,false);box(1.8,.16,1.5,modernTrim,x+w*.2,h+1.98,z-2,scene,false);
  }
  function glassTower(x,z,seed){
    const h=26+(seed%4)*6,r=4.6;
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.5,h,10),modernGlass);tower.position.set(x,h/2+.25,z);tower.castShadow=true;tower.receiveShadow=true;scene.add(tower);
    buildingMeshes.push(tower);blocks.push({x,z,halfX:r+.7,halfZ:r+.7});
    for(let y=4;y<h;y+=3.4){const ring=new THREE.Mesh(new THREE.CylinderGeometry(r+.16,r+.16,.22,10),modernTrim);ring.position.set(x,y,z);scene.add(ring)}
    box(3.2,3,.16,glass,x,1.6,z+r+.06,scene,false);box(r*2.4,.34,r*2.4,modernTrim,x,h+.4,z,scene,false);
    box(.4,4,.4,trim,x,h+2.4,z,scene,false);box(.7,.16,.7,red,x,h+4.5,z,scene,false);
  }
  function parkingStructure(x,z,seed){
    const w=13,d=11.4,h=9.6;structure(w,h,d,x,z,concrete);box(w+.4,.3,d+.4,trim,x,h+.3,z,scene,false);
    for(let y=3;y<h;y+=3){box(w+.2,.18,.16,rail,x,y,z+d/2+.08,scene,false);for(let i=-3;i<=3;i++)box(.1,1.5,.1,rail,x+i*1.8,y+.8,z+d/2+.1,scene,false)}
    for(const [dx,dz,tint] of [[-3.6,3.4,0x9db9c8],[3.6,3.4,0xe0b4a3],[-3.6,-3.4,0xf0c36e],[3.6,-3.4,0x9fcab0]]){box(2.2,.6,4,mat(tint),x+dx,3.6,z+dz,scene,false);box(1.9,.55,2.1,glass,x+dx,4.15,z+dz+.2,scene,false)}
    box(3.4,2.6,.14,dark,x-3.4,1.5,z+d/2+.08,scene,false);box(3,2.2,.1,signs[(seed+2)%signs.length],x+3.4,2.4,z+d/2+.1,scene,false);
  }
  function stiltHut(x,z,seed){
    structure(8.4,3.2,8.4,x,z+1.4,villageWalls[seed%villageWalls.length]);
    const roof=new THREE.Mesh(roofCone,thatch);roof.position.set(x,4.9,z+1.4);roof.scale.setScalar(.78);roof.rotation.y=Math.PI/4;roof.castShadow=true;scene.add(roof);
    for(const sx of [-1,1])for(const sz of [-1,1])box(.34,1.7,.34,wood,x+sx*3.4,.85,z+1.4+sz*3.4,scene,false);
    box(7.6,.2,7.6,wood,x,1.7,z+1.4,scene,false);box(1.1,2,.12,wood,x,2.9,z+5.6,scene,false);
    box(1.6,.14,3.4,wood,x+3.4,1.6,z+6.6,scene,false);for(let i=0;i<4;i++)box(1.6,.12,.14,wood,x+3.4,1.1+i*.4,z+5.4+i*.8,scene,false);
    box(2.6,.4,1.4,wood,x-4.6,.4,z+4.4,scene,false);
  }
  function beachShack(x,z,seed){
    structure(8.6,3.4,8,x,z,corrugated);box(9.2,.26,8.6,tinRoof,x,3.6,z,scene,false);
    box(1.4,2.2,.12,wood,x-1.8,1.35,z+4.06,scene,false);box(2.4,1.2,.1,windowMat,x+2.2,2,z+4.06,scene,false);
    box(3.4,.16,1.6,awningStripes[seed%2],x,2.9,z+4.6,scene,false);
    box(4.6,.9,1.6,wood,x+6.4,.55,z-1.4,scene,false);box(4.2,.16,1.2,canvasCloth,x+6.4,1.05,z-1.4,scene,false);
    box(1.2,.9,1.2,crateWood,x-5.6,.5,z+3.2,scene,false);box(1,.7,1,sack,x-5.2,1.2,z+3.4,scene,false);
  }
  function containerYard(x,z,seed){
    for(const [dx,dz,stack] of [[-3.2,-2.6,2],[3.2,-2.6,1],[-3.2,2.8,1],[3.2,2.8,2]]){
      for(let level=0;level<stack;level++){const tint=containerMats[(seed+level+Math.round(dx))%containerMats.length];
        box(5.6,2.5,2.4,tint,x+dx,1.4+level*2.6,z+dz,scene,level===stack-1);
        for(let i=-2;i<=2;i++)box(.08,2.4,.08,corrugated,x+dx+i*1.1,1.4+level*2.6,z+dz+1.24,scene,false)}
    }
    structure(4.4,3,4.4,x,z+6.2,corrugated);box(1.4,2.2,.12,wood,x,1.4,z+8.3,scene,false);
    for(const side of [-1,1])box(.24,7,.24,trim,x+side*6.4,3.5,z-4.6,scene,false);
    box(13,.28,.28,trim,x,7.1,z-4.6,scene,false);
  }
  function dockOffice(x,z,seed){
    structure(10.4,4.6,9.6,x,z,stucco[(seed+2)%stucco.length]);box(11,.3,10.2,tinRoof,x,4.85,z,scene,false);
    box(3.4,2.6,.12,corrugated,x-2.4,1.5,z+4.86,scene,false);box(2.4,1.3,.1,windowMat,x+2.6,2.4,z+4.86,scene,false);
    box(1.6,1.1,1.4,wood,x+5.6,.6,z+3.4,scene,false);box(1.4,.9,1.2,sack,x-5.4,.5,z+3.6,scene,false);
    box(6,.16,2,awningStripes[(seed+1)%2],x,3.3,z+5.4,scene,false);
  }
  function ridgeChalet(x,z,seed){
    structure(9.8,3.4,9,x,z,stoneGrey);
    const shape=new THREE.Shape();shape.moveTo(-6,0);shape.lineTo(0,4.4);shape.lineTo(6,0);shape.lineTo(-6,0);
    const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:10.2,bevelEnabled:false}),roofs[1]);roof.position.set(x,3.5,z-5.1);roof.castShadow=true;scene.add(roof);
    box(2.6,2.4,.12,glass,x,1.6,z+4.56,scene,false);box(.16,2.4,.16,wood,x,1.6,z+4.62,scene,false);
    box(9,.18,2.6,wood,x,.5,z+6,scene,false);for(const side of [-1,1])box(.16,1,.16,wood,x+side*4.2,.9,z+7.1,scene,false);
    box(1,3.6,1,stoneGrey,x+3.6,5.4,z-2.4,scene,false);
    for(const dx of [-1.6,1.6])box(1.4,.5,.5,wood,x+dx,.35,z+6.6,scene,false);
  }
  function adobeCompound(x,z,seed){
    structure(8.6,3.6,8.6,x,z,mudBrick);box(9,.28,9,tinRoof,x,3.85,z,scene,false);
    for(const side of [-1,1]){box(.3,2.2,13,mudBrick,x+side*6.6,1.1,z,scene,false);box(13.3,.3,.28,mudBrick,x,1.1,z+side*6.6,scene,false)}
    box(2.2,2.4,.16,wood,x,1.2,z+6.5,scene,false);box(1.3,2.1,.12,wood,x-3.4,1.1,z+6.6,scene,false);
    for(const side of [-1,1])box(1.3,1.1,.1,windowMat,x+side*2.8,2.1,z+4.36,scene,false);
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.7,10),tankBlue);tank.position.set(x-4.6,3.1,z-3.6);tank.castShadow=true;scene.add(tank);
    box(1.2,.9,1,generatorGreen,x+4.4,.5,z-4,scene,false);box(1.6,.4,1.2,sack,x+4.2,.3,z+3.4,scene,false);
  }
  function campTents(x,z,seed){
    for(const [dx,dz,scale] of [[-3.6,-2.4,1],[3.6,-2.4,.86],[-3.4,3.2,.8]]){
      const shape=new THREE.Shape();shape.moveTo(-2.6*scale,0);shape.lineTo(0,2.8*scale);shape.lineTo(2.6*scale,0);shape.lineTo(-2.6*scale,0);
      const tent=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:3.4*scale,bevelEnabled:false}),tentCloth);tent.position.set(x+dx,.3,z+dz-1.7*scale);tent.castShadow=true;scene.add(tent);
      box(5.4*scale,.16,3.6*scale,sandWalls[seed%2],x+dx,.24,z+dz,scene,false);
    }
    structure(3.4,2.6,3.4,x,z+5.6,mudBrick);box(1.1,1.8,.12,wood,x,1.1,z+7.2,scene,false);
    for(let i=0;i<7;i++){const stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,0),rock);stone.position.set(x+Math.cos(i/7*Math.PI*2)*1.5,.3,z-5.6+Math.sin(i/7*Math.PI*2)*1.5);stone.scale.y=.6;scene.add(stone)}
    box(1.4,.5,.9,wood,x,.4,z-5.6,scene,false);box(1,.7,.7,sack,x+4,.4,z-4.4,scene,false);
  }
  // One dispatcher keeps each district's identity obvious from street level.
  function districtBuilding(district,x,z,seed){
    const pick=list=>list[seed%list.length];
    if(district==='village')return pick([villageHome,stiltHut,beachShack,villageHome,beachShack])(x,z,seed);
    if(district==='harbor')return pick([harborWarehouse,containerYard,dockOffice,harborWarehouse])(x,z,seed);
    if(district==='hills')return pick([hillsideHome,ridgeChalet,hillsideHome,bungalow])(x,z,seed);
    if(district==='desert')return pick([desertHome,adobeCompound,campTents,desertHome])(x,z,seed);
    if(district==='downtown'){
      if(seed%5===0)return officeSlab(x,z,seed);
      if(seed%5===1)return glassTower(x,z,seed);
      if(seed%7===3)return parkingStructure(x,z,seed);
      if(seed%7===5)return terracedShop(x,z,seed);
      return modernTower(x,z,seed);
    }
    if(district==='market'){
      if(seed%5===0)return marketRow(x,z,seed);
      if(seed%5===1)return kiosk(x,z,seed);
      if(seed%5===2)return terracedShop(x,z,seed);
      return tenementWalkup(x,z,seed);
    }
    if(z>=14)return seed%3===0?townhouse(x,z,seed):(seed%3===1?house(x,z,seed):bungalow(x,z,seed));
    if(seed%4===0)return store(x,z,seed);
    if(seed%4===1)return terracedShop(x,z,seed);
    if(seed%4===2)return apartment(x,z,seed);
    return tenementWalkup(x,z,seed);
  }
  const specialHeights={hotel:12,casino:7,church:6,mosque:6,office:17,apartment:10,warehouse:8,club:7,market:7,gym:6,garage:6,diner:5.4,cafe:5.4,clinic:6.4,fishmarket:6,lodge:6.4};
  const specialFacades={home:0xe2b99a,hub:0x4d8e87,friend:0xd49d8a,church:0xe5dbca,mosque:0xd2d7c2,hotel:0xe5aa83,shop:0xd1ac64,casino:0x985576,
    diner:0xe8b6a8,garage:0xb9c6cc,clinic:0xdfe8e2,club:0x6b4a7a,office:0x9fb0c0,cafe:0xd8b48a,apartment:0xcbb9a2,market:0xd9b46a,
    gym:0xb9c9bd,fishmarket:0xa8c4cc,warehouse:0xb9a88d,lodge:0xc0a07a};
  const neonPink=new THREE.MeshBasicMaterial({color:0xff7ad1}),neonBlue=new THREE.MeshBasicMaterial({color:0x6fd0ff}),neonLime=new THREE.MeshBasicMaterial({color:0xc9fc51}),neonWarm=new THREE.MeshBasicMaterial({color:0xffc46b});
  function specialBuilding(place){
    const {x,z,kind,name}=place, h=specialHeights[kind]||4.6;
    const facade=mat(specialFacades[kind]||0xd0c3ad,{map:wallDetail});
    structure(11,h,10,x,z,facade);box(11.5,.4,10.5,trim,x,h+.45,z,scene,false);
    box(1.8,2.6,.16,wood,x,1.55,z+5.1,scene,false);
    for(const side of [-1,1]){box(2.5,1.8,.12,windowMat,x+side*3.4,2.15,z+5.1,scene,false);box(2.9,.12,.3,concrete,x+side*3.4,1.15,z+5.2,scene,false)}
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=place.color;ctx.fillRect(0,0,512,128);ctx.fillStyle='#182b2b';ctx.textAlign='center';ctx.font='bold 46px sans-serif';ctx.fillText(name,256,80);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    box(9.5,.95,.13,new THREE.MeshStandardMaterial({map:texture}),x,3.65,z+5.16,scene,false);
    if(kind==='church'){box(2.2,4,2.2,facade,x,h+2,z,scene,false);box(.24,2,.24,concrete,x,h+5,z,scene,false);box(1.4,.24,.24,concrete,x,h+5.1,z,scene,false)}
    if(kind==='mosque'){const dome=new THREE.Mesh(new THREE.SphereGeometry(2.7,16,8,0,Math.PI*2,0,Math.PI/2),mat(0x75a997));dome.position.set(x,h+.65,z);scene.add(dome);box(1,8,1,facade,x+4.5,h+4,z,scene,false)}
    if(kind==='casino'||kind==='hotel')for(let y=5;y<h;y+=2)for(const side of [-1,1])box(2.4,1.15,.12,windowMat,x+side*3,y,z+5.1,scene,false);
    // Every door gets its own street furniture so the place reads from the road.
    const front=z+5.2;
    if(kind==='garage'){box(9.4,3.1,.12,glass,x,1.8,front,scene,false);box(9.8,.22,.2,trim,x,3.4,front,scene,false);box(.5,2.9,.5,neonLime,x-4.2,1.7,front+.2,scene,false);box(.5,2.9,.5,neonLime,x+4.2,1.7,front+.2,scene,false);
      box(10.6,.3,2.6,concrete,x,.32,z+7.4,scene,false);for(const dx of [-3.4,3.4])box(.16,1,.16,trim,x+dx,.9,z+8.4,scene,false)}
    if(kind==='diner'){box(8.6,2.2,.1,glass,x,1.5,front,scene,false);box(8.9,.16,1.7,awningStripes[0],x,2.9,z+5.9,scene,false);box(4.4,.16,.16,neonPink,x,3.7,front+.14,scene,false);
      for(const dx of [-5.6,5.6])box(.7,.9,.7,crateWood,x+dx,.5,z+7,scene,false)}
    if(kind==='club'){box(6.4,2.6,.12,dark,x,1.5,front,scene,false);box(6.8,.18,.18,neonPink,x,3,front+.1,scene,false);box(.18,2.6,.18,neonBlue,x-3.3,1.5,front+.1,scene,false);box(.18,2.6,.18,neonBlue,x+3.3,1.5,front+.1,scene,false);
      for(const dx of [-2.2,2.2])box(.14,1,.14,trim,x+dx,.6,z+7.6,scene,false);box(4.6,.1,.14,trim,x,1.05,z+7.6,scene,false)}
    if(kind==='clinic'){box(2.2,.5,.14,neonWarm,x,3.9,front+.12,scene,false);box(.5,2.2,.14,neonWarm,x,3.9,front+.12,scene,false);box(6.4,2.2,.1,glass,x+2.4,1.5,front,scene,false)}
    if(kind==='office'){box(9.6,3.4,.14,glass,x,1.9,front,scene,false);box(7,.3,2.6,modernTrim,x,3.9,z+6.4,scene,false);
      for(const dx of [-3.2,3.2])box(.26,3.6,.26,modernTrim,x+dx,1.9,z+7.4,scene,false);box(3,.06,3,concrete,x,.2,z+8.2,scene,false)}
    if(kind==='apartment'){for(let y=4;y<h-1;y+=3){box(7,.12,1.3,concrete,x,y,front+.6,scene,false);for(let i=-2;i<=2;i++)box(.07,.9,.07,rail,x+i*1.5,y+.5,z+6.4,scene,false)}
      box(2.6,.16,1.8,concrete,x,.28,z+6.6,scene,false);const tank=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.6,10),tankBlue);tank.position.set(x-3.4,h+.9,z-2.6);tank.castShadow=true;scene.add(tank)}
    if(kind==='market'){box(13,.2,3,awningStripes[1],x,3.6,z+6.6,scene,false);for(const dx of [-6,6])box(.18,3.4,.18,wood,x+dx,1.8,z+7.6,scene,false);
      for(const dx of [-4.4,4.4]){box(1.8,.9,1.2,crateWood,x+dx,.5,z+8.2,scene,false);box(1.2,.7,1,sack,x+dx+1.6,.4,z+8.4,scene,false)}
      for(const dz of [7.4,9.4]){const umbrella=new THREE.Mesh(new THREE.ConeGeometry(1.7,.7,8),dz>8?umbrellaBlue:umbrellaRed);umbrella.position.set(x-1.4,2.9,dz);scene.add(umbrella);box(.12,2.6,.12,wood,x-1.4,1.5,dz,scene,false)}}
    if(kind==='fishmarket'){box(9,.2,2.2,concrete,x,.9,z+7,scene,false);box(8.4,.4,1.8,mat(0xdff0f4),x,1.06,z+7,scene,false);
      for(const dx of [-3,0,3])box(1.4,.9,1.4,crateWood,x+dx,.5,z+9,scene,false);box(1.2,1.2,1.2,tankBlue,x+5.6,.7,z+7.4,scene,false)}
    if(kind==='warehouse'){box(6.4,3.6,.16,corrugated,x,2,front,scene,false);for(let i=-3;i<=3;i++)box(.1,3.4,.1,trim,x+i*.9,2,front+.1,scene,false);
      for(const [dx,dz,level] of [[-5.4,8.4,1],[5.4,8.4,2]]){for(let l=0;l<level;l++)box(4.6,2.4,2.4,containerMats[(l+Math.round(dx))%containerMats.length],x+dx,1.3+l*2.5,z+dz,scene,false)}}
    if(kind==='lodge'){box(1.2,4.6,1.2,stoneGrey,x+4.4,h+2.2,z-2.6,scene,false);box(9,.18,2.4,wood,x,.42,z+7,scene,false);
      for(const dx of [-3.6,3.6])box(.16,1.2,.16,wood,x+dx,.9,z+8,scene,false);for(let i=0;i<4;i++)box(1.2,.28,.28,wood,x-5.4,.3+i*.3,z+6.4+i*.1,scene,false)}
    if(kind==='cafe'){box(7.4,.18,1.8,awningStripes[0],x,3,z+6.2,scene,false);
      for(const dx of [-4.6,4.6]){box(1.4,.08,1.4,wood,x+dx,.85,z+8,scene,false);box(.14,.85,.14,wood,x+dx,.42,z+8,scene,false);const parasol=new THREE.Mesh(new THREE.ConeGeometry(1.5,.5,8),umbrellaRed);parasol.position.set(x+dx,2.5,z+8);scene.add(parasol);box(.1,1.7,.1,wood,x+dx,1.7,z+8,scene,false)}}
    if(kind==='gym'){box(6.6,1.5,.12,neonLime,x,3.5,front+.1,scene,false);box(5.4,2,.1,glass,x-2.4,1.4,front,scene,false);
      for(const dx of [-5.6,5.6])box(.9,.9,.9,trim,x+dx,.5,z+7.2,scene,false)}
  }
  for(let x=-126;x<=126;x+=28)for(let z=-126;z<=126;z+=28){
    const xi=(x+126)/28,zi=(z+126)/28,seed=(xi*37+zi*53+xi*zi*19)%113;
    const district=districtAt(x,z);box(15,.25,15,districtGround[district]||pavement,x,.1,z,scene,false);
    const landmark=LANDMARKS.find(p=>p.x===x&&p.z===z);
    if(landmark)specialBuilding(landmark);
    else districtBuilding(district,x,z,seed);
  }
  // A handcrafted gateway and original street mural give the opening block an identity.
  const muralTexture=texLoader.load(`${import.meta.env.BASE_URL}assets/neighborhood-mural.jpg`);muralTexture.colorSpace=THREE.SRGBColorSpace;
  const muralMaterial=new THREE.MeshStandardMaterial({map:muralTexture,roughness:.92});
  box(.08,2.7,8.2,muralMaterial,-8.05,2.6,-14,scene,false);
  const gateCanvas=document.createElement('canvas');gateCanvas.width=512;gateCanvas.height=128;const gc=gateCanvas.getContext('2d');gc.fillStyle='#e8d2ab';gc.fillRect(0,0,512,128);gc.strokeStyle='#8b563c';gc.lineWidth=10;gc.strokeRect(5,5,502,118);gc.fillStyle='#315750';gc.textAlign='center';gc.font='bold 55px sans-serif';gc.fillText('PALM GROVE',256,83);
  const gateTexture=new THREE.CanvasTexture(gateCanvas);gateTexture.colorSpace=THREE.SRGBColorSpace;const gateSign=new THREE.MeshStandardMaterial({map:gateTexture,roughness:.85});
  for(const side of [-1,1]){box(.35,6.7,.35,wood,side*8,3.35,0,scene,false);box(1.1,.5,1.1,concrete,side*8,.35,0,scene,false)}
  box(16.5,.3,.35,wood,0,6.65,0,scene,false);box(8,1.65,.18,gateSign,0,6.5,.2,scene,false);
  for(let x=-7;x<=7;x+=2)box(.18,.18,.18,glow,x,6.25,.25,scene,false);
  // Lamps and small street furniture, clear of the main driving lanes.
  for(let x=-ROAD_LIMIT;x<=ROAD_LIMIT;x+=28)for(let z=-ROAD_LIMIT;z<=ROAD_LIMIT;z+=28){
    if((x+z)%56===0){obstacles.push({x:x+6.6,z:z+6.6,halfX:.25,halfZ:.25});box(.16,5.5,.16,trim,x+6.6,2.75,z+6.6,scene,false);box(1.4,.12,.16,trim,x+6,5.4,z+6.6,scene,false);box(.55,.12,.4,glow,x+5.4,5.3,z+6.6,scene,false)}
  }
  // Street furniture is placed close to the curb, outside the driving lanes.
  for(let x=-56;x<=56;x+=56)for(let z=-56;z<=56;z+=56){
    box(.18,4.5,.18,trim,x-7,2.25,z-7,scene,false);box(.7,1.5,.45,trim,x-7,4,z-7,scene,false);
    box(.4,.3,.08,red,x-7,4.45,z-6.76,scene,false);box(.4,.3,.08,glow,x-7,3.65,z-6.76,scene,false);
  }
  // Contemporary transit shelters and ticket machines on major city streets.
  const transitBlue=mat(0x377a7e), machineScreen=new THREE.MeshBasicMaterial({color:0x9ddfd6});
  for(const x of [-56,0,56])for(const z of [-56,0,56]){
    const sx=x+8.3,sz=z+10;obstacles.push({x:sx,z:sz,halfX:.55,halfZ:2.1});
    for(const dz of [-2,2])box(.12,3,.12,trim,sx,1.6,sz+dz,scene,false);
    box(1.1,.16,4.3,transitBlue,sx,3.15,sz,scene,false);box(.08,2.3,3.8,glass,sx,1.55,sz,scene,false);
    box(.65,1.35,.6,transitBlue,sx-.35,.8,sz-1.35,scene,false);box(.1,.45,.4,machineScreen,sx-.69,1.05,sz-1.35,scene,false);
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
  // Palms are clustered in the village lots and along the coastline, not in
  // driving lanes. They make the district recognisable at street level.
  for(const x of [92,120,148])for(const z of [52,80,108,136]){
    const height=7+((x+z)%3);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.14,.3,height,7),bark);trunk.position.set(x,height/2,z);trunk.rotation.z=.07;scene.add(trunk);
    for(let i=0;i<6;i++){const frond=new THREE.Mesh(frondGeom,leaf);frond.position.set(x,height,z);frond.rotation.y=i*Math.PI/3;scene.add(frond)}
  }
  // Sidewalk details remain decorative and leave travel lanes clear.
  const post=mat(0xb75d3e), metalDetail=mat(0x9fafa4), shrub=mat(0x6a8058);
  for(let x=-56;x<=56;x+=56)for(let z=-56;z<=56;z+=56){
    box(.5,.9,.5,post,x+6.8,.45,z+9.4,scene,false);box(.85,.16,.2,post,x+6.8,.8,z+9.4,scene,false);
    box(1.5,.45,1.1,concrete,x-7.6,.25,z+10,scene,false);box(1.35,.55,.95,shrub,x-7.6,.72,z+10,scene,false);
    box(.14,3,.14,metalDetail,x+7,1.5,z-8,scene,false);box(1.7,.6,.1,signs[(Math.abs(x)+Math.abs(z))%shops.length],x+7,2.8,z-8,scene,false);
  }
  // Opening-block street dressing: decorative only, kept away from travel lanes.
  const paint=mat(0xe7d0a5), benchWood=mat(0x805a3c), planter=mat(0xc88866), leaves=mat(0x567651);
  for(const [x,z] of [[-7.8,17],[7.8,-17],[-7.8,-34],[7.8,34]]){obstacles.push({x,z,halfX:.4,halfZ:1.05});
    // Bench alongside the pavement, with separate slats and metal legs.
    for(let i=-1;i<=1;i++)box(.18,.12,2.1,benchWood,x+i*.24,.72,z,scene,false);
    for(const dz of [-.75,.75]){box(.6,.1,.12,trim,x,.68,z+dz,scene,false);box(.1,.65,.1,trim,x-.24,.34,z+dz,scene,false);box(.1,.65,.1,trim,x+.24,.34,z+dz,scene,false)}
    box(.1,.72,2.1,benchWood,x-.36,1.16,z,scene,false);
  }
  for(const [x,z] of [[-7.6,23],[7.6,-22],[-7.6,-45],[7.6,41]]){obstacles.push({x,z,halfX:.55,halfZ:.55});
    box(1.1,.65,1.1,planter,x,.38,z,scene,false);box(.9,.65,.9,leaves,x,.98,z,scene,false);box(.5,.4,.5,greenery,x,1.42,z,scene,false);
  }
  // Curbs, drains and painted parking bays give the road an inhabited scale.
  for(const z of [-42,-14,14,42])for(const side of [-1,1]){
    box(.14,.12,12,concrete,side*6.55,.12,z,scene,false);
    box(.42,.025,1.05,trim,side*6.18,.08,z+4,scene,false);
    for(let i=-2;i<=2;i++)box(.45,.035,.035,metalDetail,side*6.18,.1,z+4+i*.17,scene,false);
    box(.12,.025,3,paint,side*5.35,.095,z,scene,false);
  }
  // Utility poles and overhead cables add depth along the residential streets.
  const cable=mat(0x403c36);for(let z=-56;z<=56;z+=28){box(.16,7,.16,wood,-6.8,3.5,z,scene,false);box(1.4,.14,.14,wood,-6.8,6.7,z,scene,false);if(z<56)box(.05,.05,28,cable,-6.8,6.7,z+14,scene,false)}
  // Distant silhouettes frame the horizon without affecting navigation.
  const skyline=mat(0x667b81);for(let i=0;i<10;i++){const h=18+(i*19%38);box(13,h,13,skyline,-70+i*15,h/2,-187,scene,false)}
  // Batch decorative static boxes by material and 56m cell, retaining frustum
  // culling and leaving collision/raycast building meshes untouched.
  const steelPole=mat(0x9aa4a8), binSteel=mat(0x8e9a94);
  // --- Street life dressing ---
  // Billboards for brands invented for this game, painted on a canvas so each
  // board costs one texture. They stand behind the pavement line, never in a lane.
  const brandBoards=[['HALCYON MOTORS','DRIVE SOMETHING NEW','#1f3a4d','#8fd0e8'],['SABLE 240','BUILT FOR EVERY DAY','#3b2f28','#e0c39a'],
    ['NIGHT OWL LOUNGE','OPEN TILL LATE','#2a1c33','#ff7ad1'],['BREEZE COURIERS','SAME DAY, EVERY DAY','#20343a','#c9fc51'],
    ['PALM CAB','METER RUNNING 24/7','#3a2f18','#f0c36e'],['METRO PD','SERVE. PROTECT. PATROL.','#1d2a38','#9fc0d8'],
    ['IRON PALM GYM','TRAIN HARD, EAT WELL','#1e2b22','#9fd6a8'],['PALM DINER','GRILLS ALL NIGHT','#33201f','#f2a1a1']];
  const boardMaterials=brandBoards.map(([title,tag,background,accent])=>{
    const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle=background;ctx.fillRect(0,0,512,256);ctx.fillStyle=accent;ctx.fillRect(0,0,512,44);ctx.fillRect(0,236,512,20);
    ctx.fillStyle='#f6f1e4';ctx.textAlign='center';ctx.font='bold 46px sans-serif';ctx.fillText(title,256,120);
    ctx.font='26px sans-serif';ctx.fillStyle=accent;ctx.fillText(tag,256,176);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.85});
  });
  const clearOfDoors=(px,pz)=>!LANDMARKS.some(place=>Math.hypot(place.x+0-(px),place.z+8-(pz))<9);
  for(const [bx,bz,ry,index] of [[8.6,-70,0,0],[-8.6,-98,Math.PI,1],[70,-8.6,Math.PI/2,2],[-70,8.6,-Math.PI/2,3],[8.6,70,0,4],[-8.6,98,Math.PI,5],[98,36.6,Math.PI/2,6],[-98,-36.6,-Math.PI/2,7]]){
    if(!clearOfDoors(bx,bz))continue;
    for(const side of [-1,1])box(.22,6.4,.22,trim,bx+Math.cos(ry)*side*2.6,3.2,bz-Math.sin(ry)*side*2.6,scene,false);
    // Rotated panels keep castShadow so the static-batch pass (which ignores
    // rotation) does not flatten them into the wrong orientation.
    const panel=box(6.2,3.1,.18,boardMaterials[index%boardMaterials.length],bx,6.6,bz,scene,true);panel.rotation.y=ry;
    box(6.6,.26,.4,trim,bx,8.2,bz,scene,false);
    for(const side of [-1,1]){const lamp=box(.5,.1,.28,glow,bx+Math.cos(ry)*side*1.6,8.05,bz-Math.sin(ry)*side*1.6,scene,true);lamp.rotation.y=ry}
  }
  // Market stalls and vendor umbrellas crowd the kerbs of Old Market Row and the
  // city centre. They are walkable obstacles, so the player weaves between them.
  const stallSpots=[];
  for(let road=-112;road<=112;road+=56)for(let along=-98;along<=98;along+=28){
    for(const side of [-1,1]){
      const sx=road+side*5.9,sz=along+((side>0)?6:-6);
      if(Math.abs(sx)>ROAD_LIMIT||Math.abs(sz)>ROAD_LIMIT)continue;
      const district=districtAt(sx,sz);
      if(district!=='market'&&!(district==='city'&&side<0)&&district!=='downtown')continue;
      if(!clearOfDoors(sx,sz))continue;
      if((Math.round(road/28)+Math.round(along/28)+side)%3!==0)continue;
      stallSpots.push({x:sx,z:sz,along:'z',district});
    }
  }
  stallSpots.forEach((stall,i)=>{
    const cloth=i%2?umbrellaRed:umbrellaBlue;
    obstacles.push({x:stall.x,z:stall.z,halfX:.75,halfZ:1.35});
    box(1.4,.1,2.6,crateWood,stall.x,.95,stall.z,scene,false);
    for(const dz of [-1.1,1.1])box(.12,.95,.12,wood,stall.x+.6,.48,stall.z+dz,scene,false),box(.12,.95,.12,wood,stall.x-.6,.48,stall.z+dz,scene,false);
    for(let j=-1;j<=1;j++)box(.42,.32,.5,[sack,crateWood,greenery,mat(0xd8b46a)][(j+i+4)%4],stall.x-.3+j*.42,1.16,stall.z+j*.5,scene,false);
    const umbrella=new THREE.Mesh(new THREE.ConeGeometry(1.7,.65,8),cloth);umbrella.position.set(stall.x,2.95,stall.z);umbrella.castShadow=true;scene.add(umbrella);
    box(.1,2.1,.1,wood,stall.x,1.5,stall.z,scene,false);
    if(i%3===0){box(1,.7,.8,sack,stall.x-.95,.35,stall.z+1.5,scene,false)}
  });
  // Kerbside city clutter: bins, cones, tyre stacks and crates. Decorative and
  // small enough that they never block a driving lane.
  const binMat=mat(0x4d5b52), coneMat=mat(0xe07a3c);
  for(let x=-112;x<=112;x+=28)for(let z=-112;z<=112;z+=28){
    const seedValue=Math.abs(x*7+z*13)%97;
    if(seedValue%11!==0)continue;
    const side=(seedValue%2?1:-1),cx=x+side*5.9,cz=z+((seedValue%3)-1)*7;
    if(!clearOfDoors(cx,cz))continue;
    const district=districtAt(cx,cz);
    if(district==='harbor'||district==='downtown'){box(1.5,1.2,1,binMat,cx,.6,cz,scene,false);box(1.6,.14,1.1,trim,cx,1.26,cz,scene,false);obstacles.push({x:cx,z:cz,halfX:.8,halfZ:.55})}
    else if(district==='market'||district==='city'){for(let c=0;c<3;c++){const cone=new THREE.Mesh(new THREE.ConeGeometry(.28,.6,8),coneMat);cone.position.set(cx+c*.7,.32,cz);scene.add(cone);box(.4,.05,.4,coneMat,cx+c*.7,.04,cz,scene,false)}}
    else if(district==='hills'||district==='desert'){for(let t=0;t<3;t++){const tyre=new THREE.Mesh(new THREE.TorusGeometry(.45,.17,7,12),dark);tyre.rotation.x=Math.PI/2;tyre.position.set(cx,.2+t*.34,cz);scene.add(tyre)}}
    else {box(1.2,.8,1.2,crateWood,cx,.4,cz,scene,false);box(1,.6,1,sack,cx+.2,1.1,cz-.2,scene,false)}
  }
  // Bike racks outside the places riders actually visit.
  for(const place of LANDMARKS){
    if(!['hub','lodge','gym','market','diner','garage'].includes(place.kind))continue;
    const rx=place.x-6.6,rz=place.z+9.6;
    for(let i=0;i<3;i++){box(.1,.9,.1,trim,rx+i*.7,.45,rz,scene,false);box(.7,.08,.08,trim,rx+i*.7,.88,rz,scene,false)}
    if(place.kind==='lodge'||place.kind==='garage'){const parkedBike=box(.5,.5,2.1,mat(0xc2e34e),rx+1.9,1.05,rz,scene,false);box(.14,.7,.14,steelPole,rx+1.9,1.5,rz-.8,scene,false);box(.9,.1,.1,steelPole,rx+1.9,1.8,rz-.8,scene,false)}
  }
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
  // A cheap placeholder for the crowd: four boxes instead of a full rig. It is
  // replaced by a real character model only for people close to the camera.
  function simplePerson(color){
    const g=new THREE.Group(), outfit=mat(color), skin=mat(0xb08a6c), trousers=mat(0x2a3238);
    const legs=box(.6,.92,.4,trousers,0,.46,0,g), torso=box(.84,1.02,.48,outfit,0,1.46,0,g);
    const head=box(.48,.52,.46,skin,0,2.26,0,g), hair=box(.5,.16,.48,trousers,0,2.56,0,g);
    const leftArm=box(.19,.82,.23,outfit,-.53,1.5,0,g), rightArm=box(.19,.82,.23,outfit,.53,1.5,0,g);
    const leftLeg=box(.26,.9,.3,trousers,-.16,.45,0,g), rightLeg=box(.26,.9,.3,trousers,.16,.45,0,g);
    g.traverse(o=>{if(o.isMesh)o.castShadow=false});
    g.userData={torso,leftArm,rightArm,leftLeg,rightLeg,head,hair,simple:true};
    return g;
  }
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
  function vehicle(type,x,z,length=null){
    const g=new THREE.Group(), bike=type==='bike',body=mat(bike?0xc2e34e:0xc55e47,{metalness:.3,roughness:.38}),rubber=mat(0x11191d),metal=mat(0x7c8d91,{metalness:.75,roughness:.3}),wheels=[];
    function wheel(px,pz,r,width){const group=new THREE.Group();group.position.set(px,r,pz);const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width,16),rubber);t.rotation.z=Math.PI/2;group.add(t);const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,width+.02,12),metal);hub.rotation.z=Math.PI/2;group.add(hub);g.add(group);wheels.push(group)}
    if(bike){wheel(0,-1.25,.55,.38);wheel(0,1.25,.55,.38);box(.65,.55,2,body,0,1.05,0,g);box(.56,.3,.85,dark,0,1.48,.35,g);box(.18,.75,.18,metal,0,1.45,-.9,g);box(1,.12,.12,metal,0,1.78,-.9,g);box(.5,.25,.16,glow,0,1.25,-1.1,g);box(.4,.15,.15,red,0,1.1,1.18,g)}
    else {for(const sx of [-1,1])for(const sz of [-1.5,1.5])wheel(sx*1.4,sz,.52,.4);box(2.8,.75,4.8,body,0,1,0,g);box(2.45,.8,2.35,glass,0,1.73,.15,g);box(2.5,.16,2.4,body,0,2.18,.15,g);for(const sx of [-1,1]){box(.09,.8,2.3,metal,sx*1.2,1.73,.15,g);box(.1,.1,.55,dark,sx*1.43,1.24,.65,g)}box(2.6,.22,.15,dark,0,.7,-2.46,g);for(const x of [-.9,.9]){box(.5,.22,.1,glow,x,1.12,-2.43,g);box(.55,.2,.1,red,x,1.12,2.43,g)}box(2.5,.13,.12,metal,0,.85,2.46,g)}
    g.position.set(x,0,z);scene.add(g);return {type,mesh:g,wheels,length:length||(bike?3.25:4.8)};
  }
  return {mat,box,blocks,obstacles,buildingMeshes,person,simplePerson,vehicle,stallSpots};
}
