import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { makeNaturalWalkClip, walkPlaybackRate } from './locomotion.js';

// Models are local CC0 assets. Procedural placeholders remain if loading fails.
export function createModels(renderer) {
  const basis = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}basis/`).detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(basis);
  const base = `${import.meta.env.BASE_URL}assets/models/`, cache = new Map();
  function load(name) {
    if (!cache.has(name)) cache.set(name, loader.loadAsync(`${base}${name}.glb`).catch(error => {
      console.warn(`Could not load ${name}; keeping the procedural fallback.`, error);return null;
    }));
    return cache.get(name);
  }
  ['human','human-anims','player-marcus','sedan-sports','suv-luxury','taxi','hatchback-sports','motorcycle','cat','dog'].forEach(load);
  // Catalog vehicles load on demand (see `vehicle`); the common city types are
  // warmed up here so the first taxi or saloon does not pop in late.
  ['sedan','suv','van','truck','police','delivery','race','race-future'].forEach(load);
  function createHuman(gltf, animations, role) {
    const model=cloneSkeleton(gltf.scene);
    // One precomputed mesh LOD per person, rather than rendering all four at once.
    const lod=role==='player'?'player_LOD1':'player_LOD2';
    const palette={enemy:{outfit:0xad4a3c,skin:0xbd866a,hair:0x302a29},civilian:{outfit:0xb5c5ca,skin:0xbd896b,hair:0x3d3029},'civilian-female':{outfit:0x7797a1,skin:0xa27157,hair:0x262626},'civilian-warm':{outfit:0xbc8567,skin:0xd1a181,hair:0x403027},'civilian-dark':{outfit:0x658471,skin:0x805742,hair:0x252322},'civilian-elder':{outfit:0x8a9a8f,skin:0x9c6e52,hair:0xc4c4c4},'civilian-teen':{outfit:0xd9735a,skin:0xc99673,hair:0x1e1a18},'civilian-business':{outfit:0x2f3b4a,skin:0xa9765a,hair:0x1c1a19},'civilian-child':{outfit:0xe2c35c,skin:0xc4906e,hair:0x5a3b25},officer:{outfit:0x1f3f7a,skin:0xb98a68,hair:0x221d1c}};
    const flashMaterials=[];model.traverse(o=>{if(/^player_LOD[0-3]$/.test(o.name))o.visible=o.name===lod;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      // The new character has separate MakeHuman meshes; correct their alpha
      // modes so skin/clothes don't render transparent while hair stays cut out.
      if(role==='player'||role==='rider'){
        const label=o.name,m=o.material;
        if(/^(Hair|Eyebrows|Eyelashes)/.test(label))Object.assign(m,{transparent:false,alphaTest:.35,depthWrite:true,side:THREE.DoubleSide});
        else if(/^Eyes/.test(label))Object.assign(m,{transparent:false,alphaTest:.5,depthWrite:true,roughness:.15});
        else {Object.assign(m,{transparent:false,alphaTest:0,depthWrite:true});if(/^Body/.test(label))m.alphaMap=null;if(/^Clothes/.test(label))Object.assign(m,{roughness:.8,metalness:0,roughnessMap:null,metalnessMap:null})}
        m.needsUpdate=true;o.frustumCulled=false;
      }
      const color=palette[role]?.[o.material?.name];if(color!==undefined){o.material=o.material.clone();o.material.color.setHex(color);if(role==='enemy'&&o.material.name==='outfit')flashMaterials.push(o.material)}}});
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    // Age and build: elders and teens are a touch shorter, children much smaller.
    const ageScale={'civilian-elder':.95,'civilian-teen':.92,'civilian-child':.72}[role]??1;
    const scale=2.5/size.y*ageScale,visual=new THREE.Group();visual.rotation.y=Math.PI;
    model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;visual.add(model);
    visual.userData.flashMaterials=flashMaterials;
    const mixer=new THREE.AnimationMixer(model), actions={};
    for(const clip of animations.animations)actions[clip.name]=mixer.clipAction(clip);
    if(role==='player'){
      const idle=gltf.animations.find(clip=>clip.name==='Idle'),walk=gltf.animations.find(clip=>clip.name==='Walk');
      if(idle)actions.Idle=mixer.clipAction(idle);
      if(walk&&idle)actions.NaturalWalk=mixer.clipAction(makeNaturalWalkClip(walk,idle,animations.animations.find(clip=>clip.name==='unarmed_walk'),model));
    }
    const initial=actions[role==='player'?'Idle':role.startsWith('civilian')?'unarmed_idle':'idle']||actions.idle;
    initial?.play();
    if(role==='player'||role==='enemy'){
      const hand=model.getObjectByName('mixamorigRightHand');
      if(hand){
        const gun=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x20262a,metalness:.55,roughness:.4});
        const slide=new THREE.Mesh(new THREE.BoxGeometry(.08,.32,.08),steel);slide.position.set(0,.12,.02);gun.add(slide);
        const grip=new THREE.Mesh(new THREE.BoxGeometry(.07,.08,.16),steel);grip.position.set(0,.02,-.06);gun.add(grip);hand.add(gun);visual.userData.gun=gun;
      }
    }
    // A red band distinguishes hostile soldiers from civilian pedestrians.
    if(role==='enemy'){
      const arm=model.getObjectByName('mixamorigLeftArm');
      if(arm){const band=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.12,8,1,true),new THREE.MeshStandardMaterial({color:0xd45139}));band.position.y=.13;arm.add(band)}
    }
    return {visual,model,mixer,actions,current:initial,role};
  }
  async function person(group,role) {
    const [gltf,animations]=await Promise.all([load(role==='player'?'player-marcus':'human'),load('human-anims')]);if(!gltf||!animations)return;
    const human=createHuman(gltf,animations,role);for(const child of group.children)if(!child.userData.persist)child.visible=false;group.add(human.visual);
    group.userData.animation=human;group.userData.model=human.visual;if(group.userData.weaponIndex!==undefined)updateWeapon(group,group.userData.weaponIndex);
  }
  async function animal(group,type) {
    const gltf=await load(type);if(!gltf)return;
    const model=cloneSkeleton(gltf.scene),bounds=new THREE.Box3().setFromObject(model);model.scale.setScalar(1.7);model.position.y=-bounds.min.y*1.7;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});group.add(model);
    const mixer=new THREE.AnimationMixer(model),idle=gltf.animations.find(a=>a.name==='Idle'),walk=gltf.animations.find(a=>/^(walk|walking)$/i.test(a.name));
    const actions={idle:idle&&mixer.clipAction(idle),walk:walk&&mixer.clipAction(walk)};actions.idle?.play();group.userData.animalAnimation={mixer,actions,current:actions.idle};
  }
  async function vehicle(vehicle,tint=null) {
    const gltf=await load(vehicle.type==='bike'?'motorcycle':(vehicle.variant||'sedan-sports'));if(!gltf)return;
    const paint=tint===null?vehicle.tint??null:tint;
    const model=gltf.scene.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    const length=vehicle.length||(vehicle.type==='bike'?3.25:4.8),scale=length/size.z;
    const visual=new THREE.Group();visual.rotation.y=Math.PI;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;visual.add(model);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(paint!==null&&o.material){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(paint))}}});
    for(const child of vehicle.mesh.children)child.visible=false;
    if(vehicle.type==='car'){
      const head=new THREE.MeshBasicMaterial({color:0xffe5b1}),tail=new THREE.MeshBasicMaterial({color:0xf15241});
      const lampZ=2.37*(length/4.8);
      for(const x of [-.85,.85])for(const [z,material] of [[-lampZ,head],[lampZ,tail]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.08),material);lamp.position.set(x,.85,z);visual.add(lamp)}
    }
    vehicle.mesh.add(visual);vehicle.visual=visual;vehicle.wheels=[];model.traverse(o=>{if(/wheel[-_]/i.test(o.name))vehicle.wheels.push(o)});
    if(vehicle.type==='bike') {
      const [personGltf,animations]=await Promise.all([load('player-marcus'),load('human-anims')]);if(!personGltf||!animations)return;
      const human=createHuman(personGltf,animations,'rider'),rider=human.visual;rider.scale.setScalar(.84);rider.position.set(0,.82,.15);rider.visible=false;
      const crouch=human.actions.crouch_idle;if(crouch){human.current?.stop();crouch.play();human.mixer.update(.3)}
      vehicle.mesh.add(rider);vehicle.rider=rider;rider.visible=!!vehicle.occupied;
    }
  }
  return { person, vehicle, animal };
}
export function personAnimationName(role, amount, shooting=false, aiming=false, sprinting=false) {
  if (shooting) return 'fire';
  if (aiming) return amount > .1 ? 'walk' : 'aim_idle';
  if (role === 'player') return amount > .1 ? (sprinting ? 'unarmed_run' : 'NaturalWalk') : 'Idle';
  if (role === 'enemy') return amount > .1 ? 'run' : 'idle';
  if (amount > .1) return sprinting ? 'unarmed_run' : 'unarmed_walk';
  return 'unarmed_idle';
}

export function animatePerson(group,amount,dt,shooting=false,aiming=false,sprinting=false,actualSpeed=0) {
  const a=group.userData.animation;if(!a)return false;
  const name=personAnimationName(a.role,amount,shooting,aiming,sprinting);
  const action=a.actions[name]||a.actions.idle;
  if(action&&action!==a.current){a.current?.fadeOut(.15);action.reset().fadeIn(.15).play();a.current=action}
  if(a.role==='player'&&(name==='NaturalWalk'||name==='unarmed_run'))action.setEffectiveTimeScale(walkPlaybackRate(actualSpeed,sprinting));
  a.mixer.update(dt);return true;
}

export function updateWeapon(group,index){group.userData.weaponIndex=index;const gun=group.userData.model?.userData.gun;if(gun)gun.scale.y=[1,2.3,1.8,1.6,2.8,1.2,2.5][index]||1;}

export function animateAnimal(group,moving,dt) {
  const a=group.userData.animalAnimation;if(!a)return;const next=moving?a.actions.walk:a.actions.idle;
  if(next&&next!==a.current){a.current?.fadeOut(.2);next.reset().fadeIn(.2).play();a.current=next}a.mixer.update(dt);
}
export function setHitFlash(group,on){
  group.userData.torso?.material.emissive.setHex(on?0x8d2b18:0);
  for(const material of group.userData.model?.userData.flashMaterials||[])material.emissive.setHex(on?0x8d2b18:0);
}

// Switch only civilian meshes between authored LODs. Keep the player/enemy
// rigs intact and avoid recomputing or cloning their animation data.
export function setCivilianLOD(group, far) {
  const a=group.userData.animation;if(!a||!a.role.startsWith('civilian'))return;
  const lod=far?'player_LOD3':'player_LOD2';if(group.userData.civilianLod===lod)return;
  const near=a.model.getObjectByName('player_LOD2'),distant=a.model.getObjectByName('player_LOD3');
  if(!near||!distant)return;near.visible=!far;distant.visible=far;group.userData.civilianLod=lod;
}
