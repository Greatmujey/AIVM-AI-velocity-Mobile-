import * as THREE from 'three';
import { createWorld } from './world.js';
import { movePosition, hasLineOfSight, relativeMovement, objectiveDirection } from './navigation.js';
import './style.css';

document.querySelector('#app').innerHTML = `
<canvas id="game" aria-label="3D game view. Drag to look around."></canvas><div class="vignette"></div><div class="damage" id="damage"></div>
<div class="hud" id="hud">
 <div class="top"><div><div class="brand"><div class="brand-icon">↗</div><div><div class="brand-name">AI<span>VM</span></div><div class="brand-sub">AI VELOCITY MOBILE</div></div></div><div class="mission"><div class="eyebrow" id="mission-number">MISSION 01 / 03</div><h2 id="mission-title">FIRST DELIVERY</h2><p id="objective">Get to the package. Follow the green marker.</p><div class="count" id="mission-count"></div></div></div><div class="right-hud"><div class="heat"><small>HEAT</small><strong id="heat">☆☆☆</strong></div><div><div class="map-wrap"><canvas id="map" width="200" height="200"></canvas><div class="map-label">N ↑</div></div><div class="map-note">● YOU &nbsp; ◆ OBJECTIVE</div></div></div></div>
 <div class="navigation"><span id="direction-arrow">▲</span><span id="distance">0 M</span><small>OBJECTIVE</small></div><div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i></div><div class="target-name" id="target-name"></div>
 <div class="bottom-left"><div class="status"><div class="status-top"><span class="status-label">HEALTH</span><span class="health-num" id="health">100</span></div><div class="health-track"><div class="health-fill" id="health-fill"></div></div><div class="weapon-name" id="weapon">PISTOL</div><div class="weapon-sub" id="weapon-sub">AUTO-AIM ENABLED</div></div><div class="ammo" id="ammo">12 <small>/ ∞</small></div></div>
 <div class="joystick" id="joystick" aria-label="Movement joystick"><div class="stick" id="stick"></div></div>
 <div class="bottom-right"><button class="action" id="sprint-btn" aria-label="Sprint"><span class="ico">»</span><span class="lbl">SPRINT</span></button><button class="action" id="weapon-btn" aria-label="Switch weapon"><span class="ico">⇄</span><span class="lbl">WEAPON</span></button><button class="action" id="reload-btn" aria-label="Reload"><span class="ico">↻</span><span class="lbl">RELOAD</span></button><button class="action" id="interact-btn" aria-label="Enter or exit vehicle"><span class="ico">↗</span><span class="lbl">RIDE</span></button><button class="action fire" id="fire-btn" aria-label="Fire weapon"><span class="ico fire-icon"></span><span class="lbl">FIRE</span></button></div>
 <div class="desktop-hint">WASD MOVE &nbsp; / &nbsp; DRAG TO LOOK &nbsp; / &nbsp; SPACE FIRE &nbsp; / &nbsp; E RIDE &nbsp; / &nbsp; SHIFT SPRINT</div><div class="interaction" id="interaction"></div><div class="toast" id="toast" role="status"></div>
</div>
<div class="screen" id="intro"><div class="panel"><div class="panel-kicker">AI VELOCITY MOBILE · CITY ACTION PROTOTYPE</div><h1>AI<span>VM.</span></h1><div class="lead">A city full of opportunities. A delivery gone wrong. Three jobs stand between you and a clean getaway.</div><div class="feature-row"><span>THIRD-PERSON ACTION</span><span>BIKE + CAR</span><span>03 MISSIONS</span></div><button class="primary" id="start">ENTER THE CITY &nbsp; ↗</button><p class="panel-foot"><b>Mobile:</b> Move with the left stick. Drag the open screen to look. Hold FIRE near a visible enemy; tap RIDE near a vehicle. In a vehicle, push up/down to accelerate and left/right to steer.<br><b>Desktop:</b> WASD to move or drive, drag to look, SPACE to fire, E to ride, Q to switch, R to reload, SHIFT to sprint.</p></div></div>
<div class="screen hidden" id="end"><div class="panel"><div class="panel-kicker" id="end-kicker">MISSION REPORT</div><h1 id="end-title">RUN <span>COMPLETE.</span></h1><div class="lead" id="end-text"></div><div class="feature-row"><span>THANKS FOR PLAYING</span><span>PROTOTYPE BUILD</span></div><button class="primary" id="restart">PLAY AGAIN &nbsp; ↗</button></div></div>`;

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const scene = new THREE.Scene();scene.background=new THREE.Color(0xb1c3c0);scene.fog=new THREE.Fog(0xb1c3c0,70,180);
const camera=new THREE.PerspectiveCamera(58,1,.1,280);
scene.add(new THREE.HemisphereLight(0xe2f3f1,0x51585a,2));
const sun=new THREE.DirectionalLight(0xffdfb5,2.5);sun.position.set(-35,75,30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:160});sun.shadow.bias=-.0005;scene.add(sun,sun.target);
const world=createWorld(scene);
const player=world.person(0x819d4d);scene.add(player);player.position.set(0,0,13);
const vehicles=[world.vehicle('car',4,10),world.vehicle('bike',-4,10)];
const lime=new THREE.MeshBasicMaterial({color:0xcaff5b});
const marker=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.1,8,40),lime);ring.rotation.x=Math.PI/2;ring.position.y=.22;marker.add(ring);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,22,8),new THREE.MeshBasicMaterial({color:0xc9fc51,transparent:true,opacity:.7,depthWrite:false}));beam.position.y=11;marker.add(beam);
const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.8),lime);diamond.position.y=4;marker.add(diamond);scene.add(marker);

const weapons=[{name:'PISTOL',cap:12,rate:.32,damage:34,range:28},{name:'ASSAULT RIFLE',cap:30,rate:.12,damage:18,range:34},{name:'SHOTGUN',cap:6,rate:.7,damage:68,range:19}];
const ammo=weapons.map(w=>w.cap),enemies=[],shots=[],keys={};
let vehicle=null, vehicleSpeed=0, health=100, mission=0, phase=0, kills=0, heat=0, started=false, ended=false, fireHeld=false, sprintHeld=false;
let lastShot=-1,weaponIndex=0,reloadEnd=0,toastTimer=0,gameTime=0,cameraYaw=0,lookPitch=0, joy={x:0,y:0}, audio=null, walkCycle=0;
const objectives=[{x:0,z:-56},{x:56,z:-28},{x:-28,z:-28},{x:28,z:28},{x:-56,z:28}];let target=objectives[0];
const raycaster=new THREE.Raycaster(), cameraDesired=new THREE.Vector3(), cameraFocus=new THREE.Vector3();

function sound(kind){
  if(!audio)return; const now=audio.currentTime, osc=audio.createOscillator(), gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);
  if(kind==='shot'){osc.type='sawtooth';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(45,now+.09);gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+.1);osc.start(now);osc.stop(now+.1)}
  else {osc.type='sine';osc.frequency.setValueAtTime(kind==='success'?660:330,now);osc.frequency.exponentialRampToValueAtTime(kind==='success'?990:180,now+.16);gain.gain.setValueAtTime(.065,now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);osc.start(now);osc.stop(now+.2)}
}
function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600)}
function setObjective(title,desc,number,count=''){ $('mission-title').textContent=title;$('objective').textContent=desc;$('mission-number').textContent=`MISSION 0${number} / 03`;$('mission-count').textContent=count; }
function spawnEnemy(x,z){const mesh=world.person(0xad594b);mesh.position.set(x,0,z);scene.add(mesh);enemies.push({mesh,hp:100,cooldown:1.2+Math.random(),alive:true,walk:Math.random()*4,stuck:0});}
function restoreHealth(){health=Math.min(100,health+35)}
function updateMission(){
 const pos=vehicle?vehicle.mesh.position:player.position,dist=Math.hypot(pos.x-target.x,pos.z-target.z);
 if(mission===0&&phase===0&&dist<4.5){phase=1;target=objectives[1];setObjective('FIRST DELIVERY','Package secured. Deliver it to the green marker.',1);showToast('PACKAGE SECURED  ·  HEAD TO THE DROP');sound('success')}
 else if(mission===0&&phase===1&&dist<5){mission=1;phase=0;target=objectives[2];heat=1;restoreHealth();spawnEnemy(-28,-33);spawnEnemy(-33,-28);spawnEnemy(-23,-28);spawnEnemy(-28,-23);setObjective('THE AMBUSH','Reach the stolen case. Eliminate the guards.',2,'GUARDS DOWN  0 / 4');showToast('MISSION COMPLETE  ·  HEALTH RESTORED');sound('success')}
 else if(mission===1&&phase===0&&kills>=4){phase=1;setObjective('THE AMBUSH','Area clear. Collect the case at the marker.',2,'GUARDS DOWN  4 / 4');showToast('AREA CLEAR  ·  COLLECT THE CASE');sound('success')}
 else if(mission===1&&phase===1&&dist<4.5){phase=2;target=objectives[3];setObjective('THE AMBUSH','Case secured. Take it to the contact.',2);showToast('CASE SECURED  ·  GET TO THE CONTACT');sound('success')}
 else if(mission===1&&phase===2&&dist<5){mission=2;phase=0;target=objectives[4];heat=2;restoreHealth();spawnEnemy(25,20);spawnEnemy(31,20);spawnEnemy(28,37);setObjective('HOT RUN','Get to the safe house. Expect resistance.',3);showToast('FINAL JOB  ·  HEALTH RESTORED');sound('success')}
 else if(mission===2&&dist<5){finish(true)}
 marker.position.set(target.x,0,target.z);$('heat').textContent='★'.repeat(heat)+'☆'.repeat(3-heat);
 const dx=target.x-pos.x,dz=target.z-pos.z;const angle=objectiveDirection(dx,dz,cameraYaw);$('direction-arrow').style.transform=`rotate(${angle}rad)`;$('distance').textContent=`${Math.round(Math.hypot(dx,dz))} M`;
}
function finish(won){if(ended)return;ended=true;fireHeld=false;$('end-kicker').textContent=won?'ALL THREE MISSIONS COMPLETE':'MISSION FAILED';$('end-title').innerHTML=won?'RUN <span>COMPLETE.</span>':'DOWN <span>OUT.</span>';$('end-text').textContent=won?'You made the delivery, recovered the case, and escaped the city. Nice work.':'The city got the better of you this time. Get back in and try a different route.';$('end').classList.remove('hidden')}
function switchWeapon(){if(!started||ended||vehicle)return;weaponIndex=(weaponIndex+1)%weapons.length;reloadEnd=0;showToast(weapons[weaponIndex].name+' EQUIPPED')}
function reload(){if(!started||ended||vehicle||reloadEnd||ammo[weaponIndex]===weapons[weaponIndex].cap)return;reloadEnd=gameTime+1;showToast('RELOADING')}
function interact(){
 if(!started||ended)return;
 if(vehicle){const p=vehicle.mesh.position;const candidates=[[3,0],[-3,0],[0,3],[0,-3]];const exit=candidates.find(([x,z])=>!world.blocks.some(b=>Math.abs(p.x+x-b.x)<b.halfX&&Math.abs(p.z+z-b.z)<b.halfZ));if(!exit){showToast('NO ROOM TO EXIT HERE');return}player.position.set(p.x+exit[0],0,p.z+exit[1]);player.visible=true;vehicle=null;vehicleSpeed=0;showToast('ON FOOT');return}
 let near=null,min=5;for(const v of vehicles){const d=player.position.distanceTo(v.mesh.position);if(d<min){min=d;near=v}}
 if(near){vehicle=near;vehicleSpeed=0;player.visible=false;showToast('PUSH UP TO DRIVE  ·  LEFT / RIGHT TO STEER')}else showToast('MOVE CLOSER TO A VEHICLE')
}
function nearestTarget(){let best=null,bestDist=weapons[weaponIndex].range;for(const e of enemies){if(!e.alive)continue;const d=player.position.distanceTo(e.mesh.position);if(d<bestDist&&hasLineOfSight(player.position,e.mesh.position,world.blocks)){best=e;bestDist=d}}return best}
function addTracer(from,to,color){const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));scene.add(line);shots.push({line,until:gameTime+.09})}
function shoot(){
 const w=weapons[weaponIndex];if(vehicle||reloadEnd||gameTime-lastShot<w.rate)return;if(ammo[weaponIndex]<=0){reload();return}lastShot=gameTime;ammo[weaponIndex]--;sound('shot');
 const enemy=nearestTarget(),from=player.position.clone().add(new THREE.Vector3(0,2,0));let to;
 if(enemy){to=enemy.mesh.position.clone().add(new THREE.Vector3(0,1.8,0));player.rotation.y=Math.atan2(from.x-to.x,from.z-to.z);enemy.hp-=w.damage;enemy.mesh.userData.torso.material.emissive.setHex(0x8d2b18);setTimeout(()=>enemy.mesh.userData.torso.material.emissive.setHex(0),100);if(enemy.hp<=0){enemy.alive=false;scene.remove(enemy.mesh);if(mission===1&&phase===0){kills++;$('mission-count').textContent=`GUARDS DOWN  ${Math.min(kills,4)} / 4`}}}
 else {const direction=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y);to=from.clone().add(direction.multiplyScalar(14))}addTracer(from,to,0xf8ffb0);
 $('crosshair').classList.remove('shot');void $('crosshair').offsetWidth;$('crosshair').classList.add('shot');
}
function hit(amount){if(ended)return;health=Math.max(0,health-amount);$('damage').classList.add('hit');setTimeout(()=>$('damage').classList.remove('hit'),180);if(health<=0)finish(false)}
function animateWalk(person,amount,time){const a=Math.sin(time*9)*.65*amount;person.userData.leftLeg.rotation.x=a;person.userData.rightLeg.rotation.x=-a;person.userData.leftArm.rotation.x=-a*.7;person.userData.rightArm.rotation.x=a*.25;}
function updateEnemies(dt){
 const pos=vehicle?vehicle.mesh.position:player.position;
 for(const e of enemies){if(!e.alive)continue;const d=e.mesh.position.distanceTo(pos);if(d>=44)continue;e.mesh.rotation.y=Math.atan2(e.mesh.position.x-pos.x,e.mesh.position.z-pos.z);let moving=0;
 if(d>11&&d<40){const dx=(pos.x-e.mesh.position.x)/d,dz=(pos.z-e.mesh.position.z)/d;moving=movePosition(e.mesh.position,dx*dt*2.6,dz*dt*2.6,world.blocks);if(moving<dt*.4){e.stuck+=dt;const side=e.stuck>2?-1:1;movePosition(e.mesh.position,-dz*dt*2.6*side,dx*dt*2.6*side,world.blocks);if(e.stuck>4)e.stuck=0}else e.stuck=0;e.walk+=dt;animateWalk(e.mesh,1,e.walk)}else animateWalk(e.mesh,0,e.walk);
 e.cooldown-=dt;if(d<25&&e.cooldown<=0&&hasLineOfSight(e.mesh.position,pos,world.blocks)){e.cooldown=1.7+Math.random();hit(vehicle?3:5);addTracer(e.mesh.position.clone().add(new THREE.Vector3(0,2,0)),pos.clone().add(new THREE.Vector3(0,1.5,0)),0xff866d)}
 }
}
function updateMap(){
 const ctx=$('map').getContext('2d'),w=200;ctx.clearRect(0,0,w,w);ctx.fillStyle='#1c2b29';ctx.fillRect(0,0,w,w);const pos=vehicle?vehicle.mesh.position:player.position,scale=2.5;ctx.save();ctx.translate(w/2,w/2);
 for(let i=-84;i<=84;i+=28){ctx.fillStyle='#465451';ctx.fillRect((i-pos.x)*scale-16,-100,32,200);ctx.fillRect(-100,(i-pos.z)*scale-16,200,32)}
 ctx.fillStyle='#c9fc51';let tx=(target.x-pos.x)*scale,tz=(target.z-pos.z)*scale;const length=Math.hypot(tx,tz);if(length>83){tx=tx/length*83;tz=tz/length*83}ctx.save();ctx.translate(tx,tz);ctx.rotate(Math.PI/4);ctx.fillRect(-6,-6,12,12);ctx.restore();
 ctx.fillStyle='#ff806d';for(const e of enemies){if(!e.alive)continue;const x=(e.mesh.position.x-pos.x)*scale,z=(e.mesh.position.z-pos.z)*scale;if(Math.hypot(x,z)<90){ctx.beginPath();ctx.arc(x,z,3,0,Math.PI*2);ctx.fill()}}
 ctx.save();ctx.rotate(-cameraYaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(e.code==='KeyE')interact();if(e.code==='KeyQ')switchWeapon();if(e.code==='KeyR')reload();if(e.code==='Space')fireHeld=true});
window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')fireHeld=false});
window.addEventListener('blur',()=>{fireHeld=false;sprintHeld=false;Object.keys(keys).forEach(k=>keys[k]=false);joy={x:0,y:0};$('stick').style.transform=''});
$('start').onclick=()=>{started=true;$('intro').classList.add('hidden');try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume()}catch{}showToast('FOLLOW THE GREEN MARKER')};$('restart').onclick=()=>location.reload();$('interact-btn').onclick=interact;$('weapon-btn').onclick=switchWeapon;$('reload-btn').onclick=reload;
function holdButton(el,on,off){el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);on();el.classList.add('active')});const end=()=>{off();el.classList.remove('active')};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end)}
holdButton($('fire-btn'),()=>fireHeld=true,()=>fireHeld=false);holdButton($('sprint-btn'),()=>sprintHeld=true,()=>sprintHeld=false);
const joystick=$('joystick');function moveStick(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=e.clientX-cx,y=e.clientY-cy;const max=r.width*.32,d=Math.hypot(x,y);if(d>max){x=x/d*max;y=y/d*max}joy={x:x/max,y:y/max};$('stick').style.transform=`translate(${x}px,${y}px)`}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();joystick.setPointerCapture(e.pointerId);moveStick(e)});joystick.addEventListener('pointermove',e=>{if(joystick.hasPointerCapture(e.pointerId))moveStick(e)});function resetStick(){joy={x:0,y:0};$('stick').style.transform=''}joystick.addEventListener('pointerup',resetStick);joystick.addEventListener('pointercancel',resetStick);joystick.addEventListener('lostpointercapture',resetStick);
let lookPointer=null,lastLookX=0,lastLookY=0;
canvas.addEventListener('pointerdown',e=>{if(!started||ended||lookPointer!==null)return;lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;cameraYaw-=(e.clientX-lastLookX)*.006;lookPitch=THREE.MathUtils.clamp(lookPitch+(e.clientY-lastLookY)*.004,-.25,.35);lastLookX=e.clientX;lastLookY=e.clientY});
function endLook(e){if(e.pointerId===lookPointer)lookPointer=null}canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);canvas.addEventListener('lostpointercapture',endLook);
const clock=new THREE.Clock();let mapTick=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
 if(started&&!ended){gameTime+=dt;
  let inputX=joy.x+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),inputZ=joy.y+(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const len=Math.hypot(inputX,inputZ);if(len>1){inputX/=len;inputZ/=len}
  if(vehicle){
   const acceleration=-inputZ;vehicleSpeed+=acceleration*(vehicle.type==='bike'?18:14)*dt;vehicleSpeed*=Math.exp(-(Math.abs(acceleration)>.1?.8:2.5)*dt);vehicleSpeed=THREE.MathUtils.clamp(vehicleSpeed,-6,vehicle.type==='bike'?19:15);
   if(Math.abs(vehicleSpeed)>.25)vehicle.mesh.rotation.y-=inputX*dt*1.65*Math.min(Math.abs(vehicleSpeed)/5,1)*(vehicleSpeed>=0?1:-1);
   const dx=-Math.sin(vehicle.mesh.rotation.y)*vehicleSpeed*dt,dz=-Math.cos(vehicle.mesh.rotation.y)*vehicleSpeed*dt;
   if(movePosition(vehicle.mesh.position,dx,dz,world.blocks,.6)<Math.hypot(dx,dz)*.4)vehicleSpeed*=.4;
   for(const wheel of vehicle.wheels)wheel.rotation.x-=vehicleSpeed*dt*.8;player.position.copy(vehicle.mesh.position);
   if(lookPointer===null&&Math.abs(vehicleSpeed)>1){let delta=Math.atan2(Math.sin(vehicle.mesh.rotation.y-cameraYaw),Math.cos(vehicle.mesh.rotation.y-cameraYaw));cameraYaw+=delta*Math.min(1,dt*2)}
  }else{
   const move=relativeMovement(inputX,inputZ,cameraYaw);if(len>.08){const speed=(sprintHeld||keys.ShiftLeft||keys.ShiftRight)?10:6.3;movePosition(player.position,move.x*speed*dt,move.z*speed*dt,world.blocks);if(!fireHeld)player.rotation.y=Math.atan2(-move.x,-move.z);walkCycle+=dt*(speed/6.3)}animateWalk(player,Math.min(len,1),walkCycle);
  }
  if(fireHeld)shoot();if(reloadEnd&&gameTime>=reloadEnd){ammo[weaponIndex]=weapons[weaponIndex].cap;reloadEnd=0}updateEnemies(dt);updateMission();
  for(let i=shots.length-1;i>=0;i--)if(shots[i].until<gameTime){scene.remove(shots[i].line);shots[i].line.geometry.dispose();shots[i].line.material.dispose();shots.splice(i,1)}
  $('health').textContent=Math.ceil(health);$('health-fill').style.width=health+'%';$('health-fill').style.background=health<30?'#ff6b59':'#c9fc51';$('weapon').textContent=vehicle?vehicle.type.toUpperCase():weapons[weaponIndex].name;$('weapon-sub').textContent=vehicle?`${Math.round(Math.abs(vehicleSpeed)*5)} KM/H · RIDE TO EXIT`:reloadEnd?'RELOADING...':'AUTO-AIM · VISIBLE ENEMIES';$('ammo').innerHTML=vehicle?'—':`${ammo[weaponIndex]} <small>/ ∞</small>`;
  const near=vehicle||vehicles.some(v=>player.position.distanceTo(v.mesh.position)<5);$('interaction').style.display=near?'block':'none';$('interaction').textContent=vehicle?'TAP RIDE TO EXIT VEHICLE':'TAP RIDE TO ENTER VEHICLE';
  const locked=!vehicle&&nearestTarget();$('crosshair').classList.toggle('locked',!!locked);$('target-name').textContent=locked?'TARGET IN RANGE':'';
  if((mapTick+=dt)>.1){updateMap();mapTick=0}
 }
 const pos=vehicle?vehicle.mesh.position:player.position,dist=vehicle?11:8,height=(vehicle?6.5:5.2)+lookPitch*7;
 cameraFocus.set(pos.x,vehicle?1.7:2.2,pos.z);cameraDesired.set(pos.x+Math.sin(cameraYaw)*dist,height,pos.z+Math.cos(cameraYaw)*dist);
 const cameraRay=cameraDesired.clone().sub(cameraFocus),rayLength=cameraRay.length();raycaster.set(cameraFocus,cameraRay.normalize());raycaster.far=rayLength;const intersections=raycaster.intersectObjects(world.buildingMeshes,false);if(intersections.length)cameraDesired.copy(cameraFocus).addScaledVector(cameraRay,Math.max(.7,intersections[0].distance-.5));
 camera.position.lerp(cameraDesired,1-Math.exp(-dt*9));camera.lookAt(cameraFocus);sun.position.set(pos.x-35,75,pos.z+30);sun.target.position.set(pos.x,0,pos.z);diamond.rotation.y+=dt;diamond.position.y=4+Math.sin(performance.now()*.003)*.3;ring.rotation.z+=dt*.25;renderer.render(scene,camera);
}
// Test-only controls let automated browser checks exercise the real mission state machine.
if(import.meta.env.DEV) window.__aivmTest={
  warp(x,z){const p=vehicle?vehicle.mesh.position:player.position;p.set(x,0,z);if(vehicle)player.position.copy(p);vehicleSpeed=0},
  state(){return {mission,phase,kills,health,vehicle:vehicle?.type||null,weapon:weapons[weaponIndex].name,ammo:ammo[weaponIndex],ended}},
  health(value){health=value}
};
marker.position.set(target.x,0,target.z);camera.position.set(0,5.2,21);updateMap();animate();
