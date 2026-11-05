import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// CC0 nature details are instanced per mesh/material rather than adding a draw
// call for every tree or rock. They are decorative and stay within lots.
export function addDistrictDecor(scene) {
  const specs=[];
  const add=(name,x,z,height,rotation=0)=>specs.push({name,x,z,height,rotation});
  for(const x of [70,98,126])for(const z of [14,42,70,98,126]){
    add('tree-palmdetailedshort',x+5.5,z-5.4,6.5,(x+z)*.04);
    add('plant-bushdetailed',x-5.4,z+5.2,1.4,(x-z)*.02);
    add('cactus-tall',-x-5.4,z-5.2,2.7,(x+z)*.02);
  }
  for(const x of [70,98,126])for(const z of [-126,-98,-70,-42,-14]){
    add('tree-pinetalla-detailed',x+5.4,z+5.2,7,(x+z)*.02);
  }
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x9d9986,roughness:1}),30),helper=new THREE.Object3D();let stoneIndex=0;
  for(const x of [70,98,126])for(const z of [14,42,70,98,126])for(const side of [-1,1]){helper.position.set(side*x-5.2,.43,(side<0?z:-z)+5.1);helper.scale.set(1,.55,.8);helper.rotation.y=(x+z)*.03;helper.updateMatrix();stones.setMatrixAt(stoneIndex++,helper.matrix)}
  stones.count=stoneIndex;stones.receiveShadow=true;stones.computeBoundingSphere();scene.add(stones);
  const loader=new GLTFLoader(),names=[...new Set(specs.map(s=>s.name))];
  return Promise.all(names.map(async name=>{
    try {
      const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/models/nature/${name}.glb`),root=gltf.scene;
      root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;
      if(!(height>0))return;const instances=specs.filter(s=>s.name===name),objects=[];root.traverse(o=>{if(o.isMesh)objects.push(o)});
      for(const mesh of objects){const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,instances.length),transform=new THREE.Object3D(),matrix=new THREE.Matrix4();
        instances.forEach((item,i)=>{const scale=item.height/height;transform.position.set(item.x,-bounds.min.y*scale,item.z);transform.rotation.y=item.rotation;transform.scale.setScalar(scale);transform.updateMatrix();matrix.multiplyMatrices(transform.matrix,mesh.matrixWorld);batch.setMatrixAt(i,matrix)});
        batch.computeBoundingSphere();batch.receiveShadow=true;scene.add(batch);
      }
    }catch(error){console.warn(`Could not load district detail ${name}`,error)}
  }));
}
