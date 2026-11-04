import * as THREE from 'three';
import { createWorld } from './world.js';
import { createModels, animatePerson, animateAnimal, setHitFlash, updateWeapon } from './models.js';
import { selectReticleTarget } from './combat.js';
import { roadRoute } from './gps.js';
import { drawFullMap } from './full-map.js';
import { loadPreferences, savePreferences } from './preferences.js';
import { advancePursuit } from './pursuit.js';
import { turnTowards } from './locomotion.js';
import { movePosition, hasLineOfSight, relativeMovement, objectiveDirection } from './navigation.js';
import './style.css';

document.querySelector('#app').innerHTML = `
<canvas id="game" aria-label="3D game view. Drag to look around."></canvas><div class="vignette"></div><div class="damage" id="damage"></div>
<div class="hud" id="hud">
 <div class="top"><div><div class="brand"><div class="brand-icon">↗</div><div><div class="brand-name">AI<span>VM</span></div><div class="brand-sub">AI VELOCITY MOBILE</div></div></div><div class="mission"><div class="eyebrow" id="mission-number">MISSION 01 / 03</div><h2 id="mission-title">FIRST DELIVERY</h2><p id="objective">Take the bike and pick up the package.</p><div class="count" id="mission-count"></div></div></div><div class="right-hud"><div class="heat"><small>HEAT</small><strong id="heat">☆☆☆</strong></div><div><button class="map-wrap" id="open-map" aria-label="Open full city map" aria-haspopup="dialog"><canvas id="map" width="200" height="200"></canvas><span class="map-label">N ↑</span><span class="map-tap">TAP MAP</span></button><div class="map-note">● YOU &nbsp; ◆ GOAL &nbsp; — GPS</div><button class="settings-button" id="settings-button" aria-expanded="false" aria-controls="settings-panel">⚙ SETTINGS</button><div class="settings-panel" id="settings-panel" hidden><div class="settings-row"><button id="sound-toggle" class="sound-toggle" aria-label="Toggle sound" aria-pressed="true">SOUND ON</button><button id="assist-toggle" class="sound-toggle" aria-label="Toggle aim assist" aria-pressed="true">ASSIST ON</button></div><label class="sensitivity">LOOK <input id="sensitivity" type="range" min="1" max="10" value="5" aria-label="Look sensitivity"></label></div></div></div></div>
 <div class="navigation"><span id="direction-arrow">▲</span><span id="distance">0 M</span><small>OBJECTIVE</small></div><div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i></div><div class="target-name" id="target-name"></div><div class="hitmarker" id="hitmarker">×</div>
 <div class="bottom-left"><div class="status"><div class="status-top"><span class="status-label">HEALTH</span><span class="health-num" id="health">100</span></div><div class="health-track"><div class="health-fill" id="health-fill"></div></div><div class="weapon-name" id="weapon">PISTOL</div><div class="weapon-sub" id="weapon-sub">AIM ASSIST ON</div><div class="reload-track" id="reload-track" role="progressbar" aria-label="Reload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="reload-fill"></div></div></div><div class="ammo" id="ammo">12 <small>/ ∞</small></div></div>
 <button class="action left-fire" id="left-fire-btn" aria-label="Fire with left hand"><span class="ico fire-icon"></span><span class="lbl">FIRE</span></button>
 <div class="joystick" id="joystick" aria-label="Movement joystick"><div class="stick" id="stick"></div></div>
 <div class="bottom-right"><button class="action" id="sprint-btn" aria-label="Sprint"><span class="ico">»</span><span class="lbl">SPRINT</span></button><button class="action" id="aim-btn" aria-label="Toggle aim" aria-pressed="false"><span class="ico">◎</span><span class="lbl">AIM</span></button><button class="action" id="weapon-btn" aria-label="Choose weapon" aria-expanded="false"><span class="ico">⇄</span><span class="lbl">WEAPON</span></button><button class="action" id="reload-btn" aria-label="Reload"><span class="ico">↻</span><span class="lbl">RELOAD</span></button><button class="action" id="interact-btn" aria-label="Enter or exit vehicle"><span class="ico">↗</span><span class="lbl">RIDE</span></button><button class="action fire" id="fire-btn" aria-label="Fire weapon"><span class="ico fire-icon"></span><span class="lbl">FIRE</span></button><button class="action drive-control" id="reverse-btn" aria-label="Brake or reverse"><span class="ico">▼</span><span class="lbl">BRAKE</span></button><button class="action drive-control" id="accelerate-btn" aria-label="Accelerate"><span class="ico">▲</span><span class="lbl">GAS</span></button></div><div class="weapon-menu" id="weapon-menu" hidden aria-label="Choose weapon"></div>
 <div class="desktop-hint">WASD MOVE &nbsp; / &nbsp; DRAG TO LOOK &nbsp; / &nbsp; SPACE FIRE &nbsp; / &nbsp; V AIM &nbsp; / &nbsp; E RIDE</div><div class="interaction" id="interaction"></div><div class="toast" id="toast" role="status"></div>
</div>
<div class="map-overlay" id="map-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="full-map-title">
 <div class="map-panel"><div class="map-heading"><div><span class="map-kicker">AIVM · CITY GUIDE</span><h2 id="full-map-title">FULL CITY MAP</h2></div><button class="map-close" id="close-map" aria-label="Close map">✕ <span>CLOSE</span></button></div>
 <div class="map-body"><div class="full-map-wrap"><canvas id="full-map" width="630" height="630" aria-label="North-up map showing the complete city streets, buildings and current objective"></canvas><span class="full-map-north">N ↑</span></div>
 <div class="map-legend"><strong>LEGEND</strong><span><b class="legend-you">▲</b> YOU</span><span><b class="legend-goal">◆</b> OBJECTIVE</span><span><b class="legend-route">━</b> GPS ROUTE</span><span><b class="legend-enemy">●</b> ENEMY</span><span><b class="legend-vehicle">■</b> VEHICLE</span><small>GAME PAUSED<br>North is up.</small></div></div></div>
</div>
<div class="screen" id="intro"><div class="panel"><div class="panel-kicker">AI VELOCITY MOBILE · CITY ACTION PROTOTYPE</div><h1>AI<span>VM.</span></h1><div class="lead">A city full of opportunities. A delivery gone wrong. Three jobs stand between you and a clean getaway.</div><div class="feature-row"><span>THIRD-PERSON ACTION</span><span>BIKE + CAR</span><span>03 MISSIONS</span></div><button class="primary" id="start">ENTER THE CITY &nbsp; ↗</button><p class="panel-foot"><b>Mobile:</b> Move with the left stick. Drag the right side to look. Hold and drag the right FIRE button to aim while shooting; the left FIRE button also shoots. Tap AIM to zoom and RIDE near a vehicle. Tap the minimap to see the whole city. Tap SETTINGS for sound, aim assist and look sensitivity. In a vehicle, steer with the stick and hold GAS or BRAKE; the stick also supports driving.<br><b>Desktop:</b> WASD to move or drive, drag to look, SPACE to fire, V to aim, E to ride, Q to switch, R to reload, M for map, SHIFT to sprint.</p></div></div>
<div class="screen hidden" id="end"><div class="panel"><div class="panel-kicker" id="end-kicker">MISSION REPORT</div><h1 id="end-title">RUN <span>COMPLETE.</span></h1><div class="lead" id="end-text"></div><div class="feature-row"><span>THANKS FOR PLAYING</span><span>PROTOTYPE BUILD</span></div><button class="primary" id="retry">RETRY MISSION &nbsp; ↗</button><button class="secondary" id="restart">START OVER</button></div></div>`;

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const scene = new THREE.Scene();
// A warm coastal sky and haze give the district an afternoon identity.
const sky=document.createElement('canvas');sky.width=16;sky.height=256;const skyCtx=sky.getContext('2d');const skyGradient=skyCtx.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#78afc7');skyGradient.addColorStop(.5,'#bed0c7');skyGradient.addColorStop(1,'#f4c899');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,16,256);const skyTexture=new THREE.CanvasTexture(sky);skyTexture.colorSpace=THREE.SRGBColorSpace;scene.background=skyTexture;scene.fog=new THREE.Fog(0xd1c7ac,85,185);
const camera=new THREE.PerspectiveCamera(58,1,.1,280);
scene.add(new THREE.HemisphereLight(0xd8ebf3,0x786b56,1.9));
const sun=new THREE.DirectionalLight(0xffd3a1,2.5);sun.position.set(-35,75,30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:160});sun.shadow.bias=-.0005;scene.add(sun,sun.target);
const world=createWorld(scene), models=createModels(renderer);
const player=world.person(0x819d4d);scene.add(player);player.position.set(0,0,13);models.person(player,'player');
const vehicles=[world.vehicle('car',4,10),world.vehicle('bike',-4,10)];vehicles.forEach(v=>models.vehicle(v));
// Lightweight ambient traffic and pedestrians bring the district to life.
const traffic=[{x:3,z:-28,dir:-1},{x:31,z:46,dir:-1},{x:-31,z:-55,dir:1},{x:59,z:15,dir:1}].map(t=>{const car=world.vehicle('car',t.x,t.z);car.mesh.rotation.y=t.dir>0?Math.PI:0;models.vehicle(car);return {...t,car}});
const civilians=[{x:7.1,z:-13,dir:-1},{x:-20.9,z:25,dir:1},{x:35.1,z:-38,dir:1},{x:-48.9,z:45,dir:-1}].map((c,i)=>{const mesh=world.person(0x718b94);mesh.position.set(c.x,0,c.z);scene.add(mesh);models.person(mesh,['civilian','civilian-female','civilian-warm','civilian-dark'][i]);return {...c,mesh,walk:i}});
// Ambient animals stay on the sidewalk, wander independently and flee nearby gunfire.
const animals=[{type:'dog',x:7.2,z:-6,dir:-1,lo:-19,hi:-3},{type:'cat',x:-7.4,z:4,dir:-1,lo:-9,hi:9},{type:'dog',x:35.3,z:-40,dir:1,lo:-48,hi:-31},{type:'cat',x:-48.7,z:42,dir:-1,lo:34,hi:50}].map((a,i)=>{const mesh=new THREE.Group();mesh.position.set(a.x,0,a.z);scene.add(mesh);models.animal(mesh,a.type);return {...a,mesh,clock:i*2}});
function pigeon(x,z){
 const g=new THREE.Group(),feather=new THREE.MeshStandardMaterial({color:0x8c9997,roughness:.9}),dark=new THREE.MeshStandardMaterial({color:0x4c5b5c}),beak=new THREE.MeshStandardMaterial({color:0xb29b70});
 const body=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),feather);body.scale.set(.8,.7,1.35);body.position.y=.33;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.13,7,6),dark);head.position.set(0,.49,-.24);g.add(head);const bill=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,5),beak);bill.rotation.x=-Math.PI/2;bill.position.set(0,.46,-.4);g.add(bill);g.position.set(x,0,z);scene.add(g);return g;
}
const birds=[{mesh:pigeon(7.4,-4),start:-4,dir:1},{mesh:pigeon(-7.5,7),start:7,dir:-1}];
function updateAnimals(dt,pos){
 for(const animal of animals){const distance=animal.mesh.position.distanceTo(pos),flee=fireHeld&&distance<20;animal.clock+=dt;const moving=flee||animal.clock%9<6;const p=animal.mesh.position;
  if(flee)animal.dir=p.z<pos.z?-1:1;if(p.z<animal.lo)animal.dir=1;if(p.z>animal.hi)animal.dir=-1;
  if(moving)p.z+=animal.dir*(flee?2.8:1.05)*dt;animal.mesh.rotation.y=animal.dir>0?0:Math.PI;animateAnimal(animal.mesh,moving,dt);
 }
 for(const bird of birds){const p=bird.mesh.position,alert=fireHeld&&p.distanceTo(pos)<18;if(Math.abs(p.z-bird.start)>2)bird.dir*=-1;p.z+=bird.dir*(alert?1.8:.3)*dt;bird.mesh.rotation.y=bird.dir>0?Math.PI:0;}
}
function updateCity(dt,playerPos){
 for(const t of traffic){const p=t.car.mesh.position;const near=Math.hypot(p.x-playerPos.x,p.z-playerPos.z)<9;const speed=near?0:5;p.z+=t.dir*speed*dt;if(p.z>99)p.z=-99;if(p.z< -99)p.z=99;for(const wheel of t.car.wheels)wheel.rotation.x-=speed*dt*.8}
 for(const c of civilians){const p=c.mesh.position,close=fireHeld&&Math.hypot(p.x-playerPos.x,p.z-playerPos.z)<22;if(close)c.dir=p.z<playerPos.z?-1:1;p.z+=c.dir*(close?4:1.5)*dt;if(p.z>90){p.z=90;c.dir=-1}if(p.z< -90){p.z=-90;c.dir=1}c.mesh.rotation.y=c.dir>0?Math.PI:0;c.walk+=dt;animateWalk(c.mesh,close?1:.5,c.walk,dt)}
}
const lime=new THREE.MeshBasicMaterial({color:0xcaff5b});
const marker=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.1,8,40),lime);ring.rotation.x=Math.PI/2;ring.position.y=.22;marker.add(ring);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,22,8),new THREE.MeshBasicMaterial({color:0xc9fc51,transparent:true,opacity:.7,depthWrite:false}));beam.position.y=11;marker.add(beam);
const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.8),lime);diamond.position.y=4;marker.add(diamond);scene.add(marker);

const weapons=[{name:'PISTOL',cap:12,rate:.32,damage:34,range:28},{name:'ASSAULT RIFLE',cap:30,rate:.12,damage:18,range:34},{name:'SHOTGUN',cap:6,rate:.7,damage:68,range:19}];
const ammo=weapons.map(w=>w.cap),enemies=[],shots=[],keys={};
let storage=null;try{storage=window.localStorage}catch{}const preferences=loadPreferences(storage);
let mapOpen=false, rival=null, dropKills=0;
let vehicle=null, vehicleSpeed=0, health=100, mission=0, phase=0, kills=0, heat=0, started=false, ended=false, fireHeld=false, sprintHeld=false, aiming=false, aimAssist=preferences.aimAssist, lookSensitivity=preferences.lookSensitivity;
const firePointers=new Set(),inputResets=[];let keyboardFire=false,gasHeld=false,brakeHeld=false,weaponMenuOpen=false;
let lastShot=-1,lastReinforcement=0,weaponIndex=0,reloadEnd=0,toastTimer=0,gameTime=0,cameraYaw=0,lookPitch=0, joy={x:0,y:0}, audio=null, muted=preferences.muted, walkCycle=0;
const objectives=[{x:0,z:-56},{x:56,z:-28},{x:-28,z:-28},{x:28,z:28},{x:-56,z:28}];let target=objectives[0], currentRoute=[], routeTarget=null, nextRouteUpdate=0;
const raycaster=new THREE.Raycaster(), cameraDesired=new THREE.Vector3(), cameraFocus=new THREE.Vector3();

const audioBuffers={};
async function prepareAudio(){
 if(!audio)return;
 await Promise.all(['pistol','rifle','shotgun','reload'].map(async name=>{try{const response=await fetch(`${import.meta.env.BASE_URL}assets/audio/${name}.mp3`);if(response.ok)audioBuffers[name]=await audio.decodeAudioData(await response.arrayBuffer())}catch{}}));
}
function sound(kind){
 if(!audio||muted)return;const now=audio.currentTime;
 const key=kind==='shot'?['pistol','rifle','shotgun'][weaponIndex]:kind==='reload'?'reload':null;
 if(key&&audioBuffers[key]){const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=audioBuffers[key];gain.gain.value=kind==='shot'?.25:.2;source.connect(gain);gain.connect(audio.destination);source.start();return}
 const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);
 if(kind==='shot'){osc.type='sawtooth';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(45,now+.09);gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+.1);osc.start(now);osc.stop(now+.1)}
 else {osc.type='sine';osc.frequency.setValueAtTime(kind==='success'?660:330,now);osc.frequency.exponentialRampToValueAtTime(kind==='success'?990:180,now+.16);gain.gain.setValueAtTime(.065,now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);osc.start(now);osc.stop(now+.2)}
}
function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600)}
function setObjective(title,desc,number,count=''){ $('mission-title').textContent=title;$('objective').textContent=desc;$('mission-number').textContent=`MISSION 0${number} / 03`;$('mission-count').textContent=count; }
function spawnEnemy(x,z,kind='guard'){
 const mesh=world.person(0xad594b);mesh.position.set(x,0,z);scene.add(mesh);
 const bar=new THREE.Group();bar.position.y=3.0;bar.userData.persist=true;
 const background=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.22),new THREE.MeshBasicMaterial({color:0x171d1d,depthTest:false}));bar.add(background);
 const fill=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.12),new THREE.MeshBasicMaterial({color:0xff6b54,depthTest:false}));fill.position.z=.01;bar.add(fill);bar.renderOrder=10;mesh.add(bar);
 models.person(mesh,'enemy');enemies.push({mesh,bar,fill,hp:100,cooldown:1.2+Math.random(),alive:true,walk:Math.random()*4,stuck:0,kind,shootUntil:0});
}
function restoreHealth(){health=Math.min(100,health+35)}
function removeRival(){if(!rival)return;scene.remove(rival.car.mesh);rival=null}
function startRival(){removeRival();const car=world.vehicle('car',0,-40);models.vehicle(car,0x94504c);rival={car,route:[],nextRoute:0,nextShot:gameTime+4}}
function updateRival(dt){
 if(!rival||mission!==0||phase!==1)return;const pos=vehicle?vehicle.mesh.position:player.position,enemy=rival.car.mesh.position;
 const distance=Math.hypot(pos.x-enemy.x,pos.z-enemy.z);
 if(gameTime>=rival.nextRoute){rival.route=roadRoute(enemy,pos);rival.nextRoute=gameTime+.8}
 if(distance>8){const facing=advancePursuit(enemy,rival.route,dt,world.blocks,11);if(facing!==null)rival.car.mesh.rotation.y=facing;for(const wheel of rival.car.wheels)wheel.rotation.x-=11*dt*.8}
 if(distance<22&&gameTime>=rival.nextShot&&hasLineOfSight(enemy,pos,world.blocks)){rival.nextShot=gameTime+3;hit(vehicle?3:4);addTracer(enemy.clone().add(new THREE.Vector3(0,2,0)),pos.clone().add(new THREE.Vector3(0,1.5,0)),0xff866d)}
}
function beginSecondMission(){mission=1;phase=0;target=objectives[2];heat=1;restoreHealth();spawnEnemy(-28,-33);spawnEnemy(-33,-28);spawnEnemy(-23,-28);spawnEnemy(-28,-23);setObjective('THE AMBUSH','Reach the stolen case. Eliminate the guards.',2,'GUARDS DOWN  0 / 4');showToast('DELIVERY COMPLETE  ·  HEALTH RESTORED');sound('success')}

function updateMission(){
 const pos=vehicle?vehicle.mesh.position:player.position,dist=Math.hypot(pos.x-target.x,pos.z-target.z);
 if(mission===0&&phase===0&&dist<4.5){phase=1;target=objectives[1];heat=1;startRival();setObjective('FIRST DELIVERY','Rival car on your tail! Ride to the drop.',1,'PURSUIT ACTIVE');showToast('RIVAL IN PURSUIT  ·  GET TO THE DROP');sound('success')}
 else if(mission===0&&phase===1&&dist<5){phase=2;removeRival();dropKills=0;spawnEnemy(56,-42,'drop-guard');spawnEnemy(42,-28,'drop-guard');spawnEnemy(70,-28,'drop-guard');setObjective('DROP ZONE','Exit your ride and clear the attackers.',1,'ATTACKERS DOWN  0 / 3');showToast('AMBUSH AT THE DROP  ·  CLEAR THE AREA');sound('success')}
 else if(mission===0&&phase===2&&dropKills>=3){beginSecondMission()}
 else if(mission===1&&phase===0&&kills>=4){phase=1;setObjective('THE AMBUSH','Area clear. Collect the case at the marker.',2,'GUARDS DOWN  4 / 4');showToast('AREA CLEAR  ·  COLLECT THE CASE');sound('success')}
 else if(mission===1&&phase===1&&dist<4.5){phase=2;target=objectives[3];setObjective('THE AMBUSH','Case secured. Take it to the contact.',2);showToast('CASE SECURED  ·  GET TO THE CONTACT');sound('success')}
 else if(mission===1&&phase===2&&dist<5){mission=2;phase=0;target=objectives[4];heat=2;restoreHealth();spawnEnemy(25,20,'pursuer');spawnEnemy(31,20,'pursuer');spawnEnemy(28,37,'pursuer');lastReinforcement=gameTime;setObjective('HOT RUN','Get to the safe house. Expect resistance.',3);showToast('FINAL JOB  ·  HEALTH RESTORED');sound('success')}
 else if(mission===2&&dist<5){finish(true)}
 marker.position.set(target.x,0,target.z);$('heat').textContent='★'.repeat(heat)+'☆'.repeat(3-heat);
 if(routeTarget!==target||gameTime>=nextRouteUpdate){currentRoute=roadRoute(pos,target);routeTarget=target;nextRouteUpdate=gameTime+.6}
 const waypoint=currentRoute.find((point,index)=>index>0&&Math.hypot(point.x-pos.x,point.z-pos.z)>3)||target;
 const dx=target.x-pos.x,dz=target.z-pos.z;const angle=objectiveDirection(waypoint.x-pos.x,waypoint.z-pos.z,cameraYaw);$('direction-arrow').style.transform=`rotate(${angle}rad)`;$('distance').textContent=`${Math.round(Math.hypot(dx,dz))} M`;
}
function finish(won){if(ended)return;ended=true;resetInputs();setWeaponMenu(false);$('end-kicker').textContent=won?'ALL THREE MISSIONS COMPLETE':'MISSION FAILED';$('end-title').innerHTML=won?'RUN <span>COMPLETE.</span>':'DOWN <span>OUT.</span>';$('end-text').textContent=won?'You made the delivery, recovered the case, and escaped the city. Nice work.':'Retry this mission with full health and ammo, or start the whole run again.';$('retry').hidden=won;$('restart').textContent=won?'PLAY AGAIN':'START OVER';$('end').classList.remove('hidden')}
function retryMission(){
 if(!ended)return;
 resetInputs();removeRival();for(const enemy of enemies)scene.remove(enemy.mesh);enemies.length=0;
 for(const shot of shots){scene.remove(shot.line);shot.line.geometry.dispose();shot.line.material.dispose()}shots.length=0;
 if(vehicle){vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false}vehicle=null;vehicleSpeed=0;player.visible=true;
 const start=[{x:0,z:13},{x:56,z:-28},{x:28,z:28}][mission];player.position.set(start.x,0,start.z);player.rotation.y=0;
 vehicles.forEach((v,i)=>{v.mesh.position.set(start.x+(i===0?4:-4),0,start.z-3);v.mesh.rotation.y=0;v.occupied=false;if(v.rider)v.rider.visible=false});
 health=100;phase=0;kills=0;dropKills=0;reloadEnd=0;lastShot=-1;ammo.forEach((_,i)=>ammo[i]=weapons[i].cap);aiming=false;updateAimButton();cameraYaw=0;lookPitch=0;
 if(mission===0){target=objectives[0];heat=0;setObjective('FIRST DELIVERY','Take the bike and pick up the package.',1)}
 else if(mission===1){target=objectives[2];heat=1;spawnEnemy(-28,-33);spawnEnemy(-33,-28);spawnEnemy(-23,-28);spawnEnemy(-28,-23);setObjective('THE AMBUSH','Reach the stolen case. Eliminate the guards.',2,'GUARDS DOWN  0 / 4')}
 else {target=objectives[4];heat=2;spawnEnemy(25,20,'pursuer');spawnEnemy(31,20,'pursuer');spawnEnemy(28,37,'pursuer');lastReinforcement=gameTime;setObjective('HOT RUN','Get to the safe house. Expect resistance.',3)}
 routeTarget=null;currentRoute=roadRoute(player.position,target);marker.position.set(target.x,0,target.z);camera.position.set(start.x,5.2,start.z+8);$('end').classList.add('hidden');ended=false;showToast('MISSION RESTARTED  ·  FULL HEALTH & AMMO');updateMap();
}
function setWeaponMenu(open){weaponMenuOpen=!!open&&!vehicle&&started&&!ended;const menu=$('weapon-menu');menu.hidden=!weaponMenuOpen;$('weapon-btn').setAttribute('aria-expanded',String(weaponMenuOpen));if(weaponMenuOpen)renderWeaponMenu()}
function renderWeaponMenu(){const menu=$('weapon-menu');menu.innerHTML='';weapons.forEach((w,i)=>{const button=document.createElement('button');button.className='weapon-option'+(i===weaponIndex?' selected':'');button.setAttribute('aria-label',`${w.name}, ${ammo[i]} rounds${i===weaponIndex?', equipped':''}`);button.innerHTML=`<span>${w.name}</span><small>${ammo[i]} / ${w.cap}</small>`;button.addEventListener('click',()=>equipWeapon(i));menu.appendChild(button)})}
function equipWeapon(index){if(!started||ended||vehicle||index<0||index>=weapons.length)return;setWeaponMenu(false);if(index===weaponIndex)return;weaponIndex=index;updateWeapon(player,weaponIndex);reloadEnd=0;showToast(weapons[weaponIndex].name+' EQUIPPED')}
function switchWeapon(){equipWeapon((weaponIndex+1)%weapons.length)}
function reload(){if(!started||ended||vehicle||reloadEnd||ammo[weaponIndex]===weapons[weaponIndex].cap)return;reloadEnd=gameTime+1;sound('reload');showToast('RELOADING')}
function interact(){
 if(!started||ended)return;
 if(vehicle){const p=vehicle.mesh.position;const candidates=[[3,0],[-3,0],[0,3],[0,-3]];const exit=candidates.find(([x,z])=>!world.blocks.some(b=>Math.abs(p.x+x-b.x)<b.halfX&&Math.abs(p.z+z-b.z)<b.halfZ));if(!exit){showToast('NO ROOM TO EXIT HERE');return}resetInputs();player.position.set(p.x+exit[0],0,p.z+exit[1]);player.visible=true;vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false;vehicle=null;vehicleSpeed=0;showToast('ON FOOT');return}
 let near=null,min=5;for(const v of vehicles){const d=player.position.distanceTo(v.mesh.position);if(d<min){min=d;near=v}}
 if(near){resetInputs();setWeaponMenu(false);reloadEnd=0;aiming=false;updateAimButton();vehicle=near;vehicle.occupied=true;if(vehicle.rider)vehicle.rider.visible=true;vehicleSpeed=0;player.visible=false;showToast('STEER WITH STICK  ·  HOLD GAS TO DRIVE')}else showToast('MOVE CLOSER TO A VEHICLE')
}
function nearestTarget(){
 const focal=innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))), range=weapons[weaponIndex].range;
 const candidates=enemies.filter(e=>e.alive).map(enemy=>{
  const point=enemy.mesh.position.clone().add(new THREE.Vector3(0,1.35,0)),distance=player.position.distanceTo(enemy.mesh.position);
  const screen=point.project(camera),cameraDistance=camera.position.distanceTo(enemy.mesh.position);
  return {enemy,x:screen.x*innerWidth/2,y:screen.y*innerHeight/2,bodyRadius:Math.max(4,focal*.65/Math.max(1,cameraDistance)),bodyHalfHeight:Math.max(5,focal*1.3/Math.max(1,cameraDistance)),distance,range,visible:screen.z>=-1&&screen.z<=1&&Math.abs(screen.x)<=1&&Math.abs(screen.y)<=1,clear:hasLineOfSight(player.position,enemy.mesh.position,world.blocks)};
 });
 return selectReticleTarget(candidates,aimAssist?Math.min(innerWidth,innerHeight)*(aiming?.045:.065):0);
}
function addTracer(from,to,color){const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));scene.add(line);shots.push({line,until:gameTime+.09})}
function damageEnemy(enemy,amount){
 if(!enemy.alive)return;enemy.hp-=amount;setHitFlash(enemy.mesh,true);setTimeout(()=>setHitFlash(enemy.mesh,false),100);$('hitmarker').classList.add('active');setTimeout(()=>$('hitmarker').classList.remove('active'),100);
 if(enemy.hp<=0){enemy.alive=false;scene.remove(enemy.mesh);if(mission===0&&phase===2&&enemy.kind==='drop-guard'){dropKills++;$('mission-count').textContent=`ATTACKERS DOWN  ${Math.min(dropKills,3)} / 3`}if(mission===1&&phase===0&&enemy.kind==='guard'){kills++;$('mission-count').textContent=`GUARDS DOWN  ${Math.min(kills,4)} / 4`}}
}
function shoot(){
 const w=weapons[weaponIndex];if(vehicle||reloadEnd||gameTime-lastShot<w.rate)return;if(ammo[weaponIndex]<=0){reload();return}lastShot=gameTime;ammo[weaponIndex]--;sound('shot');
 player.rotation.y=cameraYaw;const enemy=nearestTarget(),from=player.position.clone().add(new THREE.Vector3(0,1.6,0));let to;
 if(enemy){to=enemy.mesh.position.clone().add(new THREE.Vector3(0,1.35,0));player.rotation.y=Math.atan2(from.x-to.x,from.z-to.z);damageEnemy(enemy,w.damage)}
 else {const aimRay=new THREE.Raycaster();aimRay.setFromCamera(new THREE.Vector2(0,0),camera);aimRay.far=w.range;const wall=aimRay.intersectObjects(world.buildingMeshes,false)[0];to=wall?wall.point:aimRay.ray.at(w.range,new THREE.Vector3())}addTracer(from,to,0xf8ffb0);const flash=new THREE.Mesh(new THREE.SphereGeometry(.18,6,4),new THREE.MeshBasicMaterial({color:0xffe58b}));flash.position.copy(from).lerp(to,.06);scene.add(flash);shots.push({line:flash,until:gameTime+.06});
 $('crosshair').classList.remove('shot');void $('crosshair').offsetWidth;$('crosshair').classList.add('shot');
}
function hit(amount){if(ended)return;health=Math.max(0,health-amount);$('damage').classList.add('hit');setTimeout(()=>$('damage').classList.remove('hit'),180);if(health<=0)finish(false)}
function animateWalk(person,amount,time,dt,shooting=false,aiming=false,sprinting=false,actualSpeed=0){if(animatePerson(person,amount,dt,shooting,aiming,sprinting,actualSpeed))return;const a=Math.sin(time*9)*.65*amount;person.userData.leftLeg.rotation.x=a;person.userData.rightLeg.rotation.x=-a;person.userData.leftArm.rotation.x=-a*.7;person.userData.rightArm.rotation.x=a*.25;}
function updateEnemies(dt){
 const pos=vehicle?vehicle.mesh.position:player.position;
 for(const e of enemies){if(!e.alive)continue;const d=e.mesh.position.distanceTo(pos);e.bar.visible=d<40&&hasLineOfSight(e.mesh.position,pos,world.blocks);e.bar.quaternion.copy(e.mesh.quaternion).invert().multiply(camera.quaternion);e.fill.scale.x=Math.max(0,e.hp/100);e.fill.position.x=(e.fill.scale.x-1)*.7;if(d>=44)continue;e.mesh.rotation.y=Math.atan2(e.mesh.position.x-pos.x,e.mesh.position.z-pos.z);let moving=0;
 if(d>11&&d<40){const dx=(pos.x-e.mesh.position.x)/d,dz=(pos.z-e.mesh.position.z)/d;moving=movePosition(e.mesh.position,dx*dt*2.6,dz*dt*2.6,world.blocks);if(moving<dt*.4){e.stuck+=dt;const side=e.stuck>2?-1:1;movePosition(e.mesh.position,-dz*dt*2.6*side,dx*dt*2.6*side,world.blocks);if(e.stuck>4)e.stuck=0}else e.stuck=0;e.walk+=dt;animateWalk(e.mesh,1,e.walk,dt,gameTime<e.shootUntil)}else animateWalk(e.mesh,0,e.walk,dt,gameTime<e.shootUntil);
 e.cooldown-=dt;if(d<25&&e.cooldown<=0&&hasLineOfSight(e.mesh.position,pos,world.blocks)){e.cooldown=1.7+Math.random();e.shootUntil=gameTime+.35;hit(vehicle?3:5);addTracer(e.mesh.position.clone().add(new THREE.Vector3(0,2,0)),pos.clone().add(new THREE.Vector3(0,1.5,0)),0xff866d)}
 }
}
function updateMap(){
 const ctx=$('map').getContext('2d'),w=200;ctx.clearRect(0,0,w,w);ctx.fillStyle='#1c2b29';ctx.fillRect(0,0,w,w);const pos=vehicle?vehicle.mesh.position:player.position,scale=2.5;ctx.save();ctx.translate(w/2,w/2);
 for(let i=-84;i<=84;i+=28){ctx.fillStyle='#465451';ctx.fillRect((i-pos.x)*scale-16,-100,32,200);ctx.fillRect(-100,(i-pos.z)*scale-16,200,32)}
 if(currentRoute.length>1){ctx.strokeStyle='#c9fc51';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();currentRoute.forEach((point,i)=>{const x=(point.x-pos.x)*scale,z=(point.z-pos.z)*scale;if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z)});ctx.stroke()}
 ctx.fillStyle='#c9fc51';let tx=(target.x-pos.x)*scale,tz=(target.z-pos.z)*scale;const length=Math.hypot(tx,tz);if(length>83){tx=tx/length*83;tz=tz/length*83}ctx.save();ctx.translate(tx,tz);ctx.rotate(Math.PI/4);ctx.fillRect(-6,-6,12,12);ctx.restore();
 ctx.fillStyle='#ff806d';if(rival){const rp=rival.car.mesh.position,x=(rp.x-pos.x)*scale,z=(rp.z-pos.z)*scale;if(Math.hypot(x,z)<90){ctx.beginPath();ctx.arc(x,z,5,0,Math.PI*2);ctx.fill()}}for(const e of enemies){if(!e.alive)continue;const x=(e.mesh.position.x-pos.x)*scale,z=(e.mesh.position.z-pos.z)*scale;if(Math.hypot(x,z)<90){ctx.beginPath();ctx.arc(x,z,3,0,Math.PI*2);ctx.fill()}}
 ctx.save();ctx.rotate(-cameraYaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
}
function setMapOpen(open){
 if(open&&(!started||ended))return;
 mapOpen=open; $('map-overlay').hidden=!open;
 if(open){resetInputs();setWeaponMenu(false);const position=vehicle?vehicle.mesh.position:player.position;currentRoute=roadRoute(position,target);drawFullMap($('full-map'),{blocks:world.blocks,position,target,route:currentRoute,enemies:rival?[...enemies,{alive:true,mesh:rival.car.mesh}]:enemies,vehicles,cameraYaw});$('close-map').focus()}
 else {$('open-map').focus()}
}
$('open-map').onclick=()=>setMapOpen(true);$('close-map').onclick=()=>setMapOpen(false);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&mapOpen){e.preventDefault();setMapOpen(false);return}if(e.code==='KeyM'&&!e.repeat){e.preventDefault();setMapOpen(!mapOpen);return}if(mapOpen)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(e.code==='KeyE')interact();if(e.code==='KeyQ')switchWeapon();if(e.code==='KeyR')reload();if(e.code==='KeyV')toggleAim();if(e.code==='Space'){keyboardFire=true;updateFire();if(started&&!ended&&!vehicle)shoot()}if(e.code==='Escape')setWeaponMenu(false)});
window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space'){keyboardFire=false;updateFire()}});
window.addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs()});
$('settings-button').onclick=()=>{const panel=$('settings-panel');panel.hidden=!panel.hidden;$('settings-button').setAttribute('aria-expanded',String(!panel.hidden))};
$('start').onclick=()=>{started=true;$('intro').classList.add('hidden');try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();prepareAudio()}catch{}showToast('FOLLOW THE GREEN MARKER')};$('retry').onclick=retryMission;$('restart').onclick=()=>location.reload();$('interact-btn').onclick=interact;$('weapon-btn').onclick=()=>setWeaponMenu(!weaponMenuOpen);$('reload-btn').onclick=reload;$('aim-btn').onclick=toggleAim;function updateSettings(){ $('sound-toggle').textContent=muted?'SOUND OFF':'SOUND ON';$('sound-toggle').setAttribute('aria-pressed',String(!muted));$('assist-toggle').textContent=aimAssist?'ASSIST ON':'ASSIST OFF';$('assist-toggle').setAttribute('aria-pressed',String(aimAssist));$('sensitivity').value=lookSensitivity; }
function persistSettings(){savePreferences(storage,{muted,aimAssist,lookSensitivity})}
$('sound-toggle').onclick=()=>{muted=!muted;updateSettings();persistSettings()};$('assist-toggle').onclick=()=>{aimAssist=!aimAssist;updateSettings();persistSettings()};$('sensitivity').oninput=e=>{lookSensitivity=Number(e.target.value);persistSettings()};updateSettings();
function updateAimButton(){$('aim-btn').classList.toggle('selected',aiming);$('aim-btn').setAttribute('aria-pressed',String(aiming));$('crosshair').classList.toggle('aiming',aiming)}
function toggleAim(){if(!started||ended||vehicle)return;aiming=!aiming;updateAimButton()}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function updateFire(){fireHeld=keyboardFire||firePointers.size>0}
function applyLook(dx,dy){const factor=(.0025+lookSensitivity*.0007)*(aiming?.7:1);cameraYaw-=dx*factor;lookPitch=THREE.MathUtils.clamp(lookPitch+dy*factor*.7,-.3,.4)}
function resetInputs(){inputResets.forEach(reset=>reset());keyboardFire=false;firePointers.clear();updateFire();sprintHeld=false;gasHeld=false;brakeHeld=false;Object.keys(keys).forEach(k=>keys[k]=false);joy={x:0,y:0};$('stick').style.transform='';$('fire-btn').classList.remove('active');$('left-fire-btn').classList.remove('active');$('sprint-btn').classList.remove('active');$('accelerate-btn').classList.remove('active');$('reverse-btn').classList.remove('active');lookPointer=null;joystickPointer=null}
function fireButton(el,dragToLook){
 let pointer=null,lastX=0,lastY=0;inputResets.push(()=>{pointer=null});
 el.addEventListener('pointerdown',e=>{if(!started||ended||vehicle||pointer!==null)return;e.preventDefault();pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;el.setPointerCapture(pointer);firePointers.add(pointer);updateFire();el.classList.add('active');shoot()});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!dragToLook)return;applyLook(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY});
 const end=e=>{if(e.pointerId!==pointer)return;firePointers.delete(pointer);pointer=null;updateFire();el.classList.remove('active')};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
fireButton($('fire-btn'),true);fireButton($('left-fire-btn'),false);
function holdButton(el,on,off){let pointer=null;inputResets.push(()=>{pointer=null});el.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;el.setPointerCapture(pointer);on();el.classList.add('active')});const end=e=>{if(e.pointerId!==pointer)return;pointer=null;off();el.classList.remove('active')};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end)}
holdButton($('sprint-btn'),()=>sprintHeld=true,()=>sprintHeld=false);
holdButton($('accelerate-btn'),()=>gasHeld=true,()=>gasHeld=false);
holdButton($('reverse-btn'),()=>brakeHeld=true,()=>brakeHeld=false);
const joystick=$('joystick');let joystickPointer=null;
function moveStick(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=e.clientX-cx,y=e.clientY-cy;const max=r.width*.32,d=Math.hypot(x,y);if(d>max){x=x/d*max;y=y/d*max}const magnitude=Math.hypot(x,y)/max,scaled=Math.max(0,(magnitude-.12)/.88);joy=magnitude?{x:x/max*scaled/magnitude,y:y/max*scaled/magnitude}:{x:0,y:0};$('stick').style.transform=`translate(${x}px,${y}px)`}
joystick.addEventListener('pointerdown',e=>{if(joystickPointer!==null)return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)moveStick(e)});function resetStick(e){if(e.pointerId!==joystickPointer)return;joystickPointer=null;joy={x:0,y:0};$('stick').style.transform=''}joystick.addEventListener('pointerup',resetStick);joystick.addEventListener('pointercancel',resetStick);joystick.addEventListener('lostpointercapture',resetStick);
let lookPointer=null,lastLookX=0,lastLookY=0;
canvas.addEventListener('pointerdown',e=>{if(e.button===2){toggleAim();return}if(!started||ended||lookPointer!==null)return;lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;applyLook(e.clientX-lastLookX,e.clientY-lastLookY);lastLookX=e.clientX;lastLookY=e.clientY});
function endLook(e){if(e.pointerId===lookPointer)lookPointer=null}canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);canvas.addEventListener('lostpointercapture',endLook);
const clock=new THREE.Clock();let mapTick=0;
function animate(){requestAnimationFrame(animate);const elapsed=clock.getDelta(),dt=Math.min(elapsed,.05);if(mapOpen)return;
 if(started&&!ended){gameTime+=Math.min(elapsed,.25);
  let inputX=joy.x+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),inputZ=joy.y+(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const len=Math.hypot(inputX,inputZ);if(len>1){inputX/=len;inputZ/=len}
  if(vehicle){
   const pedal=(gasHeld?1:0)-(brakeHeld?1:0);const acceleration=(gasHeld||brakeHeld)?pedal:-inputZ;vehicleSpeed+=acceleration*(vehicle.type==='bike'?18:14)*dt;vehicleSpeed*=Math.exp(-(Math.abs(acceleration)>.1?.8:2.5)*dt);vehicleSpeed=THREE.MathUtils.clamp(vehicleSpeed,-6,vehicle.type==='bike'?19:15);
   if(Math.abs(vehicleSpeed)>.25)vehicle.mesh.rotation.y-=inputX*dt*1.65*Math.min(Math.abs(vehicleSpeed)/5,1)*(vehicleSpeed>=0?1:-1);
   const dx=-Math.sin(vehicle.mesh.rotation.y)*vehicleSpeed*dt,dz=-Math.cos(vehicle.mesh.rotation.y)*vehicleSpeed*dt;
   if(movePosition(vehicle.mesh.position,dx,dz,world.blocks,.6)<Math.hypot(dx,dz)*.4)vehicleSpeed*=.4;
   for(const wheel of vehicle.wheels)wheel.rotation.x-=vehicleSpeed*dt*.8;player.position.copy(vehicle.mesh.position);
   if(lookPointer===null&&Math.abs(vehicleSpeed)>1){let delta=Math.atan2(Math.sin(vehicle.mesh.rotation.y-cameraYaw),Math.cos(vehicle.mesh.rotation.y-cameraYaw));cameraYaw+=delta*Math.min(1,dt*2)}
  }else{
   const move=relativeMovement(inputX,inputZ,cameraYaw),sprinting=!!(sprintHeld||keys.ShiftLeft||keys.ShiftRight),speed=sprinting?6.6:2;
   let actualSpeed=0;
   if(len>.08){const travelled=movePosition(player.position,move.x*speed*dt,move.z*speed*dt,world.blocks);actualSpeed=dt>0?travelled/dt:0;if(!fireHeld&&!aiming)player.rotation.y=turnTowards(player.rotation.y,Math.atan2(-move.x,-move.z),dt);walkCycle+=dt*(speed/2)}
   animateWalk(player,Math.min(actualSpeed/speed,1),walkCycle,dt,fireHeld,aiming,sprinting,actualSpeed);
  }
  if(aiming&&!vehicle)player.rotation.y=cameraYaw;if(fireHeld)shoot();if(reloadEnd&&gameTime>=reloadEnd){ammo[weaponIndex]=weapons[weaponIndex].cap;reloadEnd=0}updateEnemies(dt);if(!ended)updateMission();if(!ended)updateRival(dt);if(!ended){const cityPos=vehicle?vehicle.mesh.position:player.position;updateCity(dt,cityPos);updateAnimals(dt,cityPos);}if(!ended&&mission===2&&gameTime-lastReinforcement>16&&enemies.filter(e=>e.alive&&e.kind==='pursuer').length<5){const p=vehicle?vehicle.mesh.position:player.position;const z=Math.round(p.z/28)*28;const x=Math.max(-84,Math.min(84,Math.round(p.x/28)*28+(p.x<target.x?-28:28)));spawnEnemy(x,z,'pursuer');lastReinforcement=gameTime;showToast('ENEMY REINFORCEMENTS INBOUND')}
  for(let i=shots.length-1;i>=0;i--)if(shots[i].until<gameTime){scene.remove(shots[i].line);shots[i].line.geometry.dispose();shots[i].line.material.dispose();shots.splice(i,1)}
  $('hud').classList.toggle('driving',!!vehicle);$('health').textContent=Math.ceil(health);$('health-fill').style.width=Math.max(0,Math.min(100,health))+'%';$('health-fill').style.background=health<30?'#ff6b59':'#c9fc51';$('weapon').textContent=vehicle?vehicle.type.toUpperCase():weapons[weaponIndex].name;$('weapon-sub').textContent=vehicle?`${Math.round(Math.abs(vehicleSpeed)*5)} KM/H · TAP EXIT`:reloadEnd?'RELOADING...':aimAssist?'AIM ASSIST ON':'MANUAL AIM';$('ammo').innerHTML=vehicle?'—':`${ammo[weaponIndex]} <small>/ ∞</small>`;const reloading=!!reloadEnd&&!vehicle;$('reload-track').classList.toggle('visible',reloading);const reloadProgress=reloading?Math.round(Math.max(0,Math.min(1,1-(reloadEnd-gameTime)))*100):0;$('reload-fill').style.width=reloadProgress+'%';$('reload-track').setAttribute('aria-valuenow',String(reloadProgress));$('reload-btn').classList.toggle('selected',reloading);
  const near=vehicle||vehicles.some(v=>player.position.distanceTo(v.mesh.position)<5);$('interact-btn').style.display=near?'':'none';$('interact-btn').querySelector('.lbl').textContent=vehicle?'EXIT':'RIDE';$('interact-btn').setAttribute('aria-label',vehicle?'Exit vehicle':'Enter nearby vehicle');$('interaction').style.display='none';
  const locked=!vehicle&&nearestTarget();$('crosshair').classList.toggle('locked',!!locked);$('target-name').textContent=locked?'TARGET LOCKED':'';
  if((mapTick+=dt)>.1){updateMap();mapTick=0}
 }
 const pos=vehicle?vehicle.mesh.position:player.position,dist=vehicle?11:(aiming?5.3:6.7),height=(vehicle?5.4:(aiming?2.9:3.35));
 const shoulder=vehicle?0:1.2,forwardX=-Math.sin(cameraYaw),forwardZ=-Math.cos(cameraYaw),rightX=Math.cos(cameraYaw),rightZ=-Math.sin(cameraYaw);
 cameraFocus.set(pos.x,vehicle?1.5:1.65,pos.z);cameraDesired.set(pos.x+Math.sin(cameraYaw)*dist+rightX*shoulder,height,pos.z+Math.cos(cameraYaw)*dist+rightZ*shoulder);
 const cameraRay=cameraDesired.clone().sub(cameraFocus),rayLength=cameraRay.length();raycaster.set(cameraFocus,cameraRay.normalize());raycaster.far=rayLength;const intersections=raycaster.intersectObjects(world.buildingMeshes,false);if(intersections.length)cameraDesired.copy(cameraFocus).addScaledVector(cameraRay,Math.max(.7,intersections[0].distance-.5));
 camera.position.lerp(cameraDesired,1-Math.exp(-dt*(aiming||fireHeld?18:12)));const lookTarget=cameraFocus.clone().add(new THREE.Vector3(forwardX*(vehicle?0:7)+rightX*shoulder,.4-lookPitch*12,forwardZ*(vehicle?0:7)+rightZ*shoulder));camera.lookAt(lookTarget);const fov=aiming&&!vehicle?43:55;if(Math.abs(camera.fov-fov)>.05){camera.fov=THREE.MathUtils.lerp(camera.fov,fov,Math.min(1,dt*8));camera.updateProjectionMatrix()}sun.position.set(pos.x-35,75,pos.z+30);sun.target.position.set(pos.x,0,pos.z);diamond.rotation.y+=dt;diamond.position.y=4+Math.sin(performance.now()*.003)*.3;ring.rotation.z+=dt*.25;renderer.render(scene,camera);
}
// Test-only controls let automated browser checks exercise the real mission state machine.
if(import.meta.env.DEV) window.__aivmTest={
  warp(x,z){const p=vehicle?vehicle.mesh.position:player.position;p.set(x,0,z);if(vehicle)player.position.copy(p);vehicleSpeed=0},
  state(){const pos=vehicle?vehicle.mesh.position:player.position;return {mission,phase,kills,health,vehicle:vehicle?.type||null,weapon:weapons[weaponIndex].name,ammo:ammo[weaponIndex],ammoAll:[...ammo],reloading:!!reloadEnd,gasHeld,brakeHeld,weaponMenuOpen,mapOpen,dropKills,rival:rival?{x:rival.car.mesh.position.x,z:rival.car.mesh.position.z}:null,ended,x:pos.x,z:pos.z,cameraYaw,lookPitch,aiming,fireHeld,assist:aimAssist}},
  health(value){health=value},
  fail(){health=0;finish(false)},
  defeatGuards(){enemies.filter(e=>e.alive&&(e.kind==='guard'||e.kind==='drop-guard')).forEach(e=>damageEnemy(e,100))},
  playerStatus(){const a=player.userData.animation;return {loaded:!!a,role:a?.role,action:a?.current?.getClip().name||null,gun:!!player.userData.model?.userData.gun,visible:player.visible,rate:a?.current?.getEffectiveTimeScale()||0,time:a?.current?.time||0,rotation:player.rotation.y,leftLeg:a?.model?.getObjectByName('mixamorigLeftUpLeg')?.quaternion.toArray(),rightLeg:a?.model?.getObjectByName('mixamorigRightUpLeg')?.quaternion.toArray(),leftKnee:a?.model?.getObjectByName('mixamorigLeftLeg')?.quaternion.toArray(),rightKnee:a?.model?.getObjectByName('mixamorigRightLeg')?.quaternion.toArray()}},
  animalStatus(){return animals.map(a=>({type:a.type,x:a.mesh.position.x,z:a.mesh.position.z,loaded:!!a.mesh.userData.animalAnimation}))},
  renderInfo(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}},
  targets(){return enemies.filter(e=>e.alive).map(e=>{const p=e.mesh.position.clone().add(new THREE.Vector3(0,1.35,0)).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,hp:e.hp,kind:e.kind}})}
};
marker.position.set(target.x,0,target.z);camera.position.set(0,5.2,21);currentRoute=roadRoute(player.position,target);updateMap();animate();
