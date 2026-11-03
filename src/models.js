import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

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
  ['human','human-anims','sedan-sports','motorcycle'].forEach(load);
  function createHuman(gltf, animations, role) {
    const model=cloneSkeleton(gltf.scene);
    // One precomputed mesh LOD per person, rather than rendering all four at once.
    const lod=role==='player'?'player_LOD1':'player_LOD2';
    model.traverse(o=>{if(/^player_LOD[0-3]$/.test(o.name))o.visible=o.name===lod;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(['enemy','civilian','civilian-female'].includes(role)&&o.material?.name==='outfit'){o.material=o.material.clone();o.material.color.setHex(role==='enemy'?0xbd4b3d:role==='civilian'?0xb5c5ca:0x7797a1)}}});
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    const scale=3.15/size.y,visual=new THREE.Group();visual.rotation.y=Math.PI;
    model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;visual.add(model);
    const mixer=new THREE.AnimationMixer(model), actions={};
    for(const clip of animations.animations)actions[clip.name]=mixer.clipAction(clip);
    if(actions.idle)actions.idle.play();
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
    return {visual,model,mixer,actions,current:actions.idle};
  }
  async function person(group,role) {
    const [gltf,animations]=await Promise.all([load('human'),load('human-anims')]);if(!gltf||!animations)return;
    const human=createHuman(gltf,animations,role);for(const child of group.children)if(!child.userData.persist)child.visible=false;group.add(human.visual);
    group.userData.animation=human;group.userData.model=human.visual;if(group.userData.weaponIndex!==undefined)updateWeapon(group,group.userData.weaponIndex);
  }
  async function vehicle(vehicle) {
    const gltf=await load(vehicle.type==='bike'?'motorcycle':'sedan-sports');if(!gltf)return;
    const model=gltf.scene.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    const length=vehicle.type==='bike'?3.25:4.8,scale=length/size.z;
    const visual=new THREE.Group();visual.rotation.y=Math.PI;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;visual.add(model);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    for(const child of vehicle.mesh.children)child.visible=false;
    vehicle.mesh.add(visual);vehicle.wheels=[];model.traverse(o=>{if(/wheel[-_]/i.test(o.name))vehicle.wheels.push(o)});
    if(vehicle.type==='bike') {
      const [personGltf,animations]=await Promise.all([load('human'),load('human-anims')]);if(!personGltf||!animations)return;
      const human=createHuman(personGltf,animations,'rider'),rider=human.visual;rider.scale.setScalar(.7);rider.position.set(0,.82,.15);rider.visible=false;
      const crouch=human.actions.crouch_idle;if(crouch){human.current?.stop();crouch.play();human.mixer.update(.3)}
      vehicle.mesh.add(rider);vehicle.rider=rider;rider.visible=!!vehicle.occupied;
    }
  }
  return { person, vehicle };
}
export function animatePerson(group,amount,dt,shooting=false) {
  const a=group.userData.animation;if(!a)return false;
  const action=shooting?a.actions.fire:amount>.75?a.actions.run:amount>.1?a.actions.walk:a.actions.idle;
  if(action&&action!==a.current){a.current?.fadeOut(.15);action.reset().fadeIn(.15).play();a.current=action}
  a.mixer.update(dt);return true;
}

export function updateWeapon(group,index){group.userData.weaponIndex=index;const gun=group.userData.model?.userData.gun;if(gun)gun.scale.y=[1,2.3,1.8][index]||1;}
