import * as THREE from 'three';
import { createWorld } from './world.js';
import { createModels, animatePerson, animateAnimal, setHitFlash, updateWeapon, setCivilianLOD } from './models.js';
import { selectReticleTarget } from './combat.js';
import { roadRoute } from './gps.js';
import { drawFullMap, MAP_BOUND } from './full-map.js';
import { loadPreferences, savePreferences } from './preferences.js';
import { advancePursuit } from './pursuit.js';
import { turnTowards } from './locomotion.js';
import { LANDMARKS, DISTRICTS, entrance, ROAD_LIMIT, MAP_LETTERS, DISTRICT_LETTERS, mapLetter, landmarkById, districtById, districtAt } from './city-data.js';
import { VEHICLE_CATALOG, vehicleById, applyCatalog, tintFor, handlingFor, dealershipStock, raceClassOf, DEALERSHIP_NAME } from './vehicles.js';
import { createCrowd, stepCrowd, nearestConversations, crowdCount, mulberry32 } from './crowd.js';
import { applyTalkGesture } from './gestures.js';
import { createBubbles } from './bubbles.js';
import { streetConversation, applyStreetEffect, nearestLandmarkId } from './street-talk.js';
import { createHome, HOME_CENTER } from './home.js';
import { createInteriors } from './interiors.js';
import { moveInside } from './interior-collision.js';
import { createInteriorLife, stepInteriorLife } from './interior-life.js';
import { createCasino } from './casino-ui.js';
import { advanceVehicleSpeed } from './driving.js';
import { startActivity, advanceActivity } from './activities.js';
import { RACE_CLASSES, tracksForClass, classOfTrack, normalizeRaceClass, defaultTrackFor, prizeFor, RACE_TRACKS, trackById, createRoom, joinRoom, leaveRoom, addBot, startRoom, updateRoomClock, updateRacerPosition, markFinished, standings, startGrid, formatRaceTime, snapshot, decodeMessage, staticRoomCode, MAX_RACERS, COUNTDOWN_MS } from './race.js';
import { advanceBot, botCheckpointReached } from './race-ai.js';
import { SIDE_MISSIONS, SIDE_MISSION_IDS, createSideMission, sideMissionTarget, sideMissionObjective, sideMissionCounter, advanceSideMission, advanceChase, chaseCaught } from './missions.js';
import { createRaceUI } from './race-ui.js';
import { loadProgress, saveProgress, purchase, reward, PRICES } from './economy.js';
import { setProgressScope } from './economy.js';
import { registerAccount, signInAccount, getSessionAccount, signOut } from './accounts.js';
import { CONTROL_IDS, loadLayout, saveLayout, applyLayout } from './control-layout.js';
import { createMusic } from './music.js';
import { SONGS, SONG_IDS, createSongRadio } from './song-radio.js';
import { movePosition, blocked, hasLineOfSight, relativeMovement, objectiveDirection } from './navigation.js';
import './style.css';

document.querySelector('#app').innerHTML = `
<canvas id="game" aria-label="3D game view. Drag to look around."></canvas><div class="vignette"></div><div class="damage" id="damage"></div>
<div class="hud" id="hud">
 <div class="top"><div><div class="brand"><img class="brand-logo" src="${import.meta.env.BASE_URL}assets/logo.png" alt="AIVM — AI Velocity Mobile"></div><div class="mission"><div class="eyebrow" id="mission-number">MISSION 01 / 03</div><h2 id="mission-title">FIRST DELIVERY</h2><p id="objective">Take the bike and pick up the package.</p><div class="count" id="mission-count"></div></div></div><div class="right-hud"><div class="cash-display" id="cash-display">$0</div><div class="heat"><small>HEAT</small><strong id="heat">☆☆☆</strong></div><div><button class="map-wrap" id="open-map" aria-label="Open full city map" aria-haspopup="dialog"><canvas id="map" width="200" height="200"></canvas><span class="map-label" id="map-orient">HEAD ↑</span><span class="map-tap">TAP MAP</span></button><div class="map-note">● YOU &nbsp; ◆ GOAL &nbsp; — GPS</div><button class="settings-button" id="game-menu-button" aria-haspopup="dialog">☰ GAME MENU</button><button class="settings-button" id="settings-button" aria-expanded="false" aria-controls="settings-panel">⚙ SETTINGS</button></div></div></div>
 <div class="navigation" id="navigation"><span id="direction-arrow">▲</span><span id="distance">0 M</span><small>OBJECTIVE</small></div><div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i></div><div class="target-name" id="target-name"></div><div class="hitmarker" id="hitmarker">×</div>
 <div class="bottom-left"><div class="status"><div class="status-top"><span class="status-label">HEALTH</span><span class="health-num" id="health">100</span></div><div class="health-track"><div class="health-fill" id="health-fill"></div></div><div class="weapon-name" id="weapon">PISTOL</div><div class="weapon-sub" id="weapon-sub">AIM ASSIST ON</div><div class="reload-track" id="reload-track" role="progressbar" aria-label="Reload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="reload-fill"></div></div></div><div class="ammo" id="ammo">12 <small>/ ∞</small></div></div>
 <button class="action left-fire" id="left-fire-btn" aria-label="Fire with left hand"><span class="ico">🔫</span><span class="lbl">FIRE</span></button>
 <button id="talk-btn" class="talk-button" style="display:none" aria-label="Talk to nearby person">💬 TALK · T</button><div class="joystick" id="joystick" aria-label="Movement joystick"><div class="stick" id="stick"></div></div>
 <div class="bottom-right"><button class="action" id="sprint-btn" aria-label="Sprint"><span class="ico">🏃</span><span class="lbl">SPRINT</span></button><button class="action" id="aim-btn" aria-label="Toggle aim" aria-pressed="false"><span class="ico">🎯</span><span class="lbl">AIM</span></button><button class="action" id="weapon-btn" aria-label="Choose weapon" aria-expanded="false"><span class="ico">🎒</span><span class="lbl">WEAPON</span></button><button class="action" id="reload-btn" aria-label="Reload"><span class="ico">🔄</span><span class="lbl">RELOAD</span></button><button class="action" id="interact-btn" aria-label="Enter or exit vehicle"><span class="ico">🚗</span><span class="lbl">RIDE</span></button><button class="action fire" id="fire-btn" aria-label="Fire weapon"><span class="ico">🔫</span><span class="lbl">FIRE</span></button><button class="action drive-control" id="reverse-btn" aria-label="Brake or reverse"><span class="ico">🛑</span><span class="lbl">BRAKE</span></button><button class="action drive-control" id="accelerate-btn" aria-label="Accelerate"><span class="ico">⛽</span><span class="lbl">GAS</span></button></div><div class="weapon-menu" id="weapon-menu" hidden aria-label="Choose weapon"></div>
 <div class="desktop-hint">WASD MOVE &nbsp; / &nbsp; DRAG TO LOOK &nbsp; / &nbsp; SPACE 🔫 FIRE &nbsp; / &nbsp; V 🎯 AIM &nbsp; / &nbsp; E 🚗 RIDE</div><div class="interaction" id="interaction"></div><div class="nitro-chip" id="nitro-chip" hidden>🔥 NITRO <b id="nitro-left"></b>s</div><div class="toast" id="toast" role="status"></div>
</div>
<div class="map-overlay" id="map-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="full-map-title">
 <div class="map-panel"><div class="map-heading"><div><span class="map-kicker">AIVM · CITY GUIDE</span><h2 id="full-map-title">FULL CITY MAP</h2></div><button class="map-close" id="close-map" aria-label="Close map">✕ <span>CLOSE</span></button></div>
 <div class="map-body"><div class="full-map-wrap"><canvas id="full-map" width="630" height="630" aria-label="North-up map showing the complete city streets, buildings and current objective"></canvas><span class="full-map-north">N ↑</span></div>
 <div class="map-legend"><strong>LEGEND</strong><span><b class="legend-you">▲</b> YOU</span><span><b class="legend-goal">◆</b> OBJECTIVE</span><span><b class="legend-route">━</b> GPS ROUTE</span><span><b class="legend-enemy">●</b> ENEMY</span><span><b class="legend-vehicle">■</b> VEHICLE</span><span><b style="color:#ffd166">●</b> STREET GIFT</span><span><b style="color:#72e2b6">●</b> HOME</span><span><b style="color:#f4d46c">●</b> MISSION HUB</span><span><b style="color:#ee85bd">●</b> CITY PLACES</span><small class="place-list" id="map-legend-list">H HOME · M MISSION HUB<br>TAP A PIN FOR GPS (FREE ROAM)</small><small>GAME PAUSED<br><span id="map-orient-note">Map turns as you turn.</span></small></div></div></div>
</div>
<div class="screen main-menu" id="intro"><div class="menu-shade"></div><div class="menu-content"><div class="menu-kicker">PALM GROVE CITY</div><img class="menu-logo" src="${import.meta.env.BASE_URL}assets/logo.png" alt="AIVM — AI Velocity Mobile"><p>YOUR CITY. YOUR STORY.</p><div class="menu-actions"><button class="primary" id="start">PLAY <span>↗</span></button><button class="menu-button" id="menu-districts">ENVIRONMENTS <span id="district-choice">CITY CENTRE</span></button><button class="menu-button" id="menu-activities">GAME MENU <span>↗</span></button><button class="menu-button" id="menu-map">CITY MAP <span>↗</span></button><button class="menu-button" id="menu-settings">SETTINGS <span>⚙</span></button><button class="menu-button" id="menu-account">ACCOUNT <span id="account-state">SIGN IN ↗</span></button></div><div class="menu-meta"><span>OPEN WORLD PROTOTYPE</span><span>MENU ART IS AN ILLUSTRATION</span></div></div></div>
<div class="district-overlay" id="district-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="district-title"><section class="district-panel"><div class="district-head"><div><small>ONE CONNECTED CITY · SEVEN DISTRICTS</small><h2 id="district-title">CHOOSE YOUR ENVIRONMENT</h2><p id="district-help">Swipe to explore. These are views from the game, not separate maps.</p></div><button id="district-close" class="dialog-close" aria-label="Close environment selection">✕</button></div><div class="district-scroll" id="district-scroll" aria-label="Available districts"></div><div class="district-footer"><span id="district-caption">Selected: Palm Grove</span><button id="district-travel" hidden>TRAVEL NOW ↗</button><button id="district-confirm">CONFIRM DISTRICT ↗</button></div></section></div>
<div class="game-menu-overlay" id="game-menu-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="game-menu-title"><section class="game-menu-card"><div class="dialog-head"><div><small>EXPLORE AIVM</small><h2 id="game-menu-title">GAME MENU</h2></div><button id="game-menu-close" class="dialog-close" aria-label="Close game menu">✕</button></div><p id="game-menu-note"></p><div id="game-menu-grid" class="game-menu-grid"></div></section></div>
<div class="arcade-overlay" id="arcade-overlay" hidden role="dialog" aria-modal="true" aria-label="Arcade"><section class="arcade-panel" id="arcade-panel"></section></div>
<div class="race-overlay" id="race-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="race-title"><section class="race-panel"><h2 id="race-title" class="sr-only">Race room</h2><div id="race-panel"></div></section></div>
<div class="race-hud" id="race-hud" hidden><div class="race-hud-top"><strong id="race-hud-track">CITY CIRCUIT</strong><span id="race-hud-timer">0:00</span></div><ol id="race-hud-list"></ol><div class="race-hud-next" id="race-hud-next">CP 1 / 5</div></div>
<div class="settings-modal" id="settings-panel" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="settings-card"><div class="dialog-head"><div><small>MAKE AIVM YOURS</small><h2 id="settings-title">SETTINGS</h2></div><button id="close-settings" class="dialog-close" aria-label="Close settings">✕</button></div><div class="settings-grid"><button id="sound-toggle" class="setting-toggle" aria-label="Toggle sound" aria-pressed="true">SOUND ON</button><button id="assist-toggle" class="setting-toggle" aria-label="Toggle aim assist" aria-pressed="true">ASSIST ON</button><label>👁️ LOOK SENSITIVITY <input id="sensitivity" type="range" min="1" max="10" value="5"></label><label>🎯 AIM SENSITIVITY <input id="aim-sensitivity" type="range" min="1" max="10" value="5"></label><label>🛞 STEERING SENSITIVITY <input id="steer-sensitivity" type="range" min="1" max="10" value="5"></label><button id="invert-look" class="setting-toggle" aria-pressed="false">INVERT LOOK OFF</button><button id="high-contrast" class="setting-toggle" aria-pressed="false">HIGH CONTRAST OFF</button><button id="voice-toggle" class="setting-toggle" aria-pressed="false">DIALOGUE VOICE OFF</button><label>🔉 SOUND EFFECTS <input id="sfx-volume" type="range" min="0" max="100"></label><label>🎵 MUSIC VOLUME <input id="music-volume" type="range" min="0" max="100"></label><button id="map-rotate" class="setting-toggle" aria-pressed="true">🧭 MAP TURNS WITH YOU ON</button><label>🎮 CONTROL SIZE <input id="control-size" type="range" min="70" max="140" value="100"></label><label>GRAPHICS <select id="graphics-quality"><option value="balanced">BALANCED</option><option value="performance">PERFORMANCE</option></select></label><label>🎵 MUSIC <select id="music-track"><option value="off">OFF</option><option value="coast">COAST DRIVE</option><option value="night">NIGHT CRUISE</option><option value="harbor">HARBOR LIGHTS</option><option value="race">RACE FUEL</option><option value="missions">MISSION WIRE</option><optgroup label="🎶 REAL SONGS · AFRO LIVE (CC0)"><option value="song-umlungu">UMLUNGU · JOHN BARTMANN</option><option value="song-kwela">A KWELA FELLA · JOHN BARTMANN</option><option value="song-iyanetha">IYANETHA · JOHN BARTMANN</option><option value="song-village">HAPPY AFRICAN VILLAGE · JOHN BARTMANN</option><option value="song-moon">AFRICAN MOON · JOHN BARTMANN</option><option value="song-west">WEST IN AFRICA · JOHN BARTMANN</option></optgroup><optgroup label="🎤 HIP HOP · REAL SONGS WITH VOICES (CC0)"><option value="song-seeme">WHEN YOU SEE ME NOW · HOLIZNARAPS</option><option value="song-greatest">GREATEST SELF · FLOWFORRHYTHM</option><option value="song-killpain">KILL THE PAIN · FLOWFORRHYTHM</option><option value="song-winning">THE WINNING TRACK · FLOWFORRHYTHM</option><option value="song-niceday">NICE DAY · FLOWFORRHYTHM</option></optgroup></select></label></div><button class="menu-button edit-control" id="settings-districts">🌍 CHANGE ENVIRONMENT <span>↗</span></button><button class="menu-button edit-control" id="edit-controls">🎮 CUSTOMISE CONTROLS <span>↗</span></button><p class="settings-note">Sound, music and layouts are saved on this device. Gameplay pauses while settings are open.</p></div></div>
<div class="layout-editor" id="layout-editor" hidden><div class="editor-bar"><div><strong>CONTROL LAYOUT</strong><small>Drag buttons into position · This screen orientation</small></div><div><button id="layout-reset">RESET</button><button id="layout-save">SAVE</button></div></div><div class="editor-modes"><button id="edit-foot" class="active">ON FOOT</button><button id="edit-driving">DRIVING</button></div><div id="layout-items"></div></div>
<div class="place-overlay" id="place-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="place-title"><div class="place-card"><div class="dialog-head"><div><small>PALM GROVE · CITY LIFE</small><h2 id="place-title"></h2></div><button id="place-close" class="dialog-close" aria-label="Close location">✕</button></div><p id="place-desc"></p><div id="place-actions" class="place-actions"></div></div></div>
<div class="scope-overlay" id="scope-overlay" hidden aria-label="Sniper scope"><div class="scope-vignette"></div><div class="scope-cross"><i></i><i></i></div><div class="scope-ui"><button id="scope-zoom-in" aria-label="Zoom lens in">🔍 LENS +</button><button id="scope-zoom-out" aria-label="Zoom lens out">🔍 LENS −</button><button id="scope-breath" aria-label="Hold breath to steady the scope">🫁 HOLD BREATH</button><button id="scope-leave" aria-label="Leave the roof">❌ LEAVE ROOF</button><div class="scope-info" id="scope-info">LENS 2× · 🫁 TO STEADY</div></div></div>
<div class="jail-overlay" id="jail-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="jail-title"><div class="jail-card"><h2 id="jail-title">🚔 BUSTED</h2><p id="jail-text"></p><p class="jail-count" id="jail-count">RELEASE IN 25s</p><button id="jail-bail" class="primary">💵 PAY BAIL · $150</button></div></div>
<div class="screen hidden" id="end"><div class="panel"><div class="panel-kicker" id="end-kicker">MISSION REPORT</div><h1 id="end-title">RUN <span>COMPLETE.</span></h1><div class="lead" id="end-text"></div><div class="feature-row"><span>THANKS FOR PLAYING</span><span>PROTOTYPE BUILD</span></div><button class="primary" id="retry">RETRY MISSION &nbsp; ↗</button><button class="secondary" id="return-city" hidden>RETURN TO CITY</button><button class="secondary" id="restart">START OVER</button></div></div>
<div class="screen hidden" id="account-screen"><div class="panel"><div class="panel-kicker">AIVM ACCOUNT</div><h1 id="account-title">SIGN <span>IN.</span></h1>
<form id="account-form" class="account-form" autocomplete="off" novalidate>
<p class="lead" id="account-lead">Quick email + password. Your cash, weapons and garage are saved to your account — sign in again and you continue exactly where you left off.</p>
<label for="account-email">EMAIL<input id="account-email" type="email" inputmode="email" placeholder="you@example.com" autocomplete="username"></label>
<label for="account-password">PASSWORD<input id="account-password" type="password" placeholder="At least 4 characters" autocomplete="current-password"></label>
<p class="account-msg" id="account-msg" role="status"></p>
<div class="account-actions"><button type="submit" class="primary" id="account-signin">SIGN IN ↗</button><button type="button" class="secondary" id="account-create">✨ CREATE ACCOUNT</button></div>
</form>
<div id="account-signed" hidden><p class="lead">SIGNED IN AS <strong id="account-email-display"></strong></p><p class="account-msg">Your save follows this account on this device.</p><div class="account-actions"><button class="secondary" id="account-signout">SIGN OUT</button></div></div>
<button class="secondary" id="account-close">CLOSE</button>
<div class="feature-row"><span>SAVED ON THIS DEVICE</span><span>GUEST PLAY STILL WORKS</span></div></div></div>`;

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.15));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const scene = new THREE.Scene();
// A warm coastal sky and haze give the district an afternoon identity.
const sky=document.createElement('canvas');sky.width=16;sky.height=256;const skyCtx=sky.getContext('2d');const skyGradient=skyCtx.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#78afc7');skyGradient.addColorStop(.5,'#bed0c7');skyGradient.addColorStop(1,'#f4c899');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,16,256);const skyTexture=new THREE.CanvasTexture(sky);skyTexture.colorSpace=THREE.SRGBColorSpace;scene.background=skyTexture;scene.fog=new THREE.Fog(0xd1c7ac,110,270);
const camera=new THREE.PerspectiveCamera(58,1,.1,420);
scene.add(new THREE.HemisphereLight(0xd8ebf3,0x786b56,1.9));
const sun=new THREE.DirectionalLight(0xffd3a1,2.5);sun.position.set(-35,75,30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:160});sun.shadow.bias=-.0005;scene.add(sun,sun.target);
const world=createWorld(scene), homeInterior=createHome(scene), interiorSet=createInteriors(scene), models=createModels(renderer);
const interiors=interiorSet.rooms, interiorSpots=interiorSet.spots;
const player=world.person(0x819d4d);scene.add(player);player.position.set(0,0,13);models.person(player,'player');
// Parked vehicles are rideable and drawn from the catalog, so every street shows
// a different mix of marques instead of one repeated car.
const cityRandom=mulberry32(4711);
// Kerb-side parking: 5.6m off a street centre line, 7m along it, which keeps
// every car out of building footprints and off the driving lane.
const PARK_OFFSETS=[-105,-77,-49,-21,7,35,63,91,119];
const PARK_ROADS=[-112,-56,0,56,112];
const PARK_MIX=['sable-240','palm-cab','tundra-trail','kestrel-250','vantor-s','bruma-carrier','sable-gth','mara-trail','haulmaster-900','vantor-gl','breeze-courier','fallow-flatbed','orbit-600','metro-pd','city-sanitation','zephyr-cruiser','corsair-blaze','halcyon-proto','metro-ems','palm-kart','harvest-tractor','metro-fire','sable-240','tundra-trail','kestrel-250','palm-cab'];
const parking=[];
for(const [i,road] of PARK_ROADS.entries())for(const [j,along] of PARK_OFFSETS.entries()){
  const id=PARK_MIX[(i*PARK_OFFSETS.length+j)%PARK_MIX.length];
  const side=(i+j)%2?1:-1,x=road+side*5.6,z=along;
  if(LANDMARKS.some(place=>Math.hypot(place.x-x,place.z+8-z)<10))continue;
  if(parking.length>=26)break;
  parking.push([id,x,z,side>0?0:Math.PI]);
}
function catalogVehicle(id,x,z,yaw=0){
  const entry=vehicleById(id)||vehicleById('sable-240');
  const v=world.vehicle(entry.kind==='bike'?'bike':'car',x,z,entry.length);
  applyCatalog(v,entry,tintFor(entry,cityRandom));
  v.mesh.rotation.y=yaw;v.mesh.visible=false;v.requested=false;
  return v;
}
const vehicles=parking.map(([id,x,z,yaw])=>catalogVehicle(id,x,z,yaw));
// Signed-in accounts save under their own scoped keys, so anyone who created
// an account can sign back in and continue from where they left off.
let storage=null;try{storage=window.localStorage}catch{}
let accountScope=null;{const sessionAccount=getSessionAccount(storage);if(sessionAccount)accountScope=sessionAccount.id;setProgressScope(accountScope)}
// Bought vehicles are remembered and can be called to the player's side.
function garageKey(){return accountScope?`aivm-garage#${accountScope}`:'aivm-garage'}
let ownedVehicles=[];function loadGarage(){try{ownedVehicles=JSON.parse(storage?.getItem(garageKey())||'[]')}catch{ownedVehicles=[]}}
loadGarage();
let lastOwnedVehicle=null;
// "Continue where you left off": a small per-account snapshot (spot on the map,
// health, heat, weapon and ammo) saved as you play, on sign-out and when the
// tab closes; pressing PLAY restores it for whoever is signed in.
const RESUME_KEY='aivm-resume-v1';
function resumeKey(){return accountScope?`${RESUME_KEY}#${accountScope}`:RESUME_KEY}
function saveResume(){try{storage?.setItem(resumeKey(),JSON.stringify({v:1,x:+player.position.x.toFixed(1),z:+player.position.z.toFixed(1),yaw:+cameraYaw.toFixed(2),health:Math.round(health),heat,weaponIndex,ammo:ammo.slice()}))}catch{}}
function loadResume(){try{const d=JSON.parse(storage?.getItem(resumeKey())||'null');return d&&Number.isFinite(d.x)&&Number.isFinite(d.z)?d:null}catch{return null}}
let lastResumeSave=0;
// Ambient traffic drives both axes. Each district gets its own mix, so the port
// runs trucks and the market runs bikes, the way a real city does.
const TRAFFIC_MIX={
  city:['sable-240','palm-cab','vantor-s','tundra-trail','kestrel-250','sable-gth','bruma-carrier','breeze-courier'],
  downtown:['palm-cab','vantor-s','vantor-gl','sable-240','metro-pd','corsair-blaze','halcyon-proto','breeze-courier','tundra-trail'],
  market:['kestrel-250','mara-trail','sable-240','bruma-carrier','breeze-courier','haulmaster-900','tundra-trail','orbit-600','palm-cab'],
  village:['kestrel-250','mara-trail','tundra-trail','harvest-tractor','sable-240','haulmaster-900','zephyr-cruiser'],
  harbor:['haulmaster-900','breeze-courier','city-sanitation','metro-pd','sable-240','fallow-flatbed','metro-ems','bruma-carrier'],
  hills:['tundra-trail','vantor-gl','mara-trail','metro-ems','sable-240','palm-cab'],
  desert:['haulmaster-900','tundra-trail','mara-trail','harvest-tractor','metro-fire','fallow-flatbed'],
};
function trafficMixAt(x,z){return TRAFFIC_MIX[districtAt(x,z)]||TRAFFIC_MIX.city}
const traffic=[];
for(const [i,road] of [-112,-84,-56,-28,0,28,56,84,112].entries()){
  for(const [j,along] of [-95,-40,15,70,120].entries()){
    if((i*5+j)%2===1)continue;
    const axis=j%2?'x':'z',side=(i+j)%2?1:-1;
    const x=axis==='z'?road+side*3:along, z=axis==='z'?along:road+side*3;
    if(LANDMARKS.some(place=>Math.hypot(place.x-x,place.z+8-z)<9))continue;
    const mix=trafficMixAt(x,z),id=mix[(i+j*3)%mix.length];
    const car=catalogVehicle(id,x,z,axis==='z'?(side>0?Math.PI:0):(side>0?-Math.PI/2:Math.PI/2));
    car.occupied=true;car.requested=false;
    traffic.push({x:car.mesh.position.x,z:car.mesh.position.z,axis,dir:side,speed:id==='harvest-tractor'||id==='city-sanitation'?3.4:(car.type==='bike'?6.4:5.4),car,id});
  }
}
// --- Dense city crowd ---
// People walk the pavement lanes, loiter around every door, sit on benches,
// shout from market stalls and stop to talk face to face in pairs.
const civilians=createCrowd({seed:20260});
const CROWD_MODEL_DISTANCE=27, CROWD_VIEW_DISTANCE=64, CROWD_MODEL_BUDGET=22;
let crowdModelsLoaded=0;
for(const [i,c] of civilians.entries()){
  const mesh=world.simplePerson(0x718b94);mesh.position.set(c.x,0,c.z);mesh.rotation.y=c.ry;mesh.visible=false;scene.add(mesh);
  c.mesh=mesh;c.walk=i*1.7;c.requested=false;c.animElapsed=0;c.ejected=false;
}
// Rooms are populated too: every enterable place has its own small crowd, and
// pairs inside face each other exactly like the street conversations.
const interiorPeople={},interiorLife={};
for(const [id,room] of Object.entries(interiors)){
  const spots=interiorSpots[id]||[];
  const life=createInteriorLife(spots,{seed:id.length*13+spots.length*5+7});
  interiorLife[id]=life;
  interiorPeople[id]=life.map((agent,i)=>{
    const mesh=world.simplePerson(0x718b94);mesh.position.set(agent.x,0,agent.z);mesh.rotation.y=agent.ry;mesh.visible=false;room.add(mesh);
    return {mesh,role:agent.role,ry:agent.ry,requested:false,walk:i*1.3,animElapsed:0,talkPhase:i*2.1,x:agent.x,z:agent.z,agent};
  });
}
// Doors turn over all over the city: when somebody leaves a room they step out
// onto the pavement as a real pedestrian, and coming back in absorbs one walker
// who was passing the door — so places breathe from both sides.
const lifeStats={talks:0,exits:0,enters:0};
function doorEvent(id,event){
  const place=landmarkById(id);if(!place)return;
  const door=entrance(place);
  if(event.type==='exit'){
    if(civilians.length>195)return;
    const x=door.x+(cityRandom()-.5)*2.4,z=door.z+1.6;
    const mesh=world.simplePerson(0x718b94);mesh.position.set(x,0,z);mesh.rotation.y=0;mesh.visible=false;scene.add(mesh);
    civilians.push({x,z,ry:0,dir:1,speed:1.8,mode:'walk',district:districtAt(x,z),role:'civilian-warm',lane:{axis:'z',fixed:x,from:Math.max(-138,z-32),to:Math.min(138,z+32)},anchor:null,radius:0,pause:0,think:3,line:null,lineUntil:0,cooldown:gameTime+8,partner:null,mesh,walk:0,requested:false,animElapsed:0,doorful:true,id:civilians.length+2000});
  }else{
    let best=null,bestDistance=9;
    for(const c of civilians){if(c.doorful)continue;const d=Math.hypot(c.x-door.x,c.z-door.z);if(d<bestDistance){bestDistance=d;best=c}}
    if(best){scene.remove(best.mesh);civilians.splice(civilians.indexOf(best),1)}
  }
}
const interiorCrowd=id=>interiorPeople[id]||[];
// Speech bubbles for nearby conversations, projected over the canvas.
const bubbles=createBubbles(document.querySelector('#app'),{pool:4});
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
  if(moving)p.z+=animal.dir*(flee?2.8:1.05)*dt;animal.mesh.rotation.y=animal.dir>0?0:Math.PI;animal.mesh.visible=distance<65;if(distance<65)animateAnimal(animal.mesh,moving,dt);
 }
 for(const bird of birds){const p=bird.mesh.position,alert=fireHeld&&p.distanceTo(pos)<18;if(Math.abs(p.z-bird.start)>2)bird.dir*=-1;p.z+=bird.dir*(alert?1.8:.3)*dt;bird.mesh.rotation.y=bird.dir>0?Math.PI:0;}
}
function updateCity(dt,playerPos){
 for(const v of vehicles){const distance=Math.hypot(v.mesh.position.x-playerPos.x,v.mesh.position.z-playerPos.z);v.mesh.visible=distance<88||v.occupied;if(v.mesh.visible&&!v.requested){v.requested=true;models.vehicle(v,v.tint)}}
 for(const t of traffic){
  const p=t.car.mesh.position,distance=Math.hypot(p.x-playerPos.x,p.z-playerPos.z);
  t.car.mesh.visible=distance<88;if(t.car.mesh.visible&&!t.car.requested){t.car.requested=true;models.vehicle(t.car,t.car.tint)}
  // Traffic slows for the player instead of driving straight through them.
  const playerNear=!insideHome&&!vehicle&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<7;
  const speed=distance<9||playerNear?0:t.speed;
  if(t.axis==='x'){p.x+=t.dir*speed*dt;if(p.x>140)p.x=-140;if(p.x< -140)p.x=140}else{p.z+=t.dir*speed*dt;if(p.z>140)p.z=-140;if(p.z< -140)p.z=140}
  t.x=p.x;t.z=p.z;
  if(distance<88)for(const wheel of t.car.wheels)wheel.rotation.x-=speed*dt*.8;
 }
 // One crowd step drives walking, loitering, sitting and conversations.
 stepCrowd(civilians,dt,{time:gameTime,focus:playerPos,flee:fireHeld&&!insideHome,viewDistance:CROWD_VIEW_DISTANCE+16,random:cityRandom});
 for(const c of civilians){
  const p=c.mesh.position,distance=Math.hypot(c.x-playerPos.x,c.z-playerPos.z);
  p.x=c.x;p.z=c.z;c.mesh.rotation.y=c.ry;
  c.mesh.visible=distance<CROWD_VIEW_DISTANCE&&!insideHome;
  if(c.mesh.visible&&!c.requested&&distance<CROWD_MODEL_DISTANCE&&crowdModelsLoaded<CROWD_MODEL_BUDGET){c.requested=true;crowdModelsLoaded++;models.person(c.mesh,c.role)}
  if(!c.mesh.visible)continue;
  c.walk+=dt;c.animElapsed+=dt;
  const talking=c.mode==='talk'||c.mode==='vendor'||c.mode==='sit';
  setCivilianLOD(c.mesh,distance>22);
  const moving=c.mode==='walk'&&!talking;
  if(distance<CROWD_MODEL_DISTANCE+6||c.animElapsed>=.14){animateWalk(c.mesh,moving?(c.speed>2?.95:.55):0,c.walk,c.animElapsed,false,false,moving&&c.speed>2.6);c.animElapsed=0}
  if(talking&&distance<CROWD_MODEL_DISTANCE+8)applyTalkGesture(c.mesh,gameTime+c.walk,c.mode==='talk'?1:.45);
 }
}
// Speech bubbles follow the nearest conversations, one per pair.
function updateBubbles(){
 if(!started||ended){bubbles.clear();return}
 const entries=extraBubbles.filter(b=>b.until>gameTime).map(b=>({x:b.x,y:b.y??0,z:b.z,text:b.text}));
 if(!insideHome&&!placeOpen&&!mapOpen&&!settingsOpen&&!raceOpen&&!gameMenuOpen){
  const focus=vehicle?vehicle.mesh.position:player.position;
  for(const agent of nearestConversations(civilians,focus,{limit:3,radius:vehicle?26:19}))entries.push({x:agent.x,y:0,z:agent.z,text:agent.line});
 }
 bubbles.update(entries,camera);
}
// Word bubbles for the player and whoever they are talking to right now.
const extraBubbles=[];
function sayBubble(x,z,text,seconds=3.4,y){extraBubbles.push({x,z,y,text,until:gameTime+seconds});if(extraBubbles.length>8)extraBubbles.shift()}
function playerBark(text){sayBubble(player.position.x,player.position.z,text,2.6);if(voiceLines&&!muted&&'speechSynthesis' in window)try{const u=new SpeechSynthesisUtterance(text);u.pitch=.85;u.volume=sfxVolume;window.speechSynthesis.speak(u)}catch{}}
const lime=new THREE.MeshBasicMaterial({color:0xcaff5b});
const marker=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.1,8,40),lime);ring.rotation.x=Math.PI/2;ring.position.y=.22;marker.add(ring);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,22,8),new THREE.MeshBasicMaterial({color:0xc9fc51,transparent:true,opacity:.7,depthWrite:false}));beam.position.y=11;marker.add(beam);
const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.8),lime);diamond.position.y=4;marker.add(diamond);scene.add(marker);
const JAIL={x:-48,z:-104};
{
 const barMat=new THREE.MeshStandardMaterial({color:0x66757d,metalness:.55,roughness:.45});
 const jailGroup=new THREE.Group();
 for(let i=0;i<9;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3,6),barMat);bar.position.set(JAIL.x-2+i*.5,1.5,JAIL.z+2);jailGroup.add(bar)}
 for(let i=0;i<9;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3,6),barMat);bar.position.set(JAIL.x-2,1.5,JAIL.z+2-i*.5);jailGroup.add(bar);const bar2=bar.clone();bar2.position.x=JAIL.x+2;jailGroup.add(bar2)}
 const wallMat=new THREE.MeshStandardMaterial({color:0x3d4a4f,roughness:.9});
 const back=new THREE.Mesh(new THREE.BoxGeometry(4.6,3,.25),wallMat);back.position.set(JAIL.x,1.5,JAIL.z-2);jailGroup.add(back);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(4.8,.22,4.8),wallMat);floor.position.set(JAIL.x,.11,JAIL.z);jailGroup.add(floor);
 const bunk=new THREE.Mesh(new THREE.BoxGeometry(1.8,.5,.8),new THREE.MeshStandardMaterial({color:0x8a6a4a}));bunk.position.set(JAIL.x-1,.5,JAIL.z-1.4);jailGroup.add(bunk);
 const sign=new THREE.Mesh(new THREE.BoxGeometry(2.4,.6,.1),new THREE.MeshBasicMaterial({color:0xc9fc51}));sign.position.set(JAIL.x,3.3,JAIL.z+2);jailGroup.add(sign);
 scene.add(jailGroup);
}

// --- Floating street pickups: health, cash, ammo, nitro, free cars, heat-down.
// They bob and glow on roadsides all over the city; walk or drive through one
// to grab it. Grabbed pickups cool down and come back as a random new gift.
const PICKUP_TYPES={
 health:{emoji:'❤️',color:0xff5d7a,weight:.2},
 money:{emoji:'💵',color:0x72e2b6,weight:.24},
 ammo:{emoji:'🔫',color:0xf0d17d,weight:.14},
 nitro:{emoji:'🔥',color:0xff9d4f,weight:.16},
 car:{emoji:'🚗',color:0x8fd0e8,weight:.08},
 cool:{emoji:'🧊',color:0x9fc0d8,weight:.18},
};
const PICKUP_KEYS=Object.keys(PICKUP_TYPES);
function pickPickupType(){let r=Math.random(),total=0;for(const k of PICKUP_KEYS){total+=PICKUP_TYPES[k].weight;if(r<=total)return k}return 'money'}
const PICKUP_SPOTS=[];
for(const rx of [-84,-56,-28,0,28,56,84])for(const rz of [-70,0,70]){
  const x=rx+5.6,z=rz;
  if(LANDMARKS.some(place=>Math.hypot(place.x-x,place.z+8-z)<10))continue;
  PICKUP_SPOTS.push({x,z});
}
let pickups=[],nitroUntil=0;
const pickupTextures={};
function pickupTexture(type){
 const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');
 g.fillStyle='#'+PICKUP_TYPES[type].color.toString(16).padStart(6,'0');g.globalAlpha=.3;g.beginPath();g.arc(48,48,44,0,7);g.fill();
 g.globalAlpha=1;g.font='56px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(PICKUP_TYPES[type].emoji,48,52);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function applyPickupLook(pickup){
 const t=PICKUP_TYPES[pickup.type];
 pickupTextures[pickup.type]=pickupTextures[pickup.type]||pickupTexture(pickup.type);
 pickup.sprite.material.map=pickupTextures[pickup.type];pickup.sprite.material.needsUpdate=true;
 pickup.ring.material.color.setHex(t.color);
}
function createPickup(spot){
 const group=new THREE.Group();
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false}));sprite.scale.set(1.5,1.5,1);sprite.position.y=1.35;group.add(sprite);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.05,8,28),new THREE.MeshBasicMaterial({color:0xffffff}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;group.add(ring);
 group.position.set(spot.x,0,spot.z);scene.add(group);
 const pickup={type:pickPickupType(),group,sprite,ring,seed:Math.random()*7,cooldown:0};
 applyPickupLook(pickup);
 return pickup;
}
function resetPickup(pickup){pickup.type=pickPickupType();applyPickupLook(pickup);pickup.cooldown=0;pickup.seed=Math.random()*7;pickup.group.visible=true;const spot=PICKUP_SPOTS[Math.floor(Math.random()*PICKUP_SPOTS.length)];pickup.group.position.x=spot.x;pickup.group.position.z=spot.z}
function collectPickup(pickup){
 if(pickup.type==='health'){health=Math.min(100,health+40);showToast('❤️ HEALTH +40')}
 else if(pickup.type==='money'){const amount=150+Math.floor(Math.random()*110);reward(progress,amount);saveProgress(storage,progress);refreshCash();showToast(`💵 STREET CASH · +$${amount}`)}
 else if(pickup.type==='ammo'){ammo.forEach((n,i)=>{ammo[i]=weapons[i].cap});showToast('🔫 FULL AMMO ON EVERY WEAPON')}
 else if(pickup.type==='nitro'){nitroUntil=gameTime+10;showToast('🔥 NITRO · 10 SECONDS OF SPEED')}
 else if(pickup.type==='car'){
  const pool=VEHICLE_CATALOG.filter(entry=>entry.sale&&!ownedVehicles.includes(entry.id));
  if(pool.length){const entry=pool[Math.floor(Math.random()*pool.length)];ownedVehicles.push(entry.id);saveGarage();const pos=vehicle?vehicle.mesh.position:player.position;const road={x:Math.round(pos.x/28)*28+5.6,z:Math.round(pos.z/28)*28};spawnOwnedVehicle(entry.id,{x:road.x,z:road.z,yaw:0});showToast(`🚗 FREE CAR · ${entry.brand} ${entry.model} ADDED TO YOUR GARAGE · IT IS WAITING ON THE STREET`)}
  else{reward(progress,500);saveProgress(storage,progress);refreshCash();showToast('🚗 YOU ALREADY OWN THEM ALL · +$500 INSTEAD')}
 }
 else if(pickup.type==='cool'){heat=Math.max(0,heat-1);updateHeat();if(heat<2)clearPolice();showToast('🧊 HEAT DOWN · THE COPS COOL OFF')}
 sound('success');pickup.group.visible=false;pickup.cooldown=gameTime+50;
}
function nearestPickup(pos){let best=null,bd=1e9;for(const pickup of pickups){if(pickup.cooldown||!pickup.group.visible)continue;const d=Math.hypot(pos.x-pickup.group.position.x,pos.z-pickup.group.position.z);if(d<bd){bd=d;best=pickup}}return best?{pickup:best,d:bd}:null}
function updatePickups(dt,pos){
 for(const pickup of pickups){
  if(pickup.cooldown){if(gameTime>=pickup.cooldown)resetPickup(pickup);continue}
  pickup.group.position.y=Math.sin(gameTime*2+pickup.seed)*.22;
  pickup.sprite.material.rotation+=dt*.8;pickup.ring.rotation.z+=dt*1.4;
  pickup.ring.scale.setScalar(1+Math.sin(gameTime*3+pickup.seed)*.12);
  if(!insideHome&&!race?.net&&Math.hypot(pos.x-pickup.group.position.x,pos.z-pickup.group.position.z)<2.2)collectPickup(pickup);
 }
}
for(const spot of PICKUP_SPOTS)pickups.push(createPickup(spot));

const weapons=[{name:'PISTOL',cap:12,rate:.32,damage:34,range:28},{name:'ASSAULT RIFLE',cap:30,rate:.12,damage:18,range:34},{name:'SHOTGUN',cap:6,rate:.7,damage:68,range:19},{name:'SMG',cap:36,rate:.09,damage:14,range:26,unlock:'smg'},{name:'MARKSMAN',cap:8,rate:.8,damage:85,range:55,unlock:'sniper'},{name:'REVOLVER',cap:6,rate:.55,damage:60,range:31,unlock:'revolver'},{name:'BATTLE RIFLE',cap:20,rate:.18,damage:29,range:42,unlock:'battle'},{name:'MACHINE GUN',cap:60,rate:.07,damage:12,range:30,auto:true,unlock:'mg'},{name:'BAZOOKA',cap:1,rate:1.9,damage:0,range:70,explosive:true,unlock:'bazooka'}];
const ammo=weapons.map(w=>w.cap),enemies=[],shots=[],keys={};
const preferences=loadPreferences(storage), progress=loadProgress(storage); let controlLayout=loadLayout(storage);
let mapOpen=false, settingsOpen=false, placeOpen=false, editingLayout=false, districtOpen=false, arcadeOpen=false, gameMenuOpen=false, raceOpen=false, sideMission=null, activity=null, selectedDistrict=DISTRICTS[0], insideHome=true, interiorPlace=LANDMARKS[0], missionActive=false, rival=null, dropKills=0; let mapRotate=preferences.mapRotate, controlScale=preferences.controlScale, scoped=false, scopeZoom=1, breathUntil=0, sniperActive=false, tempSniper=false, sniperPrev=null, sniperSpawns=[], lastBark=-9;
let music=null,songRadio=null, sfxVolume=preferences.sfxVolume,musicVolume=preferences.musicVolume,musicTrack=preferences.musicTrack,graphicsQuality=preferences.graphicsQuality; const rewardsPaid=new Set();
let vehicle=null, vehicleSpeed=0, health=100, mission=0, phase=0, kills=0, heat=0, started=false, ended=false, sideMissionKills=0, fireHeld=false, sprintHeld=false, aiming=false, aimAssist=preferences.aimAssist, lookSensitivity=preferences.lookSensitivity, aimSensitivity=preferences.aimSensitivity, steerSensitivity=preferences.steerSensitivity, invertLook=preferences.invertLook, highContrast=preferences.highContrast, voiceLines=preferences.voiceLines;
const firePointers=new Set(),inputResets=[];let keyboardFire=false,gasHeld=false,brakeHeld=false,weaponMenuOpen=false;
let lastShot=-1,lastReinforcement=0,lastStepSound=0,lastEngineSound=0,weaponIndex=0,reloadEnd=0,toastTimer=0,gameTime=0,cameraYaw=0,lookPitch=0, joy={x:0,y:0}, audio=null, muted=preferences.muted, walkCycle=0;
const objectives=[{x:0,z:-56},{x:56,z:-28},{x:-28,z:-28},{x:28,z:28},{x:-56,z:28}];let target=entrance(LANDMARKS.find(p=>p.id==='hub')), currentRoute=[], routeTarget=null, nextRouteUpdate=0;
const raycaster=new THREE.Raycaster(), cameraDesired=new THREE.Vector3(), cameraFocus=new THREE.Vector3();

const audioBuffers={};
async function prepareAudio(){
 if(!audio)return;
 await Promise.all(['pistol','rifle','shotgun','reload'].map(async name=>{try{const response=await fetch(`${import.meta.env.BASE_URL}assets/audio/${name}.mp3`);if(response.ok)audioBuffers[name]=await audio.decodeAudioData(await response.arrayBuffer())}catch{}}));
}
function sound(kind){
 if(!audio||muted)return;const now=audio.currentTime;
 const key=kind==='shot'?['pistol','rifle','shotgun','rifle','rifle','pistol','rifle','rifle','boom'][weaponIndex]:kind==='reload'?'reload':kind==='npcshot'?'pistol':null;
 if(key&&audioBuffers[key]){const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=audioBuffers[key];gain.gain.value=(kind==='shot'?.25:kind==='npcshot'?.1:.2)*sfxVolume;source.connect(gain);gain.connect(audio.destination);source.start();return}
 const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);
 if(kind==='shot'){osc.type='sawtooth';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(45,now+.09);gain.gain.setValueAtTime(Math.max(.0001,.075*sfxVolume),now);gain.gain.exponentialRampToValueAtTime(.001,now+.1);osc.start(now);osc.stop(now+.1)}
 else if(kind==='boom'){osc.type='sawtooth';osc.frequency.setValueAtTime(120,now);osc.frequency.exponentialRampToValueAtTime(28,now+.5);gain.gain.setValueAtTime(Math.max(.0001,.3*sfxVolume),now);gain.gain.exponentialRampToValueAtTime(.001,now+.55);osc.start(now);osc.stop(now+.55);const noise=audio.createBufferSource(),buf=audio.createBuffer(1,audio.sampleRate*.4,audio.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);noise.buffer=buf;const ng=audio.createGain();ng.gain.value=.22*sfxVolume;noise.connect(ng);ng.connect(audio.destination);noise.start();return}
 else if(kind==='step'||kind==='engine'){osc.type=kind==='step'?'triangle':'sawtooth';osc.frequency.setValueAtTime(kind==='step'?95:65,now);osc.frequency.exponentialRampToValueAtTime(kind==='step'?45:48,now+.11);gain.gain.setValueAtTime(Math.max(.0001,(kind==='step'?.018:.012)*sfxVolume),now);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);osc.start(now);osc.stop(now+.12)}
 else {osc.type='sine';osc.frequency.setValueAtTime(kind==='success'?660:330,now);osc.frequency.exponentialRampToValueAtTime(kind==='success'?990:180,now+.16);gain.gain.setValueAtTime(Math.max(.0001,.065*sfxVolume),now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);osc.start(now);osc.stop(now+.2)}
}
const engineAudio={nodes:null,trafficNodes:null,
 start(kind){if(!audio||this.nodes)this.stop();if(!audio)return;const o1=audio.createOscillator(),o2=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=900;g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(audio.destination);o1.start();o2.start();this.nodes={o1,o2,g,f,kind}},
 update(speed,throttle,kind,nitro=false){const n=this.nodes;if(!n||!audio)return;const rpm=Math.min(1,Math.abs(speed)/(kind==='bike'?26:34)+(throttle>0?.3:0));const base=(kind==='bike'?95:55)*(nitro?1.35:1),freq=base*(1+rpm*2.6)+Math.max(0,throttle)*24,t=audio.currentTime;
  n.o1.frequency.setTargetAtTime(freq,t,.08);n.o2.frequency.setTargetAtTime(freq*1.5+4,t,.08);n.f.frequency.setTargetAtTime(500+rpm*2000,t,.1);
  n.g.gain.setTargetAtTime(muted?0:Math.max(.0001,(.03+rpm*.05+(throttle>0?.022:0))*sfxVolume),t,.09)},
 stop(){if(!this.nodes||!audio)return;const {o1,o2,g}=this.nodes,t=audio.currentTime;g.gain.setTargetAtTime(0,t,.05);try{o1.stop(t+.3);o2.stop(t+.3)}catch{}this.nodes=null},
 traffic(speed,dist,kind){if(!audio)return;if(!this.trafficNodes){const o=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();o.type='sawtooth';f.type='lowpass';f.frequency.value=750;g.gain.value=0;o.connect(f);f.connect(g);g.connect(audio.destination);o.start();this.trafficNodes={o,g,f}}
  const n=this.trafficNodes,t=audio.currentTime,prox=Math.max(0,1-dist/24);
  n.o.frequency.setTargetAtTime((kind==='bike'?92:56)*(1+Math.min(1,Math.abs(speed)/30)*2.2),t,.12);
  n.g.gain.setTargetAtTime(muted?0:.022*prox*sfxVolume,t,.18)},
 trafficStop(){if(!this.trafficNodes||!audio)return;const {o,g}=this.trafficNodes;g.gain.setTargetAtTime(0,audio.currentTime,.12);try{o.stop(audio.currentTime+.5)}catch{}this.trafficNodes=null}};
function setVocalSafe(track,buffer){try{music?.setVocal?.(track,buffer)}catch{}}
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
function rewardMission(index,amount){if(rewardsPaid.has(index))return;rewardsPaid.add(index);reward(progress,amount);saveProgress(storage,progress);$('cash-display').textContent=`$${progress.money}`;showToast(`MISSION COMPLETE · +$${amount}`)}
function beginSecondMission(){rewardMission(0,750);mission=1;phase=0;target=objectives[2];heat=1;restoreHealth();spawnEnemy(-28,-33);spawnEnemy(-33,-28);spawnEnemy(-23,-28);spawnEnemy(-28,-23);setObjective('THE AMBUSH','Reach the stolen case. Eliminate the guards.',2,'GUARDS DOWN  0 / 4');showToast('DELIVERY COMPLETE · +$750');sound('success')}

function updateMission(){
 if(race)return;
 const pos=vehicle?vehicle.mesh.position:player.position,dist=Math.hypot(pos.x-(target?.x??pos.x),pos.z-(target?.z??pos.z));
 if(mission===0&&phase===0&&dist<4.5){phase=1;target=objectives[1];heat=1;startRival();setObjective('FIRST DELIVERY','Rival car on your tail! Ride to the drop.',1,'PURSUIT ACTIVE');showToast('RIVAL IN PURSUIT  ·  GET TO THE DROP');sound('success')}
 else if(mission===0&&phase===1&&dist<5){phase=2;removeRival();dropKills=0;spawnEnemy(56,-42,'drop-guard');spawnEnemy(42,-28,'drop-guard');spawnEnemy(70,-28,'drop-guard');setObjective('DROP ZONE','Exit your ride and clear the attackers.',1,'ATTACKERS DOWN  0 / 3');showToast('AMBUSH AT THE DROP  ·  CLEAR THE AREA');sound('success')}
 else if(mission===0&&phase===2&&dropKills>=3){beginSecondMission()}
 else if(mission===1&&phase===0&&kills>=4){phase=1;setObjective('THE AMBUSH','Area clear. Collect the case at the marker.',2,'GUARDS DOWN  4 / 4');showToast('AREA CLEAR  ·  COLLECT THE CASE');sound('success')}
 else if(mission===1&&phase===1&&dist<4.5){phase=2;target=objectives[3];setObjective('THE AMBUSH','Case secured. Take it to the contact.',2);showToast('CASE SECURED  ·  GET TO THE CONTACT');sound('success')}
 else if(mission===1&&phase===2&&dist<5){rewardMission(1,1000);mission=2;phase=0;target=objectives[4];heat=2;restoreHealth();spawnEnemy(25,20,'pursuer');spawnEnemy(31,20,'pursuer');spawnEnemy(28,37,'pursuer');lastReinforcement=gameTime;setObjective('HOT RUN','Get to the safe house. Expect resistance.',3);showToast('AMBUSH COMPLETE · +$1000');sound('success')}
 else if(mission===2&&dist<5){rewardMission(2,1500);finish(true)}
}
function beginSideActivity(id){if(missionActive)return;activity=startActivity(id);if(!activity)return;missionActive=true;target=activity.points[0];routeTarget=null;closePlace();setObjective(activity.title,activity.description,1,`CHECKPOINT 1 / ${activity.points.length}`);$('mission-number').textContent=activity.vehicle?'TIME TRIAL':'SIDE JOB';showToast(activity.vehicle?'FIND THE REQUIRED VEHICLE · FOLLOW GPS':'FOLLOW THE GPS TO THE FIRST CHECKPOINT');sound('success')}
function finishSideActivity(success){const a=activity;if(!a)return;activity=null;missionActive=false;target=entrance(LANDMARKS.find(p=>p.id==='hub'));routeTarget=null;if(success){reward(progress,a.reward);refreshCash();sound('success')}setObjective('FREE ROAM','Visit the mission hub for more jobs.',1);showToast(success?`${a.title} COMPLETE · +$${a.reward}`:`${a.title} ENDED`)}
function updateSideActivity(dt){if(!activity)return;const a=activity,pos=vehicle?vehicle.mesh.position:player.position,result=advanceActivity(a,pos,vehicle?.type||null,dt);if(result==='expired'){finishSideActivity(false);return}if(result==='complete'){finishSideActivity(true);return}if(result==='checkpoint'){target=a.points[a.step];routeTarget=null;showToast('CHECKPOINT REACHED')}if(activity)$('mission-count').textContent=`CHECKPOINT ${a.step+1} / ${a.points.length}${a.seconds?` · ${Math.ceil(a.remaining)}s` : ''}${a.vehicle?` · ${a.vehicle.toUpperCase()} REQUIRED`:''}`}
function updateNavigation(){
 if(race)return;
 const pos=vehicle?vehicle.mesh.position:player.position;
 marker.position.set(target.x,0,target.z);$('heat').textContent='★'.repeat(heat)+'☆'.repeat(3-heat);
 if(routeTarget!==target||gameTime>=nextRouteUpdate){currentRoute=roadRoute(pos,target);routeTarget=target;nextRouteUpdate=gameTime+.6}
 const waypoint=currentRoute.find((point,index)=>index>0&&Math.hypot(point.x-pos.x,point.z-pos.z)>3)||target;
 const dx=target.x-pos.x,dz=target.z-pos.z;const angle=objectiveDirection(waypoint.x-pos.x,waypoint.z-pos.z,cameraYaw);$('direction-arrow').style.transform=`rotate(${angle}rad)`;$('distance').textContent=`${Math.round(Math.hypot(dx,dz))} M`;
}
function finish(won){if(ended)return;const wasSide=!!activity;if(wasSide){activity=null;missionActive=false}ended=true;resetInputs();setWeaponMenu(false);$('end-kicker').textContent=won?'ALL THREE MISSIONS COMPLETE':'MISSION FAILED';$('end-title').innerHTML=won?'RUN <span>COMPLETE.</span>':'DOWN <span>OUT.</span>';$('end-text').textContent=won?'You made the delivery, recovered the case, and escaped the city. Nice work.':wasSide?'The job ended. Return to the city and try again.':'Retry this mission with full health and ammo, or start the whole run again.';$('retry').hidden=won||wasSide;$('return-city').hidden=!won&&!wasSide;$('restart').textContent=won?'PLAY AGAIN':'START OVER';$('end').classList.remove('hidden')}
function retryMission(){
 if(!ended)return;
 resetInputs();removeRival();for(const enemy of enemies)scene.remove(enemy.mesh);enemies.length=0;
 for(const shot of shots){scene.remove(shot.line);shot.line.geometry.dispose();shot.line.material.dispose()}shots.length=0;
 if(vehicle){vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false}vehicle=null;vehicleSpeed=0;engineAudio.stop();player.visible=true;
 const start=[{x:0,z:13},{x:56,z:-28},{x:28,z:28}][mission];player.position.set(start.x,0,start.z);player.rotation.y=0;
 vehicles.slice(0,3).forEach((v,i)=>{v.mesh.position.set(start.x+[4,-4,8][i],0,start.z-3);v.mesh.rotation.y=0;v.occupied=false;if(v.rider)v.rider.visible=false});
 health=100;phase=0;kills=0;dropKills=0;reloadEnd=0;lastShot=-1;ammo.forEach((_,i)=>ammo[i]=weapons[i].cap);aiming=false;updateAimButton();cameraYaw=0;lookPitch=0;
 if(mission===0){target=objectives[0];heat=0;setObjective('FIRST DELIVERY','Take the bike and pick up the package.',1)}
 else if(mission===1){target=objectives[2];heat=1;spawnEnemy(-28,-33);spawnEnemy(-33,-28);spawnEnemy(-23,-28);spawnEnemy(-28,-23);setObjective('THE AMBUSH','Reach the stolen case. Eliminate the guards.',2,'GUARDS DOWN  0 / 4')}
 else {target=objectives[4];heat=2;spawnEnemy(25,20,'pursuer');spawnEnemy(31,20,'pursuer');spawnEnemy(28,37,'pursuer');lastReinforcement=gameTime;setObjective('HOT RUN','Get to the safe house. Expect resistance.',3)}
 routeTarget=null;currentRoute=roadRoute(player.position,target);marker.position.set(target.x,0,target.z);camera.position.set(start.x,5.2,start.z+8);$('end').classList.add('hidden');ended=false;showToast('MISSION RESTARTED  ·  FULL HEALTH & AMMO');updateMap();
}
function setWeaponMenu(open){weaponMenuOpen=!!open&&!vehicle&&started&&!ended&&!race;const menu=$('weapon-menu');menu.hidden=!weaponMenuOpen;$('weapon-btn').setAttribute('aria-expanded',String(weaponMenuOpen));if(weaponMenuOpen)renderWeaponMenu()}
function renderWeaponMenu(){const menu=$('weapon-menu');menu.innerHTML='';weapons.forEach((w,i)=>{const button=document.createElement('button');const locked=w.unlock&&!progress.owned.includes(w.unlock);button.className='weapon-option'+(i===weaponIndex?' selected':'');button.setAttribute('aria-label',`${w.name}, ${ammo[i]} rounds${i===weaponIndex?', equipped':''}`);button.innerHTML=`<span>${w.name}</span><small>${locked?'LOCKED':`${ammo[i]} / ${w.cap}`}</small>`;button.addEventListener('click',()=>equipWeapon(i));menu.appendChild(button)})}
function equipWeapon(index){if(!started||ended||vehicle||index<0||index>=weapons.length)return;if(weapons[index].unlock&&!progress.owned.includes(weapons[index].unlock)&&!(tempSniper&&weapons[index].unlock==='sniper')){showToast('BUY THIS WEAPON AT THE SHOP OR MISSION HUB');return}setWeaponMenu(false);if(index===weaponIndex)return;weaponIndex=index;updateWeapon(player,weaponIndex);reloadEnd=0;showToast(weapons[weaponIndex].name+' EQUIPPED')}
function switchWeapon(){let next=(weaponIndex+1)%weapons.length;while(weapons[next].unlock&&!progress.owned.includes(weapons[next].unlock))next=(next+1)%weapons.length;equipWeapon(next)}
function reload(){if(!started||ended||vehicle||reloadEnd||ammo[weaponIndex]===weapons[weaponIndex].cap)return;reloadEnd=gameTime+1;sound('reload');showToast('RELOADING')}
function interact(){
 if(!started||ended||jailedUntil>gameTime||mapOpen||settingsOpen||placeOpen||editingLayout||arcadeOpen||gameMenuOpen||raceOpen)return;
 if(race&&!vehicle)disqualifyRace();
 if(insideHome){openPlace(interiorPlace);return}
 if(vehicle){const p=vehicle.mesh.position;const candidates=[[3,0],[-3,0],[0,3],[0,-3]];const exit=candidates.find(([x,z])=>!world.blocks.some(b=>Math.abs(p.x+x-b.x)<b.halfX&&Math.abs(p.z+z-b.z)<b.halfZ));if(!exit){showToast('NO ROOM TO EXIT HERE');return}resetInputs();player.position.set(p.x+exit[0],0,p.z+exit[1]);player.visible=true;vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false;vehicle=null;vehicleSpeed=0;engineAudio.stop();engineAudio.stop();if(race)disqualifyRace();else showToast('ON FOOT');return}
 const place=nearestPlace();if(place){enterPlace(place);return}
 let near=null,min=5;for(const v of vehicles){const d=player.position.distanceTo(v.mesh.position);if(d<min){min=d;near=v}}
 const trafficCar=nearestTrafficCar();if(trafficCar&&player.position.distanceTo(trafficCar.car.mesh.position)<min){near=trafficCar.car;traffic.splice(traffic.indexOf(trafficCar),1);vehicles.push(near);ejectDriver(near);heat=Math.min(3,heat+1);updateHeat();lastSeenByPolice=gameTime;lastCrimeReport=gameTime;}
 if(near){resetInputs();setWeaponMenu(false);reloadEnd=0;aiming=false;updateAimButton();vehicle=near;vehicle.occupied=true;if(vehicle.rider)vehicle.rider.visible=true;vehicleSpeed=0;player.visible=false;engineAudio.start(vehicle.type==='bike'?'bike':'car');showToast(trafficCar&&near===trafficCar.car?'DRIVER PULLED OUT · HOLD GAS TO DRIVE':'STEER WITH STICK  ·  HOLD GAS TO DRIVE')}else showToast('MOVE CLOSER TO A VEHICLE')
}
// Any moving vehicle can be taken: cars, bikes, vans and trucks alike.
function disqualifyRace(){
 if(!race)return;
 try{race.net?.close()}catch{}
 if(race.timeout)clearTimeout(race.timeout);
 clearRaceVisuals();finishRaceVehicle();
 $('race-hud').hidden=true;raceOpen=false;$('race-overlay').hidden=true;race=null;
 setObjective('FREE ROAM','You left your race car — the field got the win. Grab any ride you like.',1);
 showToast('DISQUALIFIED · YOU LEFT YOUR RACE CAR');
}
function nearestTrafficCar(){let closest=null,best=4.8;for(const t of traffic){const d=player.position.distanceTo(t.car.mesh.position);if(d<best){closest=t;best=d}}return closest}
function ejectDriver(car){const old=civilians.filter(c=>c.ejected);if(old.length>=6){const c=old[0];scene.remove(c.mesh);civilians.splice(civilians.indexOf(c),1)}const mesh=world.simplePerson(0x718b94),p=car.mesh.position;mesh.position.set(p.x+3,0,p.z);scene.add(mesh);mesh.visible=false;
 // The ejected driver becomes a normal pedestrian: they walk off and can be
 // talked to like anybody else on the street.
 civilians.push({x:p.x+3,z:p.z,ry:0,dir:1,speed:1.9,mode:'walk',district:districtAt(p.x,p.z),role:'civilian-warm',lane:{axis:'z',fixed:p.x+3,from:Math.max(-138,p.z-34),to:Math.min(138,p.z+34)},anchor:null,radius:0,pause:0,think:4,line:null,lineUntil:0,cooldown:gameTime+6,partner:null,mesh,walk:0,requested:false,animElapsed:0,ejected:true,id:civilians.length+1000});
 showToast(`DRIVER PULLED OUT · ${car.brand?`${car.brand} ${car.model} TAKEN`:'CAR TAKEN'}`)}
// The action button says exactly what it will do in this spot: ENTER HOME,
// ENTER CAFE, RIDE BIKE, GET IN CAR, TAKE CAR, EXIT BIKE — never a bare "USE".
const PLACE_VERB={home:'ENTER HOME',hub:'USE HUB',cafe:'ENTER CAFE',apartment:'ENTER FLATS',diner:'ENTER DINER',garage:'VISIT MOTORS',clinic:'ENTER CLINIC',club:'ENTER LOUNGE',office:'ENTER TOWER',friend:'ENTER HOUSE',shop:'OPEN SHOP',market:'ENTER MARKET',gym:'ENTER GYM',mosque:'ENTER MOSQUE',fishmarket:'ENTER MARKET',casino:'ENTER CASINO',warehouse:'ENTER DOCK 9',hotel:'ENTER HOTEL',lodge:'ENTER LODGE',church:'ENTER CHURCH',campdiner:'ENTER DINER'};
function placeVerb(place){return PLACE_VERB[place?.id]||`ENTER ${(place?.name||'').split(' ').pop()||'PLACE'}`}
// …and the button's emoji matches the situation too: 🚪 door, 🎲 casino, 🏥 clinic…
const PLACE_ICON={home:'🚪',hub:'📋',cafe:'☕',apartment:'🛏️',diner:'🍔',garage:'🚘',clinic:'🏥',club:'🎶',office:'🏢',friend:'👋',shop:'🛍️',market:'🛒',gym:'🏋️',mosque:'🕌',fishmarket:'🐟',casino:'🎲',warehouse:'📦',hotel:'🛎️',lodge:'🍲',church:'⛪',campdiner:'⛺'};
function nearestPlace(){
 if(insideHome||vehicle)return null;let closest=null,best=4.4;
 for(const place of LANDMARKS){const p=entrance(place),d=Math.hypot(player.position.x-p.x,player.position.z-p.z);if(d<best){closest=place;best=d}}
 return closest;
}
// While driving, the car collides with the same street furniture a pedestrian
// avoids: parked cars, market stalls, bins and walls. Nearby boxes only, so the
// cost stays flat however busy the city gets.
function drivingObstacles(){
 if(!vehicle)return world.blocks;
 const p=vehicle.mesh.position,near=[];
 for(const v of vehicles){
  if(v===vehicle||v.occupied)continue;
  const q=v.mesh.position;if(Math.abs(q.x-p.x)>16||Math.abs(q.z-p.z)>16)continue;
  const angle=v.mesh.rotation.y,w=v.type==='bike'?.6:1.3,d=v.type==='bike'?1.6:(v.length||4.8)/2+.2,c=Math.abs(Math.cos(angle)),n=Math.abs(Math.sin(angle));
  near.push({x:q.x,z:q.z,halfX:w*c+d*n,halfZ:w*n+d*c});
 }
 return [...world.blocks,...world.obstacles,...near];
}
function walkingObstacles(){const p=player.position,near=[];for(const v of [...vehicles,...traffic.map(t=>t.car)]){const q=v.mesh.position;if(Math.abs(q.x-p.x)>10||Math.abs(q.z-p.z)>10)continue;const angle=v.mesh.rotation.y,w=v.type==='bike'?.55:1.3,d=v.type==='bike'?1.5:2.35,c=Math.abs(Math.cos(angle)),n=Math.abs(Math.sin(angle));near.push({x:q.x,z:q.z,halfX:w*c+d*n,halfZ:w*n+d*c})}for(const c of civilians){const q=c.mesh.position;if(Math.abs(q.x-p.x)<4&&Math.abs(q.z-p.z)<4)near.push({x:q.x,z:q.z,halfX:.35,halfZ:.35})}return [...world.blocks,...world.obstacles,...near].filter(b=>!blocked(p.x,p.z,[b],.2))}
function moveInsideHome(dx,dz){return moveInside(player.position,dx,dz,interiorPlace.id)}
function enterPlace(place){sound('success');resetInputs();insideHome=true;interiorPlace=place;homeInterior.visible=place.id==='home';if(interiors[place.id])interiors[place.id].visible=true;for(const attendant of interiorCrowd(place.id))if(!attendant.requested){attendant.requested=true;attendant.mesh.visible=true;models.person(attendant.mesh,attendant.role)}marker.visible=false;player.position.set(HOME_CENTER.x,0,HOME_CENTER.z+(place.id==='home'?0:3));camera.position.set(0,4,HOME_CENTER.z+6);cameraYaw=0;aiming=false;updateAimButton();showToast(`${place.name} · TAP OPTIONS`)}
function exitHome(travel=false){sound('reload');resetInputs();insideHome=false;homeInterior.visible=false;for(const room of Object.values(interiors))room.visible=false;marker.visible=true;const p=travel?selectedDistrict:entrance(interiorPlace);player.position.set(p.x,0,p.z);cameraYaw=travel?(p.x<0?Math.PI/2:-Math.PI/2):-Math.PI/2;player.rotation.y=cameraYaw;camera.position.set(p.x+Math.sin(cameraYaw)*7,4.5,p.z+Math.cos(cameraYaw)*7);routeTarget=null;if(!missionActive){if(travel){target=entrance(LANDMARKS.find(x=>x.id==='hub'));setObjective('FREE ROAM','Visit the mission hub to start a job.',1)}else setObjective('FREE ROAM','Explore the city or visit the mission hub.',1)}showToast(travel?`ARRIVED · ${selectedDistrict.name}`:missionActive?'RETURN TO YOUR MISSION':interiorPlace.id!=='home'?`LEFT ${interiorPlace.name} · FOLLOW YOUR GPS`:selectedDistrict.id==='city'?'FOLLOW THE MARKER TO THE MISSION HUB':`FOLLOW THE MARKER TO ${selectedDistrict.name}`)}
function closePlace(){placeOpen=false;$('place-overlay').hidden=true}
function placeButton(label,callback){const button=document.createElement('button');button.className='place-action';button.textContent=label;button.onclick=callback;$('place-actions').appendChild(button)}
function refreshCash(){saveProgress(storage,progress);$('cash-display').textContent=`$${progress.money}`}
function openPlace(place){
 resetInputs();placeOpen=true;$('place-overlay').hidden=false;$('place-title').textContent=place.name;$('place-actions').replaceChildren();
 const descriptions={home:'Your own space. Take a break and restore your health before heading out.',friend:'A familiar face in the market rows. Your friend says: Stay safe out there!',church:'A quiet landmark and place of reflection in the neighbourhood.',mosque:'A peaceful community landmark in the neighbourhood.',hotel:'A welcoming city hotel. Rest here to restore health for $80 in-game cash.',casino:'A little arcade-style game of chance using in-game cash only. No real money.'};
 const visitors=interiorCrowd(place.id).length;
 $('place-desc').textContent=`${descriptions[place.id]||place.blurb||'A place in the city.'}${visitors?` · ${visitors} ${visitors===1?'person is':'people are'} inside, and they will talk to you.`:''}`;
 if(place.id==='home'){
  placeButton('REST · RESTORE HEALTH',()=>{health=100;sound('success');closePlace();showToast('RESTED · HEALTH RESTORED')});
  placeButton('LEAVE HOME',()=>{closePlace();exitHome()});
  if(!missionActive&&selectedDistrict.id!=='city')placeButton(`TRAVEL TO ${selectedDistrict.name}`,()=>{closePlace();exitHome(true)});
 } else if(place.id==='hub'||place.id==='shop'){
  if(place.id==='hub'&&!missionActive)placeButton('START FIRST DELIVERY · REWARD $750',()=>{closePlace();missionActive=true;target=objectives[0];routeTarget=null;marker.position.set(target.x,0,target.z);setObjective('FIRST DELIVERY','Take the bike and pick up the package.',1);showToast('JOB ACCEPTED · FOLLOW THE MARKER');sound('success')});
  else if(place.id==='hub')placeButton('CONTINUE CURRENT JOB',()=>{closePlace();showToast('FOLLOW YOUR MISSION MARKER')});
  if(interiorCrowd(place.id).length)placeButton('TALK TO PERSON',()=>openConversation(true));
  if(place.id==='hub'&&!missionActive&&!sideMission)placeButton('STORY MISSIONS · NIGHT PATROL & MORE',()=>{closePlace();openMissions()});
  if(place.id==='hub'){if(!missionActive&&!sideMission){placeButton('SIDE JOB · COASTAL COURIER · $450',()=>beginSideActivity('coast'));placeButton('SIDE JOB · PORT DISPATCH · $550',()=>beginSideActivity('port'));placeButton('CAR TIME TRIAL · $500',()=>beginSideActivity('carRace'));placeButton('BIKE TIME TRIAL · $500',()=>beginSideActivity('bikeRace'))}else if(activity)placeButton('CANCEL CURRENT JOB',()=>{closePlace();finishSideActivity(false)});placeButton('PLAY ARCADE GAMES',()=>openArcade('place'))}
  for(const [id,name] of [['smg','SMG'],['sniper','MARKSMAN'],['car','CAR SPEED UPGRADE'],['revolver','REVOLVER'],['battle','BATTLE RIFLE'],['mg','MACHINE GUN'],['bazooka','BAZOOKA']]){
   const owned=progress.owned.includes(id);placeButton(owned?`${name} · OWNED`:`BUY ${name} · $${PRICES[id]}`,()=>{if(owned){showToast('ALREADY OWNED');return}if(!purchase(progress,id)){showToast('NOT ENOUGH CASH');return}refreshCash();sound('success');openPlace(place)});
  }
  if(place.id==='shop')placeButton('HEALTH KIT · $50',()=>{if(health>=100){showToast('HEALTH ALREADY FULL');return}if(progress.money<50){showToast('NOT ENOUGH CASH');return}progress.money-=50;health=100;refreshCash();sound('success');showToast('HEALTH RESTORED')});
 } else if(place.id==='hotel'){placeButton('TALK TO PERSON',()=>openConversation(true));placeButton('REST · $80',()=>{if(progress.money<80){showToast('NOT ENOUGH CASH');return}progress.money-=80;refreshCash();health=100;closePlace();sound('success');showToast('HOTEL REST · HEALTH RESTORED')})}
 else if(place.id==='casino'){placeButton('BET ON CASINO GAMES',openCasino);placeButton('TALK TO PERSON',()=>openConversation(true))}
 else if(place.id==='garage'){placeButton('BROWSE CARS FOR SALE',()=>openShowroom('car',place));placeButton('BROWSE BIKES FOR SALE',()=>openShowroom('bike',place));if(interiorCrowd(place.id).length)placeButton('TALK TO THE SALESMAN',()=>openConversation(true))}
 else if(place.kind==='diner'||place.id==='cafe'||place.id==='fishmarket'){openFoodActions(place)}
 else if(place.id==='clinic'){placeButton('TREATMENT · FULL HEALTH · $120',()=>{if(!payFor(120))return;health=100;showToast('THE CLINIC PATCHED YOU UP')});placeButton('FIRST AID KIT · $60',()=>{if(health>=100){showToast('YOU ARE ALREADY FIT');return}if(!payFor(60))return;health=Math.min(100,health+50);showToast('FIRST AID · HEALTH +50')});placeButton('QUIET WORD WITH THE NURSE · $150',()=>{if(heat<=0){showToast('NOBODY IS LOOKING FOR YOU');return}if(!payFor(150))return;heat=0;updateHeat();clearPolice();showToast('THEY NEVER CAME HERE · HEAT CLEARED')});if(interiorCrowd(place.id).length)placeButton('TALK TO A NURSE',()=>openConversation(true))}
 else if(place.id==='club'){placeButton('ASK THE DJ TO CHANGE THE MUSIC',()=>{cycleRadio();closePlace()});placeButton('DANCE FLOOR · REST · FREE',()=>{health=Math.min(100,health+12);showToast('YOU CAUGHT YOUR BREATH · HEALTH +12')});if(interiorCrowd(place.id).length)placeButton('TALK TO SOMEBODY',()=>openConversation(true))}
 else if(place.id==='gym'){placeButton('TRAIN · $40',()=>{if(!payFor(40))return;trainedUntil=gameTime+120;showToast('TRAINED · YOU SPRINT FASTER FOR TWO MINUTES')});if(interiorCrowd(place.id).length)placeButton('TALK TO A REGULAR',()=>openConversation(true))}
 else if(place.id==='market'){placeButton('BUY AMMO · $60',()=>{if(!payFor(60))return;for(let i=0;i<ammo.length;i++)ammo[i]=weapons[i].cap;showToast('EVERY MAGAZINE FILLED')});placeButton('STREET FOOD · $20',()=>{if(health>=100){showToast('YOU ARE ALREADY FULL');return}if(!payFor(20))return;health=Math.min(100,health+22);showToast('MARKET FOOD · HEALTH +22')});placeButton('HAGGLE FOR A DEAL',()=>{const deal=Math.random()<.5;showToast(deal?'THEY KNOCKED $25 OFF · COME BACK AND BUY':'NO DEAL TODAY · TRY ANOTHER STALL');if(deal){progress.money+=25;refreshCash()}});if(interiorCrowd(place.id).length)placeButton('TALK TO A TRADER',()=>openConversation(true))}
 else if(place.id==='apartment'){placeButton('REST ON THE SPARE BED · FREE',()=>{health=100;saveProgress(storage,progress);showToast('RESTED · PROGRESS SAVED')});if(interiorCrowd(place.id).length)placeButton('TALK TO YOUR NEIGHBOUR',()=>openConversation(true))}
 else if(place.id==='lodge'){placeButton('HOT FOOD · $50',()=>{if(health>=100){showToast('YOU ARE ALREADY FULL');return}if(!payFor(50))return;health=100;showToast('LODGE MEAL · HEALTH RESTORED')});placeButton('SERVICE MY BIKE · $80',()=>{if(!payFor(80))return;bikeServicedUntil=gameTime+240;showToast('BIKES HANDLE BETTER FOR FOUR MINUTES')});if(interiorCrowd(place.id).length)placeButton('TALK TO A RIDER',()=>openConversation(true))}
 else if(place.id==='office'||place.id==='warehouse'){placeButton('READ THE JOB BOARD',()=>{closePlace();openMissions()});if(!missionActive&&!sideMission){placeButton('DOCK RUN · SIDE JOB',()=>beginSideActivity('port'));placeButton('COASTAL COURIER · SIDE JOB',()=>beginSideActivity('coast'))}if(interiorCrowd(place.id).length)placeButton('TALK TO SOMEBODY',()=>openConversation(true))}
 else {if(interiorCrowd(place.id).length)placeButton('TALK TO PERSON',()=>openConversation(true));placeButton('CONTINUE EXPLORING',closePlace)}
 if(place.id==='casino')placeButton('PLAY ARCADE GAMES',()=>openArcade('place'));
 if(place.id!=='home')placeButton(`LEAVE ${place.name}`,()=>{closePlace();exitHome()});
}
// --- Money, shopping and the garage ---
function payFor(cost){if(progress.money<cost){showToast('NOT ENOUGH CASH');sound('reload');return false}progress.money-=cost;refreshCash();sound('success');return true}
function saveGarage(){try{storage?.setItem(garageKey(),JSON.stringify(ownedVehicles))}catch{}}
// A bought vehicle is parked at the door you walked out of, and stays in the
// city like any other ride (so it can be driven, or stolen back).
function spawnOwnedVehicle(id,at){
  const entry=vehicleById(id);if(!entry)return null;
  const v=catalogVehicle(id,at.x,at.z,at.yaw||0);
  vehicles.push(v);lastOwnedVehicle=v;v.mesh.visible=true;v.requested=true;models.vehicle(v,v.tint);
  return v;
}
function callMyVehicle(id=null){
  if(!ownedVehicles.length){showToast('YOU DO NOT OWN A VEHICLE YET · VISIT HALCYON MOTORS');return}
  id=id||ownedVehicles[ownedVehicles.length-1];const entry=vehicleById(id);
  const p=vehicle?vehicle.mesh.position:player.position;
  const road={x:Math.round(p.x/28)*28+5.6,z:Math.round(p.z/28)*28};
  const v=spawnOwnedVehicle(id,{x:road.x,z:road.z,yaw:0});
  if(v)showToast(`${entry.brand} ${entry.model} IS WAITING ON THE STREET`);
}
// Where a bought vehicle appears: outside the showroom door when you are in the
// building, otherwise on the street next to you.
function purchaseSpot(place){
 if(insideHome&&interiorPlace?.id===place.id){const door=entrance(place);return {x:door.x+3.4,z:door.z+2.4,yaw:0}}
 const p=vehicle?vehicle.mesh.position:player.position;
 return {x:Math.max(-136,Math.min(136,Math.round(p.x/28)*28+5.6)),z:Math.max(-136,Math.min(136,Math.round(p.z/28)*28+7)),yaw:0};
}
function openDealership(){
 const place=landmarkById('garage')||LANDMARKS[0];
 resetInputs();placeOpen=true;$('place-overlay').hidden=false;$('place-actions').replaceChildren();
 $('place-title').textContent=`${DEALERSHIP_NAME} · SHOWROOM`;
 $('place-desc').textContent='Browse the whole catalog from anywhere in the city. Purchases are parked on the street beside you and saved on this device.';
 placeButton('CARS FOR SALE',()=>openShowroom('car',place,openDealership));
 placeButton('BIKES FOR SALE',()=>openShowroom('bike',place,openDealership));
 for(const id of ownedVehicles.slice(-6)){
  const entry=vehicleById(id);if(!entry)continue;
  placeButton(`CALL ${entry.brand} ${entry.model} HERE`,()=>{closePlace();ownedVehicles.push(id);callMyVehicle()});
 }
 placeButton('CLOSE',closePlace);
}
function openShowroom(cls,place,back=null){
 const stock=dealershipStock(cls);
 $('place-title').textContent=`${DEALERSHIP_NAME} · ${cls==='bike'?'BIKES':'CARS'}`;
 $('place-desc').textContent=`Buy with in-game cash. Your purchase is parked outside the door and remembered on this device. Every machine drives differently: top speed and steering come from the catalog.`;
 $('place-actions').replaceChildren();
 for(const entry of stock){
  const owned=ownedVehicles.includes(entry.id);
  placeButton(`${entry.brand} ${entry.model} · ${owned?'OWNED':`$${entry.price}`} · ${entry.segment} · ${Math.round(entry.top*4.2)} KM/H`,()=>{
   if(owned){showToast('ALREADY YOURS · CALL IT FROM THE GAME MENU');return}
   if(!payFor(entry.price))return;
   ownedVehicles.push(entry.id);saveGarage();
   spawnOwnedVehicle(entry.id,purchaseSpot(place));
   showToast(`${entry.brand} ${entry.model} IS WAITING OUTSIDE`);
   openShowroom(cls,place);
  });
 }
 placeButton('BACK',back||(()=>openPlace(place)));
}
function openFoodActions(place){
 const menu=place.id==='fishmarket'?[['FRESH FISH & RICE · $30',30,34],['PEPPER SOUP · $20',20,22],['COLD DRINK · $10',10,8]]:place.id==='cafe'?[['TEA & GRILL · $20',20,20],['MEAT PIE · $15',15,14],['COLD DRINK · $10',10,8]]:[['GRILL PLATE · $25',25,26],['JOLLOF & CHICKEN · $40',40,45],['COLD DRINK · $10',10,8]];
 for(const [label,cost,gain] of menu)placeButton(label,()=>{if(health>=100){showToast('YOU ARE ALREADY FULL');return}if(!payFor(cost))return;health=Math.min(100,health+gain);showToast(`${place.name} · HEALTH +${gain}`)});
 if(interiorCrowd(place.id).length)placeButton('TALK TO SOMEBODY',()=>openConversation(true));
}
// --- In-car radio: the music loops are the stations ---
const RADIO_STATIONS={coast:'COAST FM 104',night:'NIGHT WAVE 86',harbor:'HARBOR RADIO 96',race:'RACE FUEL 138',missions:'MISSION WIRE 120','song-umlungu':'AFRO LIVE · UMLUNGU','song-kwela':'KWELA JIVE RADIO','song-iyanetha':'IYANETHA FM','song-village':'VILLAGE GROOVE RADIO','song-moon':'AFRICAN MOON FM','song-west':'WEST AFRICA RADIO','song-seeme':'HIP HOP HEAT · WHEN YOU SEE ME NOW','song-greatest':'FLOW FM · GREATEST SELF','song-killpain':'FLOW FM · KILL THE PAIN','song-winning':'FLOW FM · WINNING TRACK','song-niceday':'FLOW FM · NICE DAY'};
const RADIO_ORDER=['coast','night','harbor','race','missions',...SONG_IDS];
function cycleRadio(){
 const index=RADIO_ORDER.indexOf(musicTrack);
 musicTrack=RADIO_ORDER[(index+1)%RADIO_ORDER.length]||'coast';
 persistSettings();updateSettings();sound('reload');
 showToast(`RADIO · ${RADIO_STATIONS[musicTrack]||musicTrack.toUpperCase()}`);
}
// --- Wanted level: patrol cars, line of sight and getting busted ---
let police=[],lastSeenByPolice=0,lastCrimeReport=0,busted=false,trainedUntil=0,bikeServicedUntil=0;
function updateHeat(){$('heat').textContent='★'.repeat(Math.max(0,Math.min(3,heat)))+'☆'.repeat(Math.max(0,3-heat))}
function clearPolice(){for(const cop of police)scene.remove(cop.car.mesh);police.length=0}
function spawnPoliceCar(pos){
 const angle=Math.random()*Math.PI*2,distance=44+Math.random()*20;
 const x=Math.max(-138,Math.min(138,pos.x+Math.cos(angle)*distance)),z=Math.max(-138,Math.min(138,pos.z+Math.sin(angle)*distance));
 const car=catalogVehicle('metro-pd',x,z,0);car.mesh.visible=true;car.requested=true;models.vehicle(car,car.tint);
 const bar=new THREE.Group();
 const blueLamp=new THREE.Mesh(new THREE.BoxGeometry(.5,.16,.3),new THREE.MeshBasicMaterial({color:0x4f8fe8}));blueLamp.position.set(-.5,0,0);
 const redLamp=new THREE.Mesh(new THREE.BoxGeometry(.5,.16,.3),new THREE.MeshBasicMaterial({color:0xe8534f}));redLamp.position.set(.5,0,0);
 bar.add(blueLamp,redLamp);bar.position.set(0,2.05,.2);car.mesh.add(bar);
 police.push({car,route:[],nextRoute:0,catchTime:0,bar,blueLamp,redLamp,flash:Math.random()*3});
}
function bustPlayer(){
 if(busted)return;busted=true;
 if(race)disqualifyRace();
 const lost=Math.min(progress.money,120);progress.money-=lost;refreshCash();
 heat=0;updateHeat();clearPolice();
 if(vehicle){vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false;vehicle=null;vehicleSpeed=0;engineAudio.stop();engineAudio.stop()}
 player.visible=true;health=100;lastSeenByPolice=gameTime;
 player.position.set(JAIL.x,0,JAIL.z);cameraYaw=Math.PI;player.rotation.y=cameraYaw;
 camera.position.set(JAIL.x,3.2,JAIL.z+6.4);
 jailedUntil=gameTime+25;jailRealUntil=performance.now()+25000;resetInputs();sound('reload');
 $('jail-overlay').hidden=false;$('jail-text').textContent=`The cops booked you at the Palm Grove hold. -$${lost} in fines. Wait it out or pay bail.`;
 showToast(`BUSTED · LOCKED UP · -$${lost}`);
 busted=false;
}
function releaseFromJail(bail){
 jailedUntil=0;jailRealUntil=0;$('jail-overlay').hidden=true;if(gameMenuOpen)closeGameMenu();
 const clinic=landmarkById('clinic')||LANDMARKS[0],door=entrance(clinic);
 player.position.set(door.x,0,door.z);cameraYaw=-Math.PI/2;resetInputs();
 showToast(bail?'BAIL PAID · YOU WALK FREE':'TIME SERVED · YOU WALK FREE');
}
// Patrol cars chase while you are wanted, and give up when they lose sight of
// you for a while — the same pressure loop an open-world city game uses.
function updatePolice(dt,pos){
 if(heat<2||insideHome||busted){if(police.length)clearPolice();return}
 while(police.length<Math.min(3,heat-1))spawnPoliceCar(pos);
 for(const cop of police){
  const p=cop.car.mesh.position,distance=p.distanceTo(pos);
  cop.flash+=dt*6;
  cop.blueLamp.visible=Math.sin(cop.flash)>0;cop.redLamp.visible=!cop.blueLamp.visible;
  if(gameTime>=cop.nextRoute){cop.route=roadRoute(p,pos);cop.nextRoute=gameTime+.9}
  if(distance>7){const facing=advancePursuit(p,cop.route,dt,world.blocks,heat>=3?15:12.5);if(facing!==null)cop.car.mesh.rotation.y=facing;for(const wheel of cop.car.wheels)wheel.rotation.x-=13*dt*.8}
  const sees=hasLineOfSight(p,pos,world.blocks);
  if(distance<26&&sees){lastSeenByPolice=gameTime;cop.sees=true}else cop.sees=false;
  if(distance<6&&sees)cop.catchTime+=dt;else cop.catchTime=Math.max(0,cop.catchTime-dt*.6);
  if(cop.catchTime>3.4){bustPlayer();return}
 }
 if(gameTime-lastSeenByPolice>13&&heat>0){
  heat=Math.max(0,heat-1);updateHeat();lastSeenByPolice=gameTime;
  showToast(heat>=2?'YOU ARE LOSING THEM · KEEP GOING':heat===1?'ONE STAR LEFT · STAY OUT OF SIGHT':'YOU LOST THE COPS');
  if(heat<2)clearPolice();
 }
}
function reportCrime(reason){
 if(missionActive||heat>=3||gameTime<lastCrimeReport+9)return;
 heat=Math.min(3,heat+1);updateHeat();lastCrimeReport=gameTime;lastSeenByPolice=gameTime;
 showToast(reason);sound('reload');
}
let arcadeAwardLog=[];let arcadeOrigin='place',arcadeSession=0,casinoOpen=false,conversationInside=false,casinoHandle=null;
async function openArcade(origin='place'){const session=++arcadeSession;arcadeOrigin=origin;closePlace();resetInputs();arcadeOpen=true;$('arcade-overlay').hidden=false;$('arcade-panel').textContent='Loading games…';try{const {createArcade}=await import('./arcade.js');if(arcadeOpen&&session===arcadeSession){createArcade($('arcade-panel'),closeArcade,(cash,label)=>{arcadeAwardLog.push({cash,label});reward(progress,cash);saveProgress(storage,progress);refreshCash();showToast(`${label} · +$${cash}`);sound('success')});$('arcade-panel').querySelector('button')?.focus()}}catch{if(arcadeOpen&&session===arcadeSession)$('arcade-panel').innerHTML='<p>Unable to load the arcade.</p><button class="arcade-button" id="arcade-error-close">CLOSE</button>';const button=$('arcade-error-close');if(button)button.onclick=closeArcade}}
function closeArcade(){arcadeSession++;arcadeOpen=false;$('arcade-overlay').hidden=true;if(arcadeOrigin==='menu')openGameMenu();else openPlace(interiorPlace)}
function openCasino(){closePlace();resetInputs();casinoOpen=true;$('arcade-overlay').hidden=false;casinoHandle?.destroy?.();casinoHandle=createCasino($('arcade-panel'),progress,refreshCash,closeCasino,sound);$('arcade-panel').querySelector('button')?.focus()}
function closeCasino(){casinoHandle?.destroy?.();casinoHandle=null;casinoOpen=false;$('arcade-overlay').hidden=true;openPlace(interiorPlace)}
function speakDialogue(playerLine,npcLine){if(!voiceLines||muted||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;try{window.speechSynthesis.cancel();for(const [text,pitch] of [[playerLine,.9],[npcLine,1.1]]){const u=new SpeechSynthesisUtterance(text);u.pitch=pitch;u.volume=sfxVolume;window.speechSynthesis.speak(u)}}catch{}}
function nearestPerson(){if(!started||insideHome||vehicle)return null;let nearest=null,best=6.5;for(const c of civilians){if(!c.mesh.visible)continue;const d=Math.hypot(c.x-player.position.x,c.z-player.position.z);if(d<best){best=d;nearest=c}}return nearest}
// Named strangers: every person on the street keeps a stable name, so talking to
// them twice feels like the same neighbour rather than a random generator.
const STREET_NAMES=['AMA','TUNDE','ZAINAB','KELECHI','MUSA','BISI','EMEKA','HALIMA','SEUN','NGOZI','IBRAHIM','FUNKE','DAYO','AISHA','CHIDI','YEMI','BOLA','KEMI','SOLA','CHIKA','MALLAM MUSA','AUNTY BISI','TATAFO','OKAFOR','MAMA NKECHI','BROTHER JOE'];
function streetName(person){return person?STREET_NAMES[Math.abs(person.id||0)%STREET_NAMES.length]:'PERSON'}
let streetTalkPartner=null;
const TALK_STAND_DISTANCE=1.85;
// They stop, turn and look at you: a real face-to-face conversation.
function faceThePlayer(person){
  if(!person)return;
  const p=vehicle?vehicle.mesh.position:player.position;
  // They step in close and you turn to meet them, so the chat reads face to face.
  const dx=person.x-p.x,dz=person.z-p.z,len=Math.hypot(dx,dz)||1;
  if(len>TALK_STAND_DISTANCE){person.x=p.x+dx/len*TALK_STAND_DISTANCE;person.z=p.z+dz/len*TALK_STAND_DISTANCE}
  if(!vehicle&&!insideHome){
    const yaw=Math.atan2(-(person.x-p.x),-(person.z-p.z));
    cameraYaw=yaw;player.rotation.y=yaw;
    camera.position.set(p.x+Math.sin(yaw)*6.7,3.35,p.z+Math.cos(yaw)*6.7);
  }
  person.ry=Math.atan2(-(p.x-person.x),-(p.z-person.z));
  person.mode='stand';person.anchor={x:person.x,z:person.z};person.radius=0;person.target=null;
  person.think=999;person.cooldown=gameTime+25;person.line=null;person.lineUntil=0;
  if(person.talk){const partner=civilians.find(other=>other.id===person.talk.partner);if(partner?.mode==='talk')endStreetPair(partner);person.talk=null}
}
function endStreetPair(person){person.talk=null;person.mode='stand';person.anchor={x:person.x,z:person.z};person.radius=0;person.cooldown=gameTime+20}
function ownsBike(){return ownedVehicles.some(id=>vehicleById(id)?.kind==='bike')}
function renderConversation({title,districtLabel,opening,options,onPick}){
  conversationInside=false;resetInputs();placeOpen=true;$('place-overlay').hidden=false;
  $('place-title').textContent=title;
  $('place-desc').classList.add('dialog-line');
  $('place-desc').textContent=`${districtLabel} · they are standing in front of you.\n${title}: ${opening}`;
  $('place-actions').replaceChildren();
  for(const option of options)placeButton(option.label,()=>onPick(option));
 const row=document.createElement('div');row.className='convo-row';
 const input=document.createElement('input');input.id='convo-input';input.placeholder='Type anything… ask them something';input.setAttribute('aria-label','Type your own line');
 const send=document.createElement('button');send.type='button';send.className='arcade-button';send.textContent='💬 SAY IT';
 send.onclick=()=>{const text=input.value.trim();if(!text)return;input.value='';onPick({label:text,typed:true},text)};
 input.addEventListener('keydown',e=>{if(e.key==='Enter')send.onclick()});
 row.append(input,send);$('place-actions').append(row);
}
function conversationReply(option,title,reply){
  $('place-desc').textContent=`YOU: ${option.label}\n${title}: ${reply}`;
  speakDialogue(option.label,reply);
  const p=vehicle?vehicle.mesh.position:player.position;
  sayBubble(p.x,p.z,option.label,3.6,1.9);
  const partner=streetTalkPartner||(conversationInside?interiorCrowd(interiorPlace.id)[0]:null);
  if(partner)sayBubble(partner.mesh?.position.x??partner.x??p.x,partner.mesh?.position.z??partner.z??p.z,reply,4.2,1.9);
}
// Typed or unknown questions get a real answer — or a shrug.
function answerFreeText(text,convo){
  const low=text.toLowerCase();
  const match=convo.options.find(o=>o.label.toLowerCase().split(' ').some(w=>w.length>3&&low.includes(w)))||convo.options.find(o=>low.split(' ').some(w=>w.length>3&&o.label.toLowerCase().includes(w)));
  if(match)return match;
  if(/name|who/.test(low))return {label:text,reply:`Name's ${streetName(streetTalkPartner)}. We dey here every day.`};
  if(/money|cash|job|work/.test(low))return {label:text,reply:'Work? Check the job board at the dock office, na there things dey.'};
  return {label:text,reply:'Ask around man, dunno what you are talking about.'};
}
function applyConversationEffect(effect){
  const result=applyStreetEffect(effect,{money:progress.money,health});
  if(result.placeId){const place=landmarkById(result.placeId);if(place&&!missionActive){target=entrance(place);routeTarget=null;marker.position.set(target.x,0,target.z)}}
  progress.money=result.money;health=result.health;refreshCash();
  if(result.toast)showToast(result.toast);
  return result;
}
function openStreetConversation(person){
  if(!person)return;
  streetTalkPartner=person;faceThePlayer(person);
  const district=districtAt(person.x,person.z),name=streetName(person);
  const convo=streetConversation({npc:{name,kind:person.role},district,cash:progress.money,heat,seed:(person.id||1)*31+7,nearPlaceId:nearestLandmarkId(person.x,person.z),ownsBike:ownsBike()});
  sound('reload');
  renderConversation({
    title:`${name}`,districtLabel:districtById(district).name,opening:convo.opening,options:convo.options,
    onPick:(option,typed)=>{
      if(typed)option=answerFreeText(typed,convo);
      conversationReply(option,name,option.reply);
      const result=applyConversationEffect(option.effect);
      if(option.effect?.kind==='race')startStreetBet(result.race,name,district);
      if(result.close||option.effect?.kind==='race'){streetTalkPartner=null;$('place-desc').classList.remove('dialog-line');closePlace()}
    },
  });
}
// A stranger's bet becomes a real one-lap race against them.
function startStreetBet(bet,name,district){
  if(!bet)return;
  raceClass=bet.bike?'bike':'car';
  raceTrackId=(bet.bike?['alley','boardwalk','trail']:['city','downtown','coast'])[Math.floor(Math.random()*3)%3];
  raceCpuCount=1;streetBetRival=name;
  closePlace();
  startSoloRace();
}
let streetBetRival=null;
function openConversation(inside=false){
 conversationInside=inside;
 const place=inside?interiorPlace:null;
 const district=place?.district||districtAt(player.position.x,player.position.z);
 const name=place?['THE ATTENDANT','THE MANAGER','A REGULAR'][Math.abs(place.x+place.z)%3]:'PERSON';
 const convo=streetConversation({npc:{name},district,cash:progress.money,heat,seed:(place?place.x*13+place.z*7:11),nearPlaceId:place?.id||nearestLandmarkId(player.position.x,player.position.z),ownsBike:ownsBike()});
 sound('reload');
 renderConversation({
  title:place?`${name} · ${place.name}`:name,districtLabel:districtById(district).name,opening:convo.opening,options:convo.options,
  onPick:(option,typed)=>{
   if(typed)option=answerFreeText(typed,convo);
   conversationReply(option,name,option.reply);
   const result=applyConversationEffect(option.effect);
   if(option.effect?.kind==='race'){closeConversation();startStreetBet(result.race,name,district);return}
   if(result.close)closeConversation();
  },
 });
}
function closeConversation(){const wasInside=conversationInside;conversationInside=false;$('place-desc').classList.remove('dialog-line');closePlace();if(wasInside)openPlace(interiorPlace)}
$('place-close').onclick=()=>conversationInside?closeConversation():closePlace();
let layoutDraft,layoutMode='foot';
$('edit-controls').onclick=()=>{resetInputs();editingLayout=true;layoutMode='foot';layoutDraft=JSON.parse(JSON.stringify(controlLayout));$('layout-editor').hidden=false;renderLayoutEditor()};
function renderLayoutEditor(){
 const container=$('layout-items');container.replaceChildren();const orientation=innerWidth>=innerHeight?'landscape':'portrait';
 const fallback={joystick:[.15,.76],'left-fire-btn':[.07,.46],'sprint-btn':[.17,.48],'aim-btn':[.91,.43],'weapon-btn':[.82,.56],'reload-btn':[.92,.57],'interact-btn':[.82,.75],'fire-btn':[.93,.78],'reverse-btn':[.72,.75],'accelerate-btn':[.93,.78]};
 $('edit-foot').classList.toggle('active',layoutMode==='foot');$('edit-driving').classList.toggle('active',layoutMode==='driving');
 const shown=layoutMode==='foot'?CONTROL_IDS.filter(id=>!['reverse-btn','accelerate-btn'].includes(id)):['joystick','interact-btn','reverse-btn','accelerate-btn'];
 for(const id of shown){const el=$(id),rect=el.getBoundingClientRect(),saved=layoutDraft[orientation][id],xy=saved||((rect.width&&rect.height)?{x:(rect.left+rect.width/2)/innerWidth,y:(rect.top+rect.height/2)/innerHeight}:{x:fallback[id][0],y:fallback[id][1]});
  const item=document.createElement('button');item.className='layout-item'+(id==='joystick'?' layout-stick':'');item.textContent=id==='joystick'?'MOVE':id==='left-fire-btn'?'L FIRE':id==='fire-btn'?'R FIRE':(el.querySelector('.lbl')?.textContent||id.replace('-btn','')).toUpperCase();item.setAttribute('aria-label',`Drag ${item.textContent} control`);item.style.left=`${xy.x*100}%`;item.style.top=`${xy.y*100}%`;container.appendChild(item);
  item.addEventListener('pointerdown',e=>{e.preventDefault();item.setPointerCapture(e.pointerId)});item.addEventListener('pointermove',e=>{if(!item.hasPointerCapture(e.pointerId))return;const x=THREE.MathUtils.clamp(e.clientX/innerWidth,.07,.93),y=THREE.MathUtils.clamp(e.clientY/innerHeight,.14,.93);item.style.left=`${x*100}%`;item.style.top=`${y*100}%`;layoutDraft[orientation][id]={x,y}});
 }
}
$('edit-foot').onclick=()=>{layoutMode='foot';renderLayoutEditor()};$('edit-driving').onclick=()=>{layoutMode='driving';renderLayoutEditor()};
$('layout-reset').onclick=()=>{const orientation=innerWidth>=innerHeight?'landscape':'portrait';layoutDraft[orientation]={};applyLayout(layoutDraft);renderLayoutEditor()};
$('layout-save').onclick=()=>{controlLayout=layoutDraft;saveLayout(storage,controlLayout);applyLayout(controlLayout);editingLayout=false;$('layout-editor').hidden=true};
function nearestAnyTarget(){
 const focal=innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))), range=weapons[weaponIndex].range;
 const pool=[...enemies.filter(e=>e.alive).map(enemy=>({enemy,civ:false})),...civilians.filter(c=>c.mesh.visible&&!c.dead).map(c=>({enemy:c,civ:true}))];
 const candidates=pool.map(({enemy,civ})=>{
  const point=enemy.mesh.position.clone().add(new THREE.Vector3(0,1.35,0)),distance=player.position.distanceTo(enemy.mesh.position);
  const screen=point.project(camera),cameraDistance=camera.position.distanceTo(enemy.mesh.position);
  return {enemy,x:screen.x*innerWidth/2,y:screen.y*innerHeight/2,bodyRadius:Math.max(4,focal*.65/Math.max(1,cameraDistance)),bodyHalfHeight:Math.max(5,focal*1.3/Math.max(1,cameraDistance)),distance,range,visible:screen.z>=-1&&screen.z<=1&&Math.abs(screen.x)<=1&&Math.abs(screen.y)<=1,clear:hasLineOfSight(player.position,enemy.mesh.position,sniperActive?world.blocks.filter(b=>!(Math.abs(b.x-player.position.x)<b.halfX&&Math.abs(b.z-player.position.z)<b.halfZ)):world.blocks)};
 });
 const hitEnemy=selectReticleTarget(candidates,aimAssist?Math.min(innerWidth,innerHeight)*(aiming?.045:.065):0);
 if(!hitEnemy)return null;
 const wrap=pool.find(p=>p.enemy===hitEnemy);return {ref:hitEnemy,civ:!!wrap?.civ};
}
function damageCivilian(c,amount){
 if(c.dead)return;c.hp=(c.hp??100)-amount;setHitFlash(c.mesh,true);setTimeout(()=>setHitFlash(c.mesh,false),100);$('hitmarker').classList.add('active');setTimeout(()=>$('hitmarker').classList.remove('active'),100);
 if(c.hp>0){c.hostileUntil=gameTime+25;c.hostileCd=.4;c.mode='talk';c.line='YOU SHOT ME!';c.lineUntil=gameTime+2;return}
 c.dead=true;c.mesh.visible=false;
 reward(progress,30);saveProgress(storage,progress);refreshCash();showToast('THEY DROPPED THEIR WALLET · +$30');
 heat=Math.min(3,heat+1);updateHeat();lastCrimeReport=gameTime;lastSeenByPolice=gameTime;
 for(const other of civilians){if(other.dead||other===c||!other.mesh.visible)continue;if(Math.hypot(other.x-c.x,other.z-c.z)<14){other.hostileUntil=gameTime+25;other.hostileCd=.8+Math.random();other.mode='talk';other.line='MAN DOWN!';other.lineUntil=gameTime+2}}
}
function addTracer(from,to,color){const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color}));scene.add(line);shots.push({line,until:gameTime+.09})}
function damageEnemy(enemy,amount){
 if(!enemy.alive)return;enemy.hp-=amount;setHitFlash(enemy.mesh,true);setTimeout(()=>setHitFlash(enemy.mesh,false),100);$('hitmarker').classList.add('active');setTimeout(()=>$('hitmarker').classList.remove('active'),100);
 if(enemy.hp<=0){enemy.alive=false;scene.remove(enemy.mesh);if(enemy.kind==='target'&&sniperActive){endSniperContract(true)}if(mission===0&&phase===2&&enemy.kind==='drop-guard'){dropKills++;$('mission-count').textContent=`ATTACKERS DOWN  ${Math.min(dropKills,3)} / 3`}if(mission===1&&phase===0&&enemy.kind==='guard'){kills++;$('mission-count').textContent=`GUARDS DOWN  ${Math.min(kills,4)} / 4`}
  if(enemy.kind==='mission'&&sideMission){sideMissionKills++;sideMission.cleared=sideMissionKills;$('mission-count').textContent=sideMissionCounter(sideMission)||'';const step=SIDE_MISSIONS[sideMission.id].steps[sideMission.step];if(step?.kind==='clear'&&sideMissionKills>=step.count){const state=advanceSideMission(sideMission,vehicle?vehicle.mesh.position:player.position,sideMissionKills);if(state)onSideMissionStep(state,true)}}}
}
function shoot(){
 const w=weapons[weaponIndex];if(!started||ended||insideHome||mapOpen||settingsOpen||placeOpen||vehicle||reloadEnd||jailedUntil>gameTime||gameTime-lastShot<w.rate)return;if(ammo[weaponIndex]<=0){reload();return}lastShot=gameTime;ammo[weaponIndex]--;sound(w.explosive?'boom':'shot');
 if(!missionActive&&!race&&civilians.some(c=>c.mesh.visible&&!c.dead&&Math.hypot(c.x-player.position.x,c.z-player.position.z)<18))reportCrime('SOMEBODY SAW THAT · THE POLICE ARE COMING');
 player.rotation.y=cameraYaw;const picked=nearestAnyTarget(),from=player.position.clone().add(new THREE.Vector3(0,1.6,0));let to;
 lookPitch=Math.min(.14,lookPitch+(aiming?.006:.018)+(w.explosive?.05:0));
 if(scoped){const rx=Math.cos(cameraYaw),rz=-Math.sin(cameraYaw);const drift=currentSway*3;player.position.x+=0;from.x+=rx*drift;from.z+=rz*drift}
 if(picked){to=picked.ref.mesh.position.clone().add(new THREE.Vector3(0,1.35,0));player.rotation.y=Math.atan2(from.x-to.x,from.z-to.z);
  if(w.explosive){launchRocket(from,to);finishShot(from);}
  else{if(picked.civ)damageCivilian(picked.ref,w.damage);else damageEnemy(picked.ref,w.damage);finishShot(from,to)}}
 else {const aimRay=new THREE.Raycaster();aimRay.setFromCamera(new THREE.Vector2(0,0),camera);aimRay.far=w.range;const wall=aimRay.intersectObjects(world.buildingMeshes,false)[0];to=wall?wall.point:aimRay.ray.at(w.range,new THREE.Vector3());
  if(!aiming){to=to.clone();to.x+=(Math.random()-.5)*.5;to.y+=(Math.random()-.5)*.3;to.z+=(Math.random()-.5)*.5}
  if(w.explosive){launchRocket(from,to);finishShot(from)}else finishShot(from,to)}
 if(!w.explosive)angryWitnesses();
 $('crosshair').classList.remove('shot');void $('crosshair').offsetWidth;$('crosshair').classList.add('shot');
}
function finishShot(from,to){
 addTracer(from,to||from.clone().add(new THREE.Vector3(0,0,-1)),0xf8ffb0);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.18,6,4),new THREE.MeshBasicMaterial({color:0xffe58b}));flash.position.copy(from).lerp(to||from,.06);scene.add(flash);shots.push({line:flash,until:gameTime+.06});
 if(to){const spark=new THREE.Mesh(new THREE.SphereGeometry(.12,5,4),new THREE.MeshBasicMaterial({color:0xffd9a0}));spark.position.copy(to);scene.add(spark);shots.push({line:spark,until:gameTime+.09});
  for(let i=0;i<3;i++){const d=new THREE.Vector3(Math.random()-.5,Math.random()*.8,Math.random()-.5).normalize().multiplyScalar(1.1);addTracer(to,to.clone().add(d),0xffc38a)}}
}
// Firing into a crowd turns bystanders hostile: they pull steel and fight back.
function angryWitnesses(){
 if(insideHome)return;
 let turned=0;
 for(const c of civilians){
  if(turned>=2)break;
  if(c.dead||!c.mesh.visible||c.hostileUntil>gameTime)continue;
  const d=Math.hypot(c.x-player.position.x,c.z-player.position.z);
  if(d<11&&Math.random()<.6){c.hostileUntil=gameTime+22;c.hostileCd=.6;c.mode='talk';c.line='HEY! WATCH IT!';c.lineUntil=gameTime+2;turned++}
 }
}
const rockets=[];
function launchRocket(from,to){
 const mesh=new THREE.Mesh(new THREE.ConeGeometry(.14,.7,6),new THREE.MeshBasicMaterial({color:0xffb46b}));
 mesh.position.copy(from);scene.add(mesh);
 const dir=to.clone().sub(from).normalize();
 rockets.push({mesh,dir,speed:34,travel:0,max:from.distanceTo(to)});
}
function explodeAt(point){
 sound('boom');shakeUntil=gameTime+.45;
 const ball=new THREE.Mesh(new THREE.SphereGeometry(1.4,10,8),new THREE.MeshBasicMaterial({color:0xffa64d,transparent:true,opacity:.9}));
 ball.position.copy(point);scene.add(ball);shots.push({line:ball,until:gameTime+.35,grow:ball});
 for(const e of enemies){if(!e.alive)continue;const d=e.mesh.position.distanceTo(point);if(d<7)damageEnemy(e,Math.round(130*(1-d/7))+50)}
 for(const c of civilians){if(c.dead||!c.mesh.visible)continue;const d=Math.hypot(c.x-point.x,c.z-point.z);if(d<8){damageCivilian(c,200);break}else if(d<14){c.hostileUntil=gameTime+22;c.hostileCd=.5;c.mode='talk'}}
 reportCrime('EXPLOSION REPORTED · POLICE INBOUND');
}
function updateRockets(dt){
 for(let i=rockets.length-1;i>=0;i--){
  const r=rockets[i],step=r.speed*dt;r.travel+=step;
  r.mesh.position.addScaledVector(r.dir,step);
  r.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),r.dir);
  let boom=r.travel>=r.max;
  if(!boom)for(const e of enemies){if(e.alive&&e.mesh.position.distanceTo(r.mesh.position)<2.2){boom=true;break}}
  if(!boom&&r.mesh.position.y<.3)boom=true;
  if(boom){explodeAt(r.mesh.position.clone());scene.remove(r.mesh);rockets.splice(i,1)}
 }
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
let jailedUntil=0,jailRealUntil=0,shakeUntil=0,currentSway=0;
function updateHostileCivilians(dt){
 const pos=vehicle?vehicle.mesh.position:player.position;
 for(const c of civilians){
  if(c.dead||!(c.hostileUntil>gameTime))continue;
  if(!c.mesh.visible){c.mesh.visible=true}
  const dx=pos.x-c.x,dz=pos.z-c.z,d=Math.hypot(dx,dz)||1;
  c.ry=Math.atan2(-dx,-dz);c.mesh.rotation.y=c.ry;
  if(d>2.2){const step=Math.min(3.4*dt,d);const moved=movePosition(c.mesh.position,dx/d*step,dz/d*step,walkingObstacles(),.2);c.x=c.mesh.position.x;c.z=c.mesh.position.z;c.walk+=dt;animateWalk(c.mesh,1,c.walk,dt,true)}
  c.hostileCd=(c.hostileCd??0)-dt;
  if(c.hostileCd<=0&&d<14&&hasLineOfSight(c.mesh.position,pos,world.blocks)){c.hostileCd=1.5+Math.random();sound('npcshot');hit(vehicle?2:4);addTracer(c.mesh.position.clone().add(new THREE.Vector3(0,1.5,0)),pos.clone().add(new THREE.Vector3(0,1.2,0)),0xff866d);c.line='TAKE THAT!';c.lineUntil=gameTime+1.2}
  if(c.hostileUntil<gameTime+0.05){c.mode='walk';c.line=null}
 }
}
function updateMap(){
 const ctx=$('map').getContext('2d'),w=200;ctx.clearRect(0,0,w,w);ctx.fillStyle='#1c2b29';ctx.fillRect(0,0,w,w);const pos=insideHome?entrance(interiorPlace):vehicle?vehicle.mesh.position:player.position,scale=2.5;ctx.save();ctx.translate(w/2,w/2);if(mapRotate)ctx.rotate(cameraYaw);
 for(let i=-ROAD_LIMIT;i<=ROAD_LIMIT;i+=28){ctx.fillStyle='#465451';ctx.fillRect((i-pos.x)*scale-16,-100,32,200);ctx.fillRect(-100,(i-pos.z)*scale-16,200,32)}
 if(currentRoute.length>1){ctx.strokeStyle='#c9fc51';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();currentRoute.forEach((point,i)=>{const x=(point.x-pos.x)*scale,z=(point.z-pos.z)*scale;if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z)});ctx.stroke()}
 ctx.fillStyle='#c9fc51';let tx=(target.x-pos.x)*scale,tz=(target.z-pos.z)*scale;const length=Math.hypot(tx,tz);if(length>83){tx=tx/length*83;tz=tz/length*83}ctx.save();ctx.translate(tx,tz);ctx.rotate(Math.PI/4);ctx.fillRect(-6,-6,12,12);ctx.restore();
 ctx.fillStyle='#ff806d';if(rival){const rp=rival.car.mesh.position,x=(rp.x-pos.x)*scale,z=(rp.z-pos.z)*scale;if(Math.hypot(x,z)<90){ctx.beginPath();ctx.arc(x,z,5,0,Math.PI*2);ctx.fill()}}for(const e of enemies){if(!e.alive)continue;const x=(e.mesh.position.x-pos.x)*scale,z=(e.mesh.position.z-pos.z)*scale;if(Math.hypot(x,z)<90){ctx.beginPath();ctx.arc(x,z,3,0,Math.PI*2);ctx.fill()}}
 for(const pickup of pickups){if(pickup.cooldown)continue;const x=(pickup.group.position.x-pos.x)*scale,z=(pickup.group.position.z-pos.z)*scale;if(Math.hypot(x,z)>90)continue;ctx.fillStyle='#'+PICKUP_TYPES[pickup.type].color.toString(16).padStart(6,'0');ctx.beginPath();ctx.arc(x,z,2.6,0,Math.PI*2);ctx.fill()}
 ctx.save();if(!mapRotate)ctx.rotate(-cameraYaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
}
function setMapOpen(open){
 if(open&&(ended||settingsOpen||placeOpen||editingLayout||districtOpen||arcadeOpen||casinoOpen||gameMenuOpen||raceOpen))return;
 mapOpen=open; $('map-overlay').hidden=!open;
 if(open){resetInputs();setWeaponMenu(false);const position=insideHome?entrance(interiorPlace):vehicle?vehicle.mesh.position:player.position;currentRoute=roadRoute(position,target);drawFullMap($('full-map'),{headingUp:mapRotate,blocks:world.blocks,position,target,route:currentRoute,enemies:rival?[...enemies,{alive:true,mesh:rival.car.mesh}]:enemies,vehicles,cameraYaw,pickups:pickups.filter(pk=>!pk.cooldown).map(pk=>({x:pk.group.position.x,z:pk.group.position.z,color:PICKUP_TYPES[pk.type].color}))});$('close-map').focus()}
 else {(started?$('open-map'):$('menu-map')).focus()}
}
$('open-map').onclick=()=>setMapOpen(true);$('menu-map').onclick=()=>setMapOpen(true);$('close-map').onclick=()=>setMapOpen(false);
$('full-map').addEventListener('click',e=>{if(!started||missionActive)return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*(MAP_BOUND*2)-MAP_BOUND,z=(e.clientY-rect.top)/rect.height*(MAP_BOUND*2)-MAP_BOUND;let nearest=null,distance=20;for(const place of LANDMARKS){const p=entrance(place),d=Math.hypot(x-p.x,z-p.z);if(d<distance){nearest={...p,name:place.name};distance=d}}for(const district of DISTRICTS){const d=Math.hypot(x-district.x,z-district.z);if(d<distance){nearest=district;distance=d}}if(nearest){target={x:nearest.x,z:nearest.z};routeTarget=null;setMapOpen(false);showToast(`GPS SET · ${nearest.name}`)}});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyLayout(controlLayout);if(editingLayout)renderLayoutEditor()}window.addEventListener('resize',resize);resize();
window.addEventListener('keydown',e=>{if(raceOpen){if(e.code==='Escape'){e.preventDefault();closeRaceRoom()}return}if(gameMenuOpen){if(e.code==='Escape')closeGameMenu();return}if(casinoOpen){if(e.code==='Escape')closeCasino();return}if(arcadeOpen){if(e.code==='Escape'){e.preventDefault();closeArcade()}return}if(e.code==='Escape'&&mapOpen){e.preventDefault();setMapOpen(false);return}if(e.code==='KeyM'&&!e.repeat){e.preventDefault();setMapOpen(!mapOpen);return}if(settingsOpen||placeOpen||editingLayout||districtOpen){if(e.code==='Escape'){if(districtOpen)cancelDistrict();else if(editingLayout){editingLayout=false;$('layout-editor').hidden=true;applyLayout(controlLayout)}else if(placeOpen){if(conversationInside)closeConversation();else closePlace()}else setSettings(false)}return}if(mapOpen)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(e.code==='KeyE')interact();if(e.code==='KeyT'&&nearestPerson())openConversation(false);if(e.code==='KeyQ')switchWeapon();if(e.code==='KeyR')reload();if(e.code==='KeyV')toggleAim();if(e.code==='Space'){keyboardFire=true;updateFire();if(started&&!ended&&!vehicle)shoot()}if(e.code==='Escape')setWeaponMenu(false)});
window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space'){keyboardFire=false;updateFire()}});
window.addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs()});
let districtFromSettings=false,districtOriginal=selectedDistrict;
function setDistrictGps(){target=selectedDistrict.id==='city'?entrance(LANDMARKS.find(p=>p.id==='hub')):{x:selectedDistrict.x,z:selectedDistrict.z};routeTarget=null}
function cancelDistrict(){selectedDistrict=districtOriginal;$('district-choice').textContent=selectedDistrict.label;$('district-caption').textContent=`Selected: ${selectedDistrict.name}`;setDistrictOpen(false)}
function setDistrictOpen(open,fromSettings=false){districtOpen=open;$('district-overlay').hidden=!open;if(open){districtOriginal=selectedDistrict;districtFromSettings=fromSettings;if(fromSettings)setSettings(false);resetInputs();$('district-travel').hidden=!started||missionActive;$('district-travel').textContent=fromSettings?'SET GPS ONLY':'TRAVEL NOW ↗';$('district-confirm').textContent=fromSettings&&started&&!missionActive?'TRAVEL TO SELECTED DISTRICT ↗':missionActive?'SAVE FOR LATER':'CONFIRM DISTRICT ↗';$('district-help').textContent=missionActive?'Travel is unavailable during a mission. You can choose a district for later.':(fromSettings&&started?'Select a district, then travel now or set your GPS without moving.':'Swipe to explore. These are connected districts, not separate maps.');renderDistrictCards();$('district-close').focus()}else if(districtFromSettings){setSettings(true);$('settings-districts').focus()}else $('menu-districts').focus()}
function travelToDistrict(){if(!started||missionActive)return;resetInputs();if(vehicle){vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false;vehicle=null;vehicleSpeed=0;engineAudio.stop();player.visible=true}insideHome=false;homeInterior.visible=false;for(const room of Object.values(interiors))room.visible=false;marker.visible=true;const p=selectedDistrict;player.position.set(p.x,0,p.z);cameraYaw=p.x<0?Math.PI/2:-Math.PI/2;player.rotation.y=cameraYaw;camera.position.set(p.x+Math.sin(cameraYaw)*7,4.5,p.z+Math.cos(cameraYaw)*7);target=entrance(LANDMARKS.find(x=>x.id==='hub'));routeTarget=null;setObjective('FREE ROAM','Explore the city or visit the mission hub.',1);showToast(`ARRIVED · ${p.name}`)}
// The legend is generated from the same data the map draws, so it can never
// drift when a district or a door is added.
function renderMapLegend(){
  const list=$('map-legend-list');if(!list)return;
  const places=LANDMARKS.map(place=>`${mapLetter(place)} ${place.name}`).join(' · ');
  const districts=DISTRICTS.map(district=>`${DISTRICT_LETTERS[district.id]||'•'} ${district.name}`).join(' · ');
  list.innerHTML=`${places}<br><br>DISTRICTS<br>${districts}<br><br>TAP A PIN FOR GPS (FREE ROAM)`;
}
function renderDistrictCards(){const list=$('district-scroll');list.replaceChildren();for(const district of DISTRICTS){const button=document.createElement('button');button.className='district-card'+(district.id===selectedDistrict.id?' selected':'');button.setAttribute('aria-pressed',String(district.id===selectedDistrict.id));button.setAttribute('aria-label',`${district.name} environment`);button.innerHTML=`<img src="${import.meta.env.BASE_URL}assets/districts/${district.id}.jpg" alt=""><span class="district-card-label"><b>${district.label}</b><small>${district.name}</small></span>`;button.onclick=()=>{selectedDistrict=district;$('district-choice').textContent=district.label;$('district-caption').textContent=`Selected: ${district.name}`;const scroll=list.scrollLeft;renderDistrictCards();list.scrollLeft=scroll;list.querySelector('.selected')?.focus({preventScroll:true})};button.querySelector('img')?.addEventListener('error',event=>{event.target.src=`${import.meta.env.BASE_URL}assets/districts/city.jpg`});list.appendChild(button)}}
$('menu-districts').onclick=()=>setDistrictOpen(true);$('settings-districts').onclick=()=>setDistrictOpen(true,true);$('district-travel').onclick=()=>{const gpsOnly=districtFromSettings;setDistrictOpen(false);setSettings(false);if(gpsOnly){setDistrictGps();showToast(`GPS SET · ${selectedDistrict.name}`)}else travelToDistrict()};$('district-close').onclick=cancelDistrict;$('district-confirm').onclick=()=>{const go=districtFromSettings&&started&&!missionActive;setDistrictOpen(false);if(go){setSettings(false);travelToDistrict()}else if(!missionActive)setDistrictGps()};
function closeGameMenu(){gameMenuOpen=false;$('game-menu-overlay').hidden=true;(started?$('game-menu-button'):$('menu-activities')).focus()}
function openGameMenu(){if(ended||mapOpen||settingsOpen||placeOpen||districtOpen||arcadeOpen||casinoOpen||raceOpen)return;resetInputs();setWeaponMenu(false);gameMenuOpen=true;$('game-menu-overlay').hidden=false;$('game-menu-note').textContent=!started?'Start the game to begin races and jobs. Arcade and settings are available now.':missionActive?'A job is active; finish or cancel it before starting another.':'Choose an activity. Time trials are solo and use in-game cash rewards.';const grid=$('game-menu-grid');grid.replaceChildren();function add(label,fn,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;grid.appendChild(b)}add('🏁 CAR RACE ROOM · 2-5 CARS',()=>{closeGameMenu();setRaceClass('car');openRaceRoom()},!started||missionActive);add('🏍️ BIKE RACE ROOM · 2-5 BIKES',()=>{closeGameMenu();setRaceClass('bike');openRaceRoom()},!started||missionActive);add(`🚘 ${DEALERSHIP_NAME} · BUY CARS & BIKES`,()=>{closeGameMenu();openDealership()},!started);add('📞 CALL MY VEHICLE HERE',()=>{closeGameMenu();openGaragePicker()},!started||!ownedVehicles.length);add('📻 RADIO · CHANGE STATION',()=>{closeGameMenu();cycleRadio()},!started);for(const [label,id] of [['🏁 CAR RACING · TIME TRIAL','carRace'],['🏍️ BIKE RACING · TIME TRIAL','bikeRace']])add(label,()=>{closeGameMenu();beginSideActivity(id)},!started||missionActive);add('📋 MISSIONS · NIGHT PATROL & MORE',()=>{closeGameMenu();openMissions()},!started||(missionActive&&!sideMission));for(const [label,id] of [['📦 COASTAL COURIER · JOB','coast'],['📦 PORT DISPATCH · JOB','port']])add(label,()=>{closeGameMenu();beginSideActivity(id)},!started||missionActive);if(sideMission)add('❌ CANCEL CURRENT MISSION',()=>{closeGameMenu();finishSideMission(false)});if(activity)add('❌ CANCEL CURRENT ACTIVITY',()=>{closeGameMenu();finishSideActivity(false)});add('🎯 ROOFTOP SNIPER · CONTRACT',()=>{closeGameMenu();startSniperContract()},!started||missionActive);add('🎮 MINI GAMES · CHESS, LUDO & MORE',()=>{closeGameMenu();openArcade('menu')});add('⚙️ SETTINGS & ENVIRONMENT',()=>{closeGameMenu();setSettings(true)});add('🗺️ CITY MAP',()=>{closeGameMenu();setMapOpen(true)});$('game-menu-close').focus()}
function openGaragePicker(){
 if(!ownedVehicles.length){showToast('YOU DO NOT OWN A VEHICLE YET · VISIT HALCYON MOTORS');return}
 closePlace();resetInputs();placeOpen=true;$('place-overlay').hidden=false;$('place-title').textContent='YOUR GARAGE';$('place-desc').textContent='Choose which of your vehicles to call to the street beside you.';$('place-actions').replaceChildren();
 for(const ownedId of ownedVehicles){const entry=vehicleById(ownedId);placeButton(`${entry?.brand||ownedId} ${entry?.model||''} · ${entry?.kind==='bike'?'🏍️ BIKE':'🚗 CAR'}`,()=>{closePlace();callMyVehicle(ownedId)})}
 placeButton('✕ CLOSE',()=>closePlace());
}
$('game-menu-close').onclick=closeGameMenu;$('game-menu-button').onclick=openGameMenu;$('menu-activities').onclick=openGameMenu;document.querySelector('.status')?.addEventListener('click',()=>{if(started&&!ended&&vehicle&&!mapOpen&&!settingsOpen&&!placeOpen)cycleRadio()});
$('talk-btn').onclick=()=>{const person=nearestPerson();if(person)openStreetConversation(person);else if(insideHome&&interiorCrowd(interiorPlace.id).length)openConversation(true);else showToast('NOBODY CLOSE ENOUGH TO TALK TO')};
$('settings-button').onclick=()=>setSettings(!settingsOpen);$('menu-settings').onclick=()=>setSettings(true);$('close-settings').onclick=()=>setSettings(false);
$('start').onclick=()=>{started=true;$('intro').classList.add('hidden');homeInterior.visible=true;player.position.set(HOME_CENTER.x,0,HOME_CENTER.z);camera.position.set(0,4,HOME_CENTER.z+7);marker.visible=false;const snap=loadResume();if(snap){player.position.set(snap.x,0,snap.z);cameraYaw=snap.yaw||0;player.rotation.y=cameraYaw;camera.position.set(snap.x,4,snap.z+7);health=Math.max(1,Math.min(100,snap.health||100));heat=Math.max(0,Math.min(3,snap.heat||0));updateHeat();if(Number.isInteger(snap.weaponIndex)&&snap.weaponIndex>=0&&snap.weaponIndex<weapons.length){weaponIndex=snap.weaponIndex;updateWeapon(player,weaponIndex)}if(Array.isArray(snap.ammo))snap.ammo.forEach((n,i)=>{if(i<ammo.length&&Number.isFinite(n))ammo[i]=Math.max(0,Math.round(n))})}setObjective(snap?'WELCOME BACK':'AT HOME',snap?'You resumed where you left off — cash, gear and spot in the city.':(selectedDistrict.id==='city'?'Rest here or exit and visit the mission hub.':`Rest here or travel to ${selectedDistrict.name}.`),1);try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();prepareAudio();music=createMusic(audio);songRadio=createSongRadio(audio);
  (async()=>{for(const [track,file] of [['coast','vocal-coast'],['night','vocal-night']]){try{const r=await fetch(`${import.meta.env.BASE_URL}assets/audio/${file}.mp3`);if(r.ok&&music)setVocalSafe(track,await audio.decodeAudioData(await r.arrayBuffer()))}catch{}}})()}catch{}showToast(snap?'WELCOME BACK · YOU RESUMED WHERE YOU LEFT OFF':'YOUR HOME · TAP OPTIONS TO REST OR LEAVE')};
$('jail-bail').onclick=()=>{if(payFor(150))releaseFromJail(true)};
// Accounts: create / sign in / sign out. Progress and garage are namespaced
// per account (see accounts.js), so each player resumes their own save.
function currentAccount(){return getSessionAccount(storage)}
function updateAccountUI(){const account=currentAccount();$('account-state').textContent=account?account.email.toUpperCase():'SIGN IN ↗';$('account-form').hidden=!!account;$('account-signed').hidden=!account;$('account-title').innerHTML=account?'WELCOME <span>BACK.</span>':'SIGN <span>IN.</span>';if(account)$('account-email-display').textContent=account.email}
function applyAccountData(){if(started)saveResume();const account=currentAccount();accountScope=account?account.id:null;setProgressScope(accountScope);Object.assign(progress,loadProgress(storage));ownedVehicles=[];loadGarage();lastOwnedVehicle=null;refreshCash()}
$('menu-account').onclick=()=>{$('account-msg').textContent='';$('account-email').value='';$('account-password').value='';updateAccountUI();$('account-screen').classList.remove('hidden');sound('reload')};
$('account-close').onclick=()=>{$('account-screen').classList.add('hidden');sound('reload')};
$('account-form').onsubmit=async event=>{event.preventDefault();const email=$('account-email').value,password=$('account-password').value;$('account-msg').textContent='CHECKING…';const result=await signInAccount(storage,email,password);if(!result.ok){$('account-msg').textContent=result.error;sound('fail');return}$('account-msg').textContent='';applyAccountData();updateAccountUI();$('account-screen').classList.add('hidden');showToast(`WELCOME BACK ${result.account.email.toUpperCase()} · RESUMING WHERE YOU LEFT OFF`);sound('success')};
$('account-create').onclick=async()=>{const email=$('account-email').value,password=$('account-password').value;$('account-msg').textContent='CREATING…';const result=await registerAccount(storage,email,password);if(!result.ok){$('account-msg').textContent=result.error;sound('fail');return}$('account-msg').textContent='';applyAccountData();saveProgress(storage,progress);updateAccountUI();$('account-screen').classList.add('hidden');showToast(`ACCOUNT CREATED · A FRESH LIFE IN PALM GROVE, ${result.account.email.toUpperCase()}`);sound('success')};
$('account-signout').onclick=()=>{saveProgress(storage,progress);saveGarage();if(started)saveResume();signOut(storage);applyAccountData();updateAccountUI();showToast('SIGNED OUT · BACK TO THE GUEST SAVE');sound('reload')};
updateAccountUI();
$('scope-zoom-in').onclick=()=>{scopeZoom=Math.min(2,scopeZoom+1);updateScopeInfo()};
$('scope-zoom-out').onclick=()=>{scopeZoom=Math.max(0,scopeZoom-1);updateScopeInfo()};
$('scope-breath').onclick=()=>{breathUntil=gameTime+2.6;showToast('BREATH HELD · SCOPE STEADY')};
$('scope-leave').onclick=()=>endSniperContract(false);
$('retry').onclick=retryMission;$('return-city').onclick=()=>{resetInputs();removeRival();for(const enemy of enemies)scene.remove(enemy.mesh);enemies.length=0;mission=0;phase=0;kills=0;dropKills=0;heat=0;missionActive=false;activity=null;rewardsPaid.clear();target=entrance(LANDMARKS.find(p=>p.id==='hub'));routeTarget=null;health=100;ended=false;$('end').classList.add('hidden');setObjective('FREE ROAM','Visit the mission hub to start a new job.',1);showToast('BACK IN THE CITY · VISIT THE HUB FOR JOBS')};$('restart').onclick=()=>location.reload();$('interact-btn').onclick=interact;$('weapon-btn').onclick=()=>setWeaponMenu(!weaponMenuOpen);$('reload-btn').onclick=reload;$('aim-btn').onclick=toggleAim;
function setSettings(open){settingsOpen=open;$('settings-panel').hidden=!open;$('settings-button').setAttribute('aria-expanded',String(open));if(open){resetInputs();setWeaponMenu(false)} }
function updateSettings(){ $('sound-toggle').textContent=muted?'SOUND OFF':'SOUND ON';$('sound-toggle').setAttribute('aria-pressed',String(!muted));$('assist-toggle').textContent=aimAssist?'ASSIST ON':'ASSIST OFF';$('assist-toggle').setAttribute('aria-pressed',String(aimAssist));$('sensitivity').value=lookSensitivity;$('aim-sensitivity').value=aimSensitivity;$('steer-sensitivity').value=steerSensitivity;$('invert-look').textContent=invertLook?'INVERT LOOK ON':'INVERT LOOK OFF';$('invert-look').setAttribute('aria-pressed',String(invertLook));$('high-contrast').textContent=highContrast?'HIGH CONTRAST ON':'HIGH CONTRAST OFF';$('high-contrast').setAttribute('aria-pressed',String(highContrast));const voiceAvailable='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;$('voice-toggle').disabled=!voiceAvailable;$('voice-toggle').textContent=voiceAvailable?(voiceLines?'DIALOGUE VOICE ON':'DIALOGUE VOICE OFF'):'DIALOGUE VOICE UNAVAILABLE';$('voice-toggle').setAttribute('aria-pressed',String(voiceAvailable&&voiceLines));$('hud').classList.toggle('high-contrast',highContrast);$('sfx-volume').value=sfxVolume*100;$('music-volume').value=musicVolume*100;$('music-track').value=musicTrack;$('graphics-quality').value=graphicsQuality;$('map-rotate').textContent=mapRotate?'🧭 MAP TURNS WITH YOU ON':'🧭 MAP TURNS WITH YOU OFF';$('map-rotate').setAttribute('aria-pressed',String(mapRotate));$('control-size').value=Math.round(controlScale*100);$('map-orient').textContent=mapRotate?'HEAD ↑':'N ↑';const note=$('map-orient-note');if(note)note.textContent=mapRotate?'Map turns as you turn.':'North is up.'; }
function applyControlSize(){document.documentElement.style.setProperty('--ctrl',controlScale.toFixed(2))}
function persistSettings(){savePreferences(storage,{muted,aimAssist,lookSensitivity,aimSensitivity,steerSensitivity,invertLook,highContrast,voiceLines,sfxVolume,musicVolume,musicTrack,graphicsQuality,mapRotate,controlScale})}
$('sound-toggle').onclick=()=>{muted=!muted;updateSettings();persistSettings()};$('assist-toggle').onclick=()=>{aimAssist=!aimAssist;updateSettings();persistSettings()};$('sensitivity').oninput=e=>{lookSensitivity=Number(e.target.value);persistSettings()};$('aim-sensitivity').oninput=e=>{aimSensitivity=Number(e.target.value);persistSettings()};$('steer-sensitivity').oninput=e=>{steerSensitivity=Number(e.target.value);persistSettings()};$('invert-look').onclick=()=>{invertLook=!invertLook;updateSettings();persistSettings()};$('high-contrast').onclick=()=>{highContrast=!highContrast;updateSettings();persistSettings()};$('voice-toggle').onclick=()=>{voiceLines=!voiceLines;updateSettings();persistSettings()};$('sfx-volume').oninput=e=>{sfxVolume=Number(e.target.value)/100;persistSettings()};$('music-volume').oninput=e=>{musicVolume=Number(e.target.value)/100;persistSettings()};$('music-track').onchange=e=>{musicTrack=e.target.value;persistSettings()};function applyGraphics(){renderer.setPixelRatio(Math.min(devicePixelRatio,graphicsQuality==='performance'?.8:1.15));renderer.shadowMap.enabled=graphicsQuality!=='performance';sun.castShadow=graphicsQuality!=='performance';renderer.setSize(innerWidth,innerHeight)}$('graphics-quality').onchange=e=>{graphicsQuality=e.target.value;applyGraphics();persistSettings()};$('map-rotate').onclick=()=>{mapRotate=!mapRotate;updateSettings();persistSettings()};$('control-size').oninput=e=>{controlScale=Number(e.target.value)/100;applyControlSize();persistSettings()};applyGraphics();applyControlSize();updateSettings();
function updateAimButton(){$('aim-btn').classList.toggle('selected',aiming);$('aim-btn').setAttribute('aria-pressed',String(aiming));$('crosshair').classList.toggle('aiming',aiming)}
function startSniperContract(){
 if(missionActive||sideMission||sniperActive){showToast('FINISH YOUR CURRENT JOB FIRST');return}
 sniperActive=true;sniperPrev={x:player.position.x,z:player.position.z,yaw:cameraYaw};
 player.position.set(42,16,-42);player.visible=true;cameraYaw=Math.PI;player.rotation.y=cameraYaw;
 tempSniper=true;const idx=weapons.findIndex(w=>w.unlock==='sniper');ammo[idx]=weapons[idx].cap;equipWeapon(idx);
 spawnEnemy(40,-30,'target');spawnEnemy(46,-31,'guard');spawnEnemy(37,-33,'guard');sniperSpawns=enemies.slice(-3);
 setObjective('ROOFTOP CONTRACT','Scope the plaza below and drop the mark. One clean shot from the roof.',1,'TARGET LIVE');
 showToast('ON THE ROOFTOP · TAP 🎯 AIM TO SCOPE');
}
function endSniperContract(win){
 for(const e of sniperSpawns)if(e.alive){e.alive=false;scene.remove(e.mesh)}
 sniperSpawns=[];scoped=false;$('scope-overlay').hidden=true;sniperActive=false;tempSniper=false;
 if(sniperPrev){player.position.set(sniperPrev.x,0,sniperPrev.z);cameraYaw=sniperPrev.yaw}
 if(win){reward(progress,1500);saveProgress(storage,progress);refreshCash();showToast('CONTRACT COMPLETE · +$1500');sound('success')}
 else showToast('CONTRACT ABANDONED');
 setObjective('FREE ROAM','Visit the mission hub or game menu for more work.',1);
}
function updateScopeInfo(){$('scope-info').textContent=`LENS ${[2,4,8][scopeZoom]}× · 🫁 TO STEADY`}
function toggleAim(){if(sniperActive&&started&&!ended){scoped=!scoped;$('scope-overlay').hidden=!scoped;if(scoped){scopeZoom=1;updateScopeInfo()}updateAimButton();return}if(!started||ended||vehicle||insideHome||settingsOpen||placeOpen)return;aiming=!aiming;updateAimButton()}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function updateFire(){fireHeld=keyboardFire||firePointers.size>0}
function applyLook(dx,dy){const factor=(.0025+lookSensitivity*.0007)*(aiming?(.35+aimSensitivity*.07):1);cameraYaw-=dx*factor;lookPitch=THREE.MathUtils.clamp(lookPitch+dy*factor*.7*(invertLook?-1:1),-.3,.4)}
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
// ------------------------------------------------------------ STORY MISSIONS
// Extra missions are short chains of reach/clear/chase steps. They use the same
// marker, enemies and rewards as the three-mission story, but can be restarted.
let missionChase=null;
function openMissions(){
  if(!started||ended)return;
  resetInputs();placeOpen=true;$('place-overlay').hidden=false;$('place-title').textContent='CITY MISSIONS';
  $('place-desc').textContent='Pick a job. Each one pays in fictional in-game cash and takes a few minutes. Cancel a running mission from the game menu.';
  $('place-actions').replaceChildren();
  if(sideMission)placeButton(`CANCEL ${sideMission.name}`,()=>{closePlace();finishSideMission(false)});
  for(const id of SIDE_MISSION_IDS){const mission=SIDE_MISSIONS[id];placeButton(`${mission.name} · $${mission.reward}`,()=>startSideMission(id))}
  placeButton('BACK',closePlace);
}
function startSideMission(id){
  if(missionActive)return;
  sideMission=createSideMission(id);if(!sideMission)return;
  missionActive=true;sideMissionKills=0;missionChase=null;
  const first=sideMissionTarget(sideMission);
  if(first){target={...first};marker.position.set(target.x,0,target.z)}routeTarget=null;
  setObjective(sideMission.name,sideMissionObjective(sideMission),1);
  $('mission-number').textContent='CITY MISSION';
  $('mission-count').textContent=sideMissionCounter(sideMission)||`STEP 1 / ${SIDE_MISSIONS[id].steps.length}`;
  marker.visible=true;closePlace();showToast(`${sideMission.name} STARTED`);sound('success');
}
function finishSideMission(success){
  if(!sideMission)return;
  const result=sideMission;sideMission=null;missionActive=false;missionChase=null;
  for(const enemy of enemies)scene.remove(enemy.mesh);enemies.length=0;
  target=entrance(LANDMARKS.find(p=>p.id==='hub'));routeTarget=null;
  if(success){reward(progress,result.reward);refreshCash();sound('success');showToast(`${result.name} COMPLETE · +$${result.reward}`)}
  else showToast(`${result.name} CANCELLED`);
  setObjective('FREE ROAM','Visit the mission hub or open the game menu for more work.',1);
}
function updateSideMissionRun(dt){
  if(!sideMission||sideMission.done||!missionActive)return;
  const step=SIDE_MISSIONS[sideMission.id]?.steps[sideMission.step];
  if(!step)return;
  const pos=vehicle?vehicle.mesh.position:player.position;
  if(step.kind==='chase'){
    if(!missionChase)missionChase={x:step.target.x,z:step.target.z,points:step.follow.map(([x,z])=>({x,z})),speed:11};
    advanceChase(missionChase,dt,world.blocks,movePosition);
    marker.position.set(missionChase.x,0,missionChase.z);
    $('mission-count').textContent=`CATCH THE VAN · ${Math.round(Math.hypot(missionChase.x-pos.x,missionChase.z-pos.z))} M`;
    if(chaseCaught(missionChase,pos)){const state=advanceSideMission(sideMission,pos,0,0,true);missionChase=null;if(state)onSideMissionStep(state)}
    return;
  }
  if(step.kind==='clear'){
    $('mission-count').textContent=sideMissionCounter(sideMission);
    if(sideMissionKills>=step.count){const state=advanceSideMission(sideMission,pos,sideMissionKills);if(state)onSideMissionStep(state,true)}
    return;
  }
  const state=advanceSideMission(sideMission,pos);
  if(state)onSideMissionStep(state);
}
function onSideMissionStep(state,fromClear=false){
  if(!sideMission)return;
  if(state==='complete'){finishSideMission(true);return}
  const step=SIDE_MISSIONS[sideMission.id].steps[sideMission.step];
  target=sideMissionTarget(sideMission);routeTarget=null;
  if(target)marker.position.set(target.x,0,target.z);
  $('mission-count').textContent=sideMissionCounter(sideMission)||`STEP ${sideMission.step+1} / ${SIDE_MISSIONS[sideMission.id].steps.length}`;
  setObjective(sideMission.name,sideMissionObjective(sideMission),1,$('mission-count').textContent);
  sound('success');showToast(step.label.toUpperCase());
  if(step.kind==='clear'){sideMissionKills=0;for(const [x,z] of step.spawns)spawnEnemy(x,z,'mission');}
}

// ---------------------------------------------------------------- RACE ROOM
// Races are checkpoint races for 2-5 racers. The host holds the race state and
// shares small snapshots over WebRTC; solo/computer races use the same rules so
// the HUD and results behave identically online and offline.
let racePeerOverride=null, race=null, raceUI=null, raceClass='car', raceTrackId=defaultTrackFor('car'), raceNetModule=null, raceCpuCount=2, raceNameValue=(()=>{try{return (storage?.getItem('aivm-racer-name')||'RACER').slice(0,12)}catch{return 'RACER'}})();
const raceVisuals=new Map();

function raceName(){return String(raceNameValue||'RACER').trim().slice(0,12).toUpperCase()||'RACER'}
function raceDisplayName(){return raceNameValue||'YOU'}
function raceLocalId(){return race?.localId||(race?.isHost?'host':'guest')}
function racePlayer(){return race?.room?.players.find(p=>p.id===raceLocalId())||null}
function raceTrack(){return trackById(race?.trackId||raceTrackId)||RACE_TRACKS[defaultTrackFor(raceClass)]}
// The discipline being raced right now: a live room wins over the menu choice.
function currentRaceClass(){return normalizeRaceClass(race?.vehicleClass||race?.room?.vehicleClass||raceClass)}
function setRaceClass(cls){
  const next=normalizeRaceClass(cls);
  if(next===raceClass)return;
  raceClass=next;raceTrackId=defaultTrackFor(next);
  // A bike race puts you on a bike: swap the machine before the grid is built.
  if(race&&race.status!=='finished'&&vehicle&&vehicle.type!==(next==='bike'?'bike':'car')){finishRaceVehicle();prepareRaceRacers()}
  raceUI?.render();
}
// Your best owned machine of the right class, otherwise the race-spec default.
function raceVehicleEntry(cls){
  const wanted=cls==='bike'?'orbit-600':'corsair-blaze';
  const owned=ownedVehicles.map(vehicleById).filter(Boolean).filter(entry=>raceClassOf(entry)===cls);
  if(owned.length)return owned.reduce((best,entry)=>entry.top>best.top?entry:best,owned[0]);
  return vehicleById(wanted);
}
function raceStatusText(text){if(race)race.statusText=text;if(raceOpen&&race)renderRaceRoom()}

function renderRaceRoom(){
  if(!race||!raceOpen||!raceUI)return;
  const room=race.room,players=room?.players||[],local=racePlayer();
  raceUI.renderRoom({
    code:race.code,trackName:race.trackName||raceTrack().name,status:race.statusText||(race.room?.status==='lobby'?'WAITING FOR RACERS':'RACE IN PROGRESS'),
    vehicleClass:currentRaceClass(),totalCheckpoints:raceTrack().checkpoints.length,
    players,canStart:race.isHost&&room?.status==='lobby'&&players.length>=2,canAddBot:room?.status==='lobby',
    isHost:race.isHost,hint:race.isHost?'Share this code. Start when everyone has joined.':(local?'Waiting for the host to start…':'Connecting…'),
    formatTime:formatRaceTime,
  });
}
function openRaceRoom(){
  if(ended||missionActive)return;
  if(race&&race.status!=='finished'){raceOpen=true;$('race-overlay').hidden=false;renderRaceRoom();return}
  resetInputs();setWeaponMenu(false);closeGameMenu();raceOpen=true;$('race-overlay').hidden=false;
  const show=()=>{raceUI=createRaceUI($('race-panel'),{
    close:closeRaceRoom,
    raceClass:()=>raceClass,setRaceClass,
    track:id=>{raceTrackId=id;raceClass=classOfTrack(id);raceUI.render()},trackId:()=>raceTrackId,
    solo:startSoloRace,host:hostRace,join:code=>joinRaceRoom(code),
    start:()=>{if(!race?.isHost)return;if(!startRoom(race.room,Date.now())){raceStatusText('NEED AT LEAST TWO RACERS');return}broadcastSnapshot();beginRaceCountdown(race.room.startAt)},
    addBot:()=>{if(!race?.isHost||race.room.players.length>=MAX_RACERS)return;if(addBot(race.room,`CPU ${race.room.players.length}`)){broadcastSnapshot();renderRaceRoom()}},
    leave:()=>leaveRace(),
    name:()=>raceNameValue,setName:value=>{raceNameValue=String(value||'').slice(0,12);try{storage?.setItem('aivm-racer-name',raceNameValue)}catch{}},
    cpuCount:()=>raceCpuCount,setCpuCount:count=>{raceCpuCount=Math.max(1,Math.min(4,Number(count)||2));raceUI?.render()},
  });raceUI.render()};
  if(!raceUI)show();else raceUI.render();
}
function closeRaceRoom(){
  if(race&&race.status!=='finished')return leaveRace();
  raceOpen=false;$('race-overlay').hidden=true;openGameMenu();
}
// Builds the visual vehicles used for remote racers and computer racers. Bike
// races get bikes with riders; car races get a spread of catalog marques.
const RIVAL_BIKES=['orbit-600','kestrel-250','mara-trail','zephyr-cruiser'];
const RIVAL_CARS=['corsair-blaze','vantor-s','sable-gth','halcyon-proto','tundra-trail'];
function raceVehicleVisual(tint,index=0){
  const cls=currentRaceClass(),id=cls==='bike'?RIVAL_BIKES[index%RIVAL_BIKES.length]:RIVAL_CARS[index%RIVAL_CARS.length];
  const entry=vehicleById(id),car=world.vehicle(entry.kind==='bike'?'bike':'car',0,0,entry.length);
  applyCatalog(car,entry,tint);car.occupied=true;car.mesh.visible=false;models.vehicle(car,car.tint);
  if(car.rider)car.rider.visible=true;
  return car;
}
function ensureRacerVisual(id,tint,index=0){
  if(raceVisuals.has(id))return raceVisuals.get(id);
  const visual=raceVehicleVisual(tint,index);raceVisuals.set(id,visual);return visual;
}
function clearRaceVisuals(){
  for(const visual of raceVisuals.values()){scene.remove(visual.mesh);visual.mesh.traverse(object=>{if(object.geometry)object.geometry.dispose?.()})}
  raceVisuals.clear();
}
// Puts the player on the right machine for the discipline; a matching ride they
// already had (or bought) is kept, so your own bike or car is what you race.
function mountRaceVehicle(grid){
  const cls=currentRaceClass(),entry=raceVehicleEntry(cls),type=entry.kind==='bike'?'bike':'car';
  if(vehicle&&vehicle.type!==type){finishRaceVehicle()}
  if(!vehicle){
    vehicle=world.vehicle(type,0,0,entry.length);applyCatalog(vehicle,entry,tintFor(entry,cityRandom));
    vehicle.occupied=true;models.vehicle(vehicle,vehicle.tint);player.visible=false;
  }
  if(vehicle.rider)vehicle.rider.visible=true;
  vehicle.mesh.visible=true;vehicle.mesh.position.set(grid.x,0,grid.z);vehicle.mesh.rotation.y=grid.yaw;vehicleSpeed=0;player.position.copy(vehicle.mesh.position);
}
function finishRaceVehicle(){
  if(!vehicle)return;
  const p=vehicle.mesh.position;player.position.set(p.x+3,0,p.z);player.visible=true;vehicle.occupied=false;if(vehicle.rider)vehicle.rider.visible=false;
  vehicle=null;vehicleSpeed=0;engineAudio.stop();resetInputs();
}
function prepareRaceRacers(){
  const room=race.room,track=raceTrack();
  room.players.forEach((player,index)=>{
    const grid=startGrid(track,index);
    player.x=grid.x;player.z=grid.z;player.r=grid.yaw;player.step=0;player.lap=0;player.finished=false;player.finishTime=null;player.lane=index%2?1:-1;
    if(player.id===raceLocalId())mountRaceVehicle(grid);
    else {const visual=ensureRacerVisual(player.id,[0xd1845f,0x8fa6c4,0xd9c48a,0x9fcab0][index%4],index);visual.mesh.position.set(grid.x,0,grid.z);visual.mesh.rotation.y=grid.yaw;visual.mesh.visible=true}
  });
}
function startSoloRace(){
  const local='host',room=createRoom({code:'SOLO',trackId:raceTrackId,hostName:raceDisplayName(),vehicleClass:raceClass});
  if(!room)return;
  for(let i=0;i<raceCpuCount;i++)addBot(room,streetBetRival&&raceCpuCount===1?streetBetRival:`CPU RIVAL ${i+1}`);
  streetBetRival=null;
  race={mode:'solo',isHost:true,localId:local,room,code:'SOLO',trackId:room.trackId,trackName:room.trackName,vehicleClass:room.vehicleClass,status:'lobby',statusText:'',net:null};
  startRoom(room,Date.now());
  beginRaceCountdown(room.startAt);
}
async function hostRace(){
  const {makeRoomCode,staticRoomCode}=await import('./race.js');
  const code=makeRoomCode(),room=createRoom({code,trackId:raceTrackId,hostName:raceDisplayName(),now:Date.now(),vehicleClass:raceClass});
  if(!room)return;
  race={mode:'online',isHost:true,localId:'host',room,code,trackId:room.trackId,trackName:room.trackName,vehicleClass:room.vehicleClass,status:'lobby',statusText:'OPENING ROOM…',net:null,broadcastAt:0};
  renderRaceRoom();
  try{
    const net=await openRaceNet(hostHandlers());
    if(!net)return;
    race.net=net;
    if(!net.host(code,raceClass)){race.statusText='COULD NOT HOST · TRY ANOTHER CODE';renderRaceRoom();return}
    race.statusText='WAITING FOR RACERS · SHARE THE CODE';
  }catch{race.statusText='RACING SERVICE UNAVAILABLE · CHECK YOUR CONNECTION';}
  renderRaceRoom();
}
async function joinRaceRoom(rawCode){
  const code=staticRoomCode(rawCode);
  if(code.length<5){raceStatusText('ENTER THE FULL 5-SYMBOL CODE');return}
  race={mode:'online',isHost:false,localId:null,room:{code,trackId:raceTrackId,trackName:trackById(raceTrackId)?.name||'',vehicleClass:raceClass,status:'lobby',startAt:null,players:[]},code,trackId:raceTrackId,vehicleClass:raceClass,status:'lobby',statusText:`CONNECTING TO ${code}…`,net:null,lastSendAt:0};
  renderRaceRoom();
  const net=await openRaceNet(guestHandlers());
  if(!net)return;
  race.net=net;net.join(code,raceClass);
  race.timeout=setTimeout(()=>{if(race&&race.status==='lobby'&&!race.connected)raceStatusText('NO ANSWER FROM THAT CODE · CHECK IT AND TRY AGAIN')},15000);
}
async function openRaceNet(handlers){
  try{
    const module=raceNetModule||await import('./race-net.js');
    raceNetModule=module;
    const Peer=racePeerOverride||await module.loadPeerClass();
    return module.createRaceNet(handlers,Peer);
  }catch(error){console.warn('Could not load online racing',error);raceStatusText('ONLINE RACING COULD NOT LOAD · USE QUICK RACE');return null}
}
function applySnapshot(snap){
  if(!race||!snap)return;
  if(snap.trackId&&snap.trackId!==race.trackId){race.trackId=snap.trackId;race.trackName=trackById(snap.trackId)?.name||race.trackName;race.room.trackId=snap.trackId;race.room.trackName=race.trackName;raceTrackId=snap.trackId}
  // The host owns the discipline: a guest who joined a bike code races a bike.
  if(snap.cls&&normalizeRaceClass(snap.cls)!==normalizeRaceClass(race.vehicleClass)){
    race.vehicleClass=normalizeRaceClass(snap.cls);raceClass=race.vehicleClass;race.room.vehicleClass=race.vehicleClass;
    clearRaceVisuals();
    if(vehicle&&vehicle.type!==(raceClass==='bike'?'bike':'car'))finishRaceVehicle();
  }
  race.room.status=snap.status;race.room.startAt=snap.startAt;
  const previous=new Map(race.room.players.map(p=>[p.id,p]));
  race.room.players=snap.players.map(p=>({...p,kind:p.kind==='host'?'host':p.kind==='bot'?'bot':'guest',finished:!!p.fin,finishTime:p.ft??null}));
  for(const player of race.room.players){const old=previous.get(player.id);if(old){player.lane=old.lane??(race.room.players.indexOf(player)%2?1:-1)}}
  for(const player of snap.players){
    if(player.id===raceLocalId())continue;
    const visual=ensureRacerVisual(player.id,[0xd1845f,0x8fa6c4,0xd9c48a,0x9fcab0][snap.players.indexOf(player)%4],snap.players.indexOf(player));visual.mesh.visible=true;
    visual.target={x:player.x,z:player.z,r:player.r};
  }
  if(snap.status==='countdown'&&race.status!=='countdown'&&race.status!=='running'&&race.status!=='finished')beginRaceCountdown(snap.startAt);
  if(snap.status==='running'&&race.status==='countdown'){race.status='running';race.statusText=''}
  if(snap.status==='finished'&&race.status!=='finished')finishRace();
  if(raceOpen)renderRaceRoom();
  if(race.status==='running'&&race.status!=='finished')updateRaceHud();
}
function hostHandlers(){
  const room=()=>race?.room;
  return {
    open:()=>{if(race)race.statusText='WAITING FOR RACERS · SHARE THE CODE';renderRaceRoom()},
    status:text=>raceStatusText(String(text).toUpperCase()),
    peerOpen:()=>{},
    peerJoined:peer=>{race?.net?.sendTo(peer,{t:'welcome',trackId:race?.trackId,code:race?.code})},
    peerLeft:peer=>{if(!race)return;if(room()){leaveRoom(room(),peer);broadcastSnapshot();renderRaceRoom()}},
    error:()=>{},
    message:(data,from)=>{
      if(!race)return;
      const message=decodeMessage(data);if(!message)return;
      if(message.t==='hello'){
        const result=joinRoom(room(),{id:from,name:message.name||'RACER',now:Date.now()});
        if(!result.ok){race.net.sendTo(from,{t:'reject',reason:result.reason});return}
        race.net.sendTo(from,{t:'joined',you:from,trackId:race.trackId,code:race.code});
        broadcastSnapshot();renderRaceRoom();showToast(`${result.player.name} JOINED THE RACE`);
      } else if(message.t==='p')updateRacerPosition(room(),from,message);
      else if(message.t==='fin')markFinished(room(),from,message.ft);
      else if(message.t==='bye'){if(room())leaveRoom(room(),from);broadcastSnapshot();renderRaceRoom()}
    },
  };
}
function guestHandlers(){
  return {
    open:()=>{if(!race)return;race.localId=race.net?.id||null;if(race.timeout)clearTimeout(race.timeout)},
    peerOpen:host=>{if(!race)return;race.hostPeer=host;race.net?.sendTo(host,{t:'hello',name:raceName()})},
    status:text=>raceStatusText(String(text).toUpperCase()),
    peerLeft:()=>{if(race&&race.status!=='finished')raceStatusText('HOST LEFT THE RACE')},
    error:()=>{},
    message:data=>{
      if(!race)return;const message=decodeMessage(data);if(!message)return;
      if(message.t==='welcome'){race.connected=true;race.trackId=message.trackId||race.trackId;race.trackName=trackById(race.trackId)?.name||race.trackName}
      else if(message.t==='joined'){
        if(message.you)race.localId=message.you;
        race.connected=true;race.statusText='IN THE ROOM · WAITING FOR THE HOST TO START';renderRaceRoom();
      } else if(message.t==='reject'){raceStatusText(String(message.reason||'COULD NOT JOIN').toUpperCase());}
      else if(message.t==='snap'){race.connected=true;applySnapshot(message)}
    },
  };
}
function broadcastSnapshot(){
  if(!race?.isHost||!race.net)return;
  const snap=snapshot(race.room,Date.now());
  if(race.mode==='online')race.net.broadcast(snap);
}
function beginRaceCountdown(startAt){
  if(!race)return;
  if(race.isHost&&race.room.status==='lobby'){startRoom(race.room,Date.now());startAt=race.room.startAt}
  race.status='countdown';race.startAt=Number(startAt)||Date.now()+COUNTDOWN_MS;raceOpen=false;$('race-overlay').hidden=true;
  $('race-hud').hidden=false;$('race-hud-track').textContent=race.trackName||raceTrack().name;
  $('race-hud-list').replaceChildren();$('race-hud-next').textContent='GET READY';
  prepareRaceRacers();race.progress=null;race.own=null;race.finishElapsed=null;
  if(race.isHost){race.room.status='countdown';broadcastSnapshot()}
  showToast(race.isHost?'RACE STARTING · GOOD LUCK':`RACE STARTING · ${raceTrack().name}`);
  sound('success');
}
function raceElapsed(){return race?Math.max(0,Date.now()-race.startAt):0}
function startLocalRacePlay(){
  const local=racePlayer();if(!local)return;
  race.status='running';race.room.status='running';race.progress=createRaceStateLocal();
  race.own={step:0,lap:0,finished:false,finishTime:null};
  setObjective('RACE · '+race.trackName,'Follow the checkpoints. First to finish wins.',1,raceCheckpointLabel());
  $('mission-number').textContent='RACE';
  updateRaceTarget();
}
function createRaceStateLocal(){
  const checkpoints=raceTrack().checkpoints.map(point=>({...point}));
  return {checkpoints,step:0,lap:0,laps:1,finished:false};
}
function updateRaceTarget(){
  const point=race?.progress?.checkpoints[race.progress.step];if(!point)return;
  target={x:point.x,z:point.z};marker.position.set(target.x,0,target.z);routeTarget=null;
  $('race-hud-next').textContent=raceCheckpointLabel();
  $('mission-count').textContent=raceCheckpointLabel();
}
// The first point of a track is the start line, so only the rest count as checkpoints.
function raceCheckpointLabel(){
  if(!race?.progress)return 'GET READY';
  if(race.own?.finished)return 'WAITING FOR RIVALS…';
  const total=race.progress.checkpoints.length-1,step=race.progress.step;
  return step===0?'START LINE':`CP ${Math.min(step,total)} / ${total}`;
}
function advanceLocalRace(){
  if(!race||race.status!=='running'||race.own?.finished)return;
  const pos=vehicle?vehicle.mesh.position:player.position,point=race.progress?.checkpoints[race.progress.step];
  if(!point)return;
  if(Math.hypot(pos.x-point.x,pos.z-point.z)>9)return;
  const last=race.progress.step>=race.progress.checkpoints.length-1;
  if(last){
    race.own.finished=true;race.own.finishTime=Math.round(raceElapsed());
    markFinished(race.room,raceLocalId(),race.own.finishTime);
    {const own=racePlayer();if(own){own.finished=true;own.finishTime=race.own.finishTime;own.step=race.own.step}}
    if(race.isHost)broadcastSnapshot();else {const host=race.hostPeer||[...(race.net?.peers()||[])] [0];if(host)race.net?.sendTo(host,{t:'fin',ft:race.own.finishTime})}
    sound('success');showToast(`FINISHED · ${formatRaceTime(race.own.finishTime)} · WAITING FOR RIVALS`);race.graceUntil=Date.now()+12000;
    if(race.room.players.every(p=>p.finished))finishRace();
    return;
  }
  race.progress.step++;race.own.step=race.progress.step;
  updateRaceTarget();sound('checkpoint');showToast(`CHECKPOINT ${race.progress.step} / ${race.progress.checkpoints.length-1}`);
  if(race.isHost)broadcastSnapshot();
}
function localSendPosition(){
  if(!race||race.status!=='running'||!race.net)return;
  const now=Date.now();if(now-(race.netAt||0)<120)return;race.netAt=now;
  const pos=vehicle?vehicle.mesh.position:player.position;
  const message={t:'p',x:Math.round(pos.x*10)/10,z:Math.round(pos.z*10)/10,r:Math.round((vehicle?vehicle.mesh.rotation.y:player.rotation.y)*100)/100,step:race.own?.step||0,lap:0};
  if(race.isHost)broadcastSnapshot();
  else {const host=race.hostPeer||[...race.net.peers()][0];if(host)race.net.sendTo(host,message)}
}
function updateRaceHud(){
  if(!race)return;
  $('race-hud').hidden=false;
  $('race-hud-track').textContent=race.trackName||raceTrack().name;
  $('race-hud-timer').textContent=formatRaceTime(race.own?.finished?race.own.finishTime:raceElapsed());
  const board=standings(race.room),list=$('race-hud-list');list.replaceChildren();
  for(const entry of board.slice(0,5)){const item=document.createElement('li');item.className=entry.id===raceLocalId()?'you':'';item.textContent=`${entry.place}. ${entry.name}${entry.finished?' ✓':''}`;list.append(item)}
  const point=race.progress?.checkpoints[race.progress.step];
  if(point)$('race-hud-next').textContent=raceCheckpointLabel();
}
function updateRaceWorld(dt){
  if(!race)return;
  if(race.status==='countdown'){
    const remaining=race.startAt-Date.now();
    $('race-hud-timer').textContent=remaining>0?Math.ceil(remaining/1000)+'s':'GO!';
    if(remaining<=0)startLocalRacePlay();
    return;
  }
  if(race.status!=='running'&&race.status!=='finished')return;
  // Computer racers share the player's checkpoint line.
  if(race.isHost||race.mode==='solo'){
    const track=raceTrack(),checkpoints=track.checkpoints;
    for(const player of race.room.players){
      if(player.kind!=='bot'||player.finished)continue;
      const previous=player.step;
      advanceBot(player,checkpoints,dt,{speed:12.5,blocks:world.blocks,movePosition});
      if(botCheckpointReached(player,checkpoints,player.step)){
        if(player.step>=checkpoints.length-1){markFinished(race.room,player.id,Math.round(raceElapsed()))}
        else player.step++;
      }
      if(player.step!==previous&&race.isHost)broadcastSnapshot();
    }
  }
  // Remote vehicles ease toward the last received position.
  for(const [id,visual] of raceVisuals){const data=race.room.players.find(p=>p.id===id);if(!data||!visual.mesh.visible)continue;
    const goal=visual.target||{x:data.x,z:data.z,r:data.r},alpha=1-Math.exp(-dt*9);
    visual.mesh.position.x+=(goal.x-visual.mesh.position.x)*alpha;visual.mesh.position.z+=(goal.z-visual.mesh.position.z)*alpha;
    let delta=Math.atan2(Math.sin(goal.r-visual.mesh.rotation.y),Math.cos(goal.r-visual.mesh.rotation.y));visual.mesh.rotation.y+=delta*alpha;
    for(const wheel of visual.wheels)wheel.rotation.x-=dt*4;
  }
  if(race.status==='running'){
    advanceLocalRace();localSendPosition();
    const now=Date.now();if(now-(race.hudAt||0)>160){race.hudAt=now;updateRaceHud()}
    updateRoomClock(race.room,now);
    if(race.own?.finished&&race.graceUntil&&now>=race.graceUntil)finishRace();
  }
  if(race.room.status==='finished')finishRace();
}
function finishRace(){
  if(!race||race.status==='finished')return;
  updateRoomClock(race.room,Date.now());
  race.status='finished';race.room.status='finished';
  if(race.isHost)broadcastSnapshot();
  const board=standings(race.room),myPlace=board.find(entry=>entry.id===raceLocalId())?.place||board.length;
  if(!race.rewarded){race.rewarded=true;const prize=prizeFor(currentRaceClass(),myPlace);reward(progress,prize);refreshCash();race.prize=prize}
  if(raceUI&&raceOpen===false){
    raceOpen=true;$('race-overlay').hidden=false;
    raceUI.renderResults({trackName:race.trackName,entries:board.length?board:[{place:myPlace,name:'YOU',finished:true,time:race.own?.finishTime||0}],formatTime:formatRaceTime},()=>{leaveRace();openGameMenu()});
  }
  $('race-hud').hidden=true;
  setObjective('RACE COMPLETE',`You finished ${myPlace===1?'first':`${myPlace}${myPlace===2?'nd':myPlace===3?'rd':'th'}`} in the ${race.trackName}.`,1);
  showToast(`RACE FINISHED · ${myPlace===1?'YOU WIN':`PLACE ${myPlace}`} · +$${race.prize||0}`);
  // Keep the channel open briefly so late finishers still receive the result.
  const net=race.net;if(net){setTimeout(()=>{try{net.close()}catch{}},5000);race.net=null}
}
function leaveRace(){
  if(race?.net){try{race.net.close()}catch{}}
  if(race?.timeout)clearTimeout(race.timeout);
  clearRaceVisuals();finishRaceVehicle();
  $('race-hud').hidden=true;raceOpen=false;$('race-overlay').hidden=true;
  race=null;
  target=entrance(LANDMARKS.find(p=>p.id==='hub'));routeTarget=null;marker.position.set(target.x,0,target.z);
  setObjective('FREE ROAM','Visit the game menu for races, jobs and missions.',1);
  openGameMenu();
}

window.addEventListener('pagehide',()=>{if(started&&!ended&&!insideHome)saveResume()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!ended){saveResume();saveProgress(storage,progress);saveGarage()}});
const clock=new THREE.Clock();let mapTick=0;
function animate(){requestAnimationFrame(animate);const elapsed=clock.getDelta(),dt=Math.min(elapsed,.05);
 // The jail clock runs on real time and before every pause gate, so opening a
 // menu, pausing or backgrounding the tab can never trap the player in the cell.
 if(jailedUntil>0){const left=(jailRealUntil-performance.now())/1000;if(left>0){$('jail-count').textContent=`RELEASE IN ${Math.ceil(left)}s`;joy.x=0;joy.y=0}else if(!$('jail-overlay').hidden)releaseFromJail(false)}const radioTrack=race?.status==='running'||missionActive?'race':musicTrack,isSong=!!SONGS[radioTrack];if(music)music.update(isSong?'off':radioTrack,musicVolume,muted||document.hidden);if(songRadio)songRadio.update(isSong?radioTrack:null,musicVolume,muted||document.hidden);updateRaceWorld(dt);updateBubbles();if(mapOpen||settingsOpen||placeOpen||editingLayout||districtOpen||arcadeOpen||casinoOpen||gameMenuOpen||raceOpen)return;
 if(started&&!ended){gameTime+=Math.min(elapsed,.25);
  if(jailedUntil<=gameTime&&!insideHome&&gameTime-lastResumeSave>10){lastResumeSave=gameTime;saveResume()}
  {const chip=$('nitro-chip');if(nitroUntil>gameTime){chip.hidden=false;$('nitro-left').textContent=Math.ceil(nitroUntil-gameTime)}else if(!chip.hidden)chip.hidden=true}
  let inputX=(jailedUntil>gameTime?0:joy.x)+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),inputZ=(jailedUntil>gameTime?0:joy.y)+(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const len=Math.hypot(inputX,inputZ);if(len>1){inputX/=len;inputZ/=len}
  if(vehicle){
   engineAudio.update(vehicleSpeed,(gasHeld?1:0)-(brakeHeld?1:0),vehicle.type,nitroOn);
   const pedal=(gasHeld?1:0)-(brakeHeld?1:0);const acceleration=(gasHeld||brakeHeld)?pedal:-inputZ;
   // Every machine drives differently: a supercar outruns a saloon, a superbike
   // outruns both, and a pickup turns in slower than a hot hatch.
   const handling=handlingFor(vehicle,{carUpgrade:progress.owned.includes('car')});
   if(vehicle.type==='bike'&&bikeServicedUntil>gameTime){handling.top+=1.6;handling.steer+=.18}
   const nitroOn=nitroUntil>gameTime&&!race?.net;
   vehicleSpeed=advanceVehicleSpeed(vehicleSpeed,acceleration*(nitroOn?1.7:1),dt,handling.top*(race?.status==='running'?1.08:1)*(nitroOn?1.5:1));
   if(Math.abs(vehicleSpeed)>.25)vehicle.mesh.rotation.y-=inputX*dt*handling.steer*(.6+steerSensitivity*.08)*Math.min(Math.abs(vehicleSpeed)/5,1)*(vehicleSpeed>=0?1:-1);
   const dx=-Math.sin(vehicle.mesh.rotation.y)*vehicleSpeed*dt,dz=-Math.cos(vehicle.mesh.rotation.y)*vehicleSpeed*dt;
   if(movePosition(vehicle.mesh.position,dx,dz,drivingObstacles(),.75)<Math.hypot(dx,dz)*.4)vehicleSpeed*=.35;
   for(const wheel of vehicle.wheels)wheel.rotation.x-=vehicleSpeed*dt*.8;if(vehicle.type==='bike'){const lean=-inputX*Math.min(Math.abs(vehicleSpeed)/12,1)*.22;if(vehicle.visual)vehicle.visual.rotation.z=THREE.MathUtils.lerp(vehicle.visual.rotation.z,lean,Math.min(1,dt*6));if(vehicle.rider)vehicle.rider.rotation.z=THREE.MathUtils.lerp(vehicle.rider.rotation.z,lean,Math.min(1,dt*6))}player.position.copy(vehicle.mesh.position);if(Math.abs(vehicleSpeed)>1&&gameTime-lastEngineSound>.28){sound('engine');lastEngineSound=gameTime}
   if(lookPointer===null&&Math.abs(vehicleSpeed)>1){let delta=Math.atan2(Math.sin(vehicle.mesh.rotation.y-cameraYaw),Math.cos(vehicle.mesh.rotation.y-cameraYaw));cameraYaw+=delta*Math.min(1,dt*2)}
  }else{
   const move=relativeMovement(inputX,inputZ,cameraYaw),sprinting=!!(sprintHeld||keys.ShiftLeft||keys.ShiftRight),speed=sprinting?(trainedUntil>gameTime?7.9:6.6):2;
   let actualSpeed=0;
   if(len>.08){const travelled=insideHome?moveInsideHome(move.x*speed*dt,move.z*speed*dt):movePosition(player.position,move.x*speed*dt,move.z*speed*dt,walkingObstacles(),.2);actualSpeed=dt>0?travelled/dt:0;if(!fireHeld&&!aiming)player.rotation.y=turnTowards(player.rotation.y,Math.atan2(-move.x,-move.z),dt);walkCycle+=dt*(speed/2)}
   if(actualSpeed>2.4&&gameTime-lastBark>7){for(const c of civilians){if(c.dead||!c.mesh.visible)continue;if(Math.hypot(c.x-player.position.x,c.z-player.position.z)<1.15){lastBark=gameTime;playerBark(['HEY BUDDY, GET OUT OF MY WAY!','WATCH IT, MAN!','EASY O, I DEY PASS!'][Math.floor(Math.random()*3)]);c.line='SORRY O!';c.lineUntil=gameTime+2;break}}}
 if(sniperActive){player.position.x=THREE.MathUtils.clamp(player.position.x,36,48);player.position.z=THREE.MathUtils.clamp(player.position.z,-48,-36);player.position.y=16}
 animateWalk(player,Math.min(actualSpeed/speed,1),walkCycle,dt,fireHeld,aiming,sprinting,actualSpeed);if(actualSpeed>.5&&gameTime-lastStepSound>(sprinting?.25:.42)){sound('step');lastStepSound=gameTime}
  }
  {
   let nearestTraffic=null,bestTraffic=24;
   for(const tr of traffic){const d=(vehicle?vehicle.mesh.position:player.position).distanceTo(tr.car.mesh.position);if(d<bestTraffic){bestTraffic=d;nearestTraffic={speed:tr.speed||10,kind:tr.car.type}}}
   if(!nearestTraffic)for(const cop of police){const d=cop.car.mesh.position.distanceTo(player.position);if(d<bestTraffic){bestTraffic=d;nearestTraffic={speed:12,kind:'car'}}}
   if(nearestTraffic)engineAudio.traffic(nearestTraffic.speed,bestTraffic,nearestTraffic.kind);else engineAudio.trafficStop();
  }
  updateSideMissionRun(dt);
  updateRockets(dt);
  updateHostileCivilians(dt);
  if(fireHeld&&!vehicle&&weapons[weaponIndex].auto)shoot();
  if(!ended)for(const [id,life] of Object.entries(interiorLife)){for(const event of stepInteriorLife(life,interiorSpots[id]||[],dt,{time:gameTime,random:cityRandom})){if(event.type==='talk')lifeStats.talks++;else if(event.type==='exit')lifeStats.exits++;else if(event.type==='enter')lifeStats.enters++;doorEvent(id,event)}}
  if(insideHome)for(const person of interiorCrowd(interiorPlace.id)){
    const agent=person.agent;if(!agent)continue;
    person.x=agent.x;person.z=agent.z;person.ry=agent.ry;
    person.mesh.position.set(agent.x,0,agent.z);person.mesh.rotation.y=agent.ry;
    person.mesh.visible=agent.mode!=='out';
    if(person.mesh.visible&&!person.requested){person.requested=true;models.person(person.mesh,person.role)}
    person.walk+=dt;person.animElapsed+=dt;
    if(person.animElapsed>=.12){animateWalk(person.mesh,agent.mode==='walk'?.55:0,person.walk,person.animElapsed);person.animElapsed=0}
    if(agent.mode==='talk')applyTalkGesture(person.mesh,gameTime+person.talkPhase,.8);
  }if(player.userData.model?.userData.gun)player.userData.model.userData.gun.visible=!insideHome;if(aiming&&!vehicle)player.rotation.y=cameraYaw;if(fireHeld&&!insideHome)shoot();if(reloadEnd&&gameTime>=reloadEnd){ammo[weaponIndex]=weapons[weaponIndex].cap;reloadEnd=0}if(!insideHome)updateEnemies(dt);if(!ended&&!insideHome&&missionActive){if(activity)updateSideActivity(Math.min(elapsed,.25));else updateMission();}if(!ended&&!insideHome)updateNavigation();if(!ended&&!insideHome)updateRival(dt);if(!ended){const cityPos=vehicle?vehicle.mesh.position:player.position;updateCity(dt,cityPos);updateAnimals(dt,cityPos);updatePickups(dt,cityPos);if(!insideHome)updatePolice(dt,cityPos);}if(!ended&&!insideHome&&missionActive&&!activity&&mission===2&&gameTime-lastReinforcement>16&&enemies.filter(e=>e.alive&&e.kind==='pursuer').length<5){const p=vehicle?vehicle.mesh.position:player.position;const z=Math.round(p.z/28)*28;const x=Math.max(-84,Math.min(84,Math.round(p.x/28)*28+(p.x<target.x?-28:28)));spawnEnemy(x,z,'pursuer');lastReinforcement=gameTime;showToast('ENEMY REINFORCEMENTS INBOUND')}
  for(let i=shots.length-1;i>=0;i--)if(shots[i].until<gameTime){scene.remove(shots[i].line);shots[i].line.geometry.dispose();shots[i].line.material.dispose();shots.splice(i,1)}
  $('hud').classList.toggle('driving',!!vehicle);$('hud').classList.toggle('at-home',insideHome);$('health').textContent=Math.ceil(health);$('health-fill').style.width=Math.max(0,Math.min(100,health))+'%';$('health-fill').style.background=health<30?'#ff6b59':'#c9fc51';$('weapon').textContent=vehicle?`${vehicle.brand||'VEHICLE'} ${vehicle.model||''}`.trim():weapons[weaponIndex].name;$('weapon-sub').textContent=vehicle?`${Math.round(Math.abs(vehicleSpeed)*5)} KM/H · TAP RADIO`:reloadEnd?'RELOADING...':aimAssist?'AIM ASSIST ON':'MANUAL AIM';$('ammo').innerHTML=vehicle?'—':`${ammo[weaponIndex]} <small>/ ∞</small>`;const reloading=!!reloadEnd&&!vehicle;$('reload-track').classList.toggle('visible',reloading);const reloadProgress=reloading?Math.round(Math.max(0,Math.min(1,1-(reloadEnd-gameTime)))*100):0;$('reload-fill').style.width=reloadProgress+'%';$('reload-track').setAttribute('aria-valuenow',String(reloadProgress));$('reload-btn').classList.toggle('selected',reloading);
  const place=insideHome?interiorPlace:nearestPlace(),trafficNear=!insideHome&&!vehicle&&!place?nearestTrafficCar():null;let nearV=null,parkedDistance=5;for(const v of vehicles){const d=player.position.distanceTo(v.mesh.position);if(d<parkedDistance){parkedDistance=d;nearV=v}}const hijack=trafficNear&&player.position.distanceTo(trafficNear.car.mesh.position)<parkedDistance;const near=insideHome||vehicle||place||parkedDistance<5||trafficNear;$('interact-btn').style.display=near?'':'none';const interactVerb=vehicle?(vehicle.type==='bike'?'EXIT BIKE':'EXIT CAR'):insideHome?'OPTIONS':place?placeVerb(place):hijack?'TAKE CAR':nearV?.type==='bike'?'RIDE BIKE':'GET IN CAR';const interactIcon=vehicle?'🚶':(insideHome||place)?(PLACE_ICON[(insideHome?interiorPlace:place)?.id]||'📍'):hijack?'🚕':nearV?.type==='bike'?'🏍️':'🚗';$('interact-btn').querySelector('.ico').textContent=interactIcon;$('interact-btn').querySelector('.lbl').textContent=interactVerb;$('interact-btn').setAttribute('aria-label',vehicle?`Exit the ${vehicle.type}`:insideHome?`${interiorPlace.name} options`:place?`${interactVerb} — ${place.name}`:hijack?'Pull the driver out and take the car':nearV?`Get in the ${nearV.type}`:'Enter the nearby vehicle');$('interaction').style.display=place&&!vehicle?'block':'none';$('interaction').textContent=insideHome?`${interiorPlace.name} · TAP OPTIONS OR EXIT`:place?`${place.name} · TAP ${interactVerb}`:'';$('navigation').style.display=insideHome?'none':'';$('talk-btn').style.display=nearestPerson()&&!place?'':'none';
  const locked=!insideHome&&!vehicle&&nearestAnyTarget();$('crosshair').classList.toggle('locked',!!locked);$('target-name').textContent=locked?'TARGET LOCKED':'';
  if((mapTick+=dt)>.1){updateMap();mapTick=0}
  // People nearby turn to look at you, and whoever you are talking to keeps
  // facing you while the conversation overlay is open.
  if(!insideHome&&!vehicle){
   for(const c of civilians){
    if(!c.mesh.visible||c.mode==='talk')continue;
    const d=Math.hypot(c.x-player.position.x,c.z-player.position.z);
    if(d<3.2&&(c.mode==='stand'||c.mode==='sit'))c.ry=Math.atan2(-(player.position.x-c.x),-(player.position.z-c.z));
   }
  }
  if(streetTalkPartner&&placeOpen)applyTalkGesture(streetTalkPartner.mesh,gameTime,1);
 }
 const pos=vehicle?vehicle.mesh.position:player.position,dist=insideHome?5.2:vehicle?11:(aiming?5.3:6.7),height=(insideHome?3.4:vehicle?5.4:(aiming?2.9:3.35));
 const shoulder=vehicle?0:1.2,forwardX=-Math.sin(cameraYaw),forwardZ=-Math.cos(cameraYaw),rightX=Math.cos(cameraYaw),rightZ=-Math.sin(cameraYaw);
 cameraFocus.set(pos.x,vehicle?1.5:1.65,pos.z);cameraDesired.set(pos.x+Math.sin(cameraYaw)*dist+rightX*shoulder,height,pos.z+Math.cos(cameraYaw)*dist+rightZ*shoulder);if(insideHome){cameraDesired.x=THREE.MathUtils.clamp(cameraDesired.x,-6.4,6.4);cameraDesired.z=THREE.MathUtils.clamp(cameraDesired.z,HOME_CENTER.z-5.9,HOME_CENTER.z+5.9)}
 const cameraRay=cameraDesired.clone().sub(cameraFocus),rayLength=cameraRay.length();raycaster.set(cameraFocus,cameraRay.normalize());raycaster.far=rayLength;const intersections=insideHome?[]:raycaster.intersectObjects(world.buildingMeshes.filter((mesh,i)=>{const b=world.blocks[i];return Math.abs(b.x-pos.x)<b.halfX+rayLength&&Math.abs(b.z-pos.z)<b.halfZ+rayLength}),false);if(intersections.length)cameraDesired.copy(cameraFocus).addScaledVector(cameraRay,Math.max(.7,intersections[0].distance-.5));
 lookPitch*=Math.exp(-5*dt);camera.position.lerp(cameraDesired,1-Math.exp(-dt*(aiming||fireHeld?18:12)));if(shakeUntil>gameTime){const s=(shakeUntil-gameTime)*1.5;camera.position.x+=(Math.random()-.5)*s;camera.position.y+=(Math.random()-.5)*s*.6}const lookTarget=cameraFocus.clone().add(new THREE.Vector3(forwardX*(vehicle?0:7)+rightX*shoulder,.4-lookPitch*12,forwardZ*(vehicle?0:7)+rightZ*shoulder));if(scoped){currentSway=(breathUntil>gameTime?.12:1)*(.05*Math.sin(gameTime*1.35)+.035*Math.sin(gameTime*2.9));lookTarget.x+=rightX*currentSway*3;lookTarget.z+=rightZ*currentSway*3}else currentSway=0;camera.lookAt(lookTarget);const fov=scoped?[43,26,14][scopeZoom]:(aiming&&!vehicle?43:55);if(Math.abs(camera.fov-fov)>.05){camera.fov=THREE.MathUtils.lerp(camera.fov,fov,Math.min(1,dt*8));camera.updateProjectionMatrix()}sun.position.set(pos.x-35,75,pos.z+30);sun.target.position.set(pos.x,0,pos.z);diamond.rotation.y+=dt;diamond.position.y=4+Math.sin(performance.now()*.003)*.3;ring.rotation.z+=dt*.25;renderer.render(scene,camera);
}
renderMapLegend();
// Test-only controls let automated browser checks exercise the real mission state machine.
if(import.meta.env.DEV) window.__aivmTest={
  warp(x,z){const p=vehicle?vehicle.mesh.position:player.position;p.set(x,0,z);if(vehicle)player.position.copy(p);vehicleSpeed=0},
  state(){const pos=vehicle?vehicle.mesh.position:player.position;return {mission,phase,kills,health,insideHome,missionActive,selectedDistrict:selectedDistrict.id,activity:activity?{id:activity.id,step:activity.step,remaining:activity.remaining}:null,gameMenuOpen,casinoOpen,interior:insideHome?interiorPlace.id:null,money:progress.money,owned:[...progress.owned],placeOpen,settingsOpen,vehicle:vehicle?.type||null,weapon:weapons[weaponIndex].name,ammo:ammo[weaponIndex],ammoAll:[...ammo],reloading:!!reloadEnd,gasHeld,brakeHeld,weaponMenuOpen,mapOpen,dropKills,rival:rival?{x:rival.car.mesh.position.x,z:rival.car.mesh.position.z}:null,ended,x:pos.x,z:pos.z,cameraYaw,lookPitch,aiming,fireHeld,assist:aimAssist}},
  people(){return civilians.map(c=>({id:c.id,x:c.mesh.position.x,z:c.mesh.position.z,ry:c.ry,mode:c.mode,district:c.district,line:c.line,visible:c.mesh.visible,model:!!c.mesh.userData.model}))},
  interiorState(){const id=interiorPlace.id;return {id,time:+gameTime.toFixed(1),agents:(interiorLife[id]||[]).map(a=>({mode:a.mode,x:+a.x.toFixed(2),z:+a.z.toFixed(2),ry:+a.ry.toFixed(2),wait:+a.wait.toFixed(2),think:+a.think.toFixed(1),partner:a.partner}))}},
  doorTraffic(){return civilians.filter(c=>c.doorful).length},
  lifeStats(){return {...lifeStats}},
  sniperState(){return {sniperActive,scoped,scopeZoom,sway:+currentSway.toFixed(3)}},
  vocalState(){return music?.vocalState?.()??null},
  songState(){return songRadio?.state?.()??null},
  radioNames(){return Object.keys(RADIO_STATIONS)},
  startSniper(){startSniperContract()},
  killTarget(){const tget=sniperSpawns.find(e=>e.alive);if(tget)damageEnemy(tget,999)},
  jailState(){return {jailed:jailedUntil>0,left:+Math.max(0,(jailRealUntil-performance.now())/1000).toFixed(1)}},
  resumeNow(){saveResume();return loadResume()},
  interactLabel(){return $('interact-btn').querySelector('.lbl').textContent},
  interactIcon(){return $('interact-btn').querySelector('.ico').textContent},
  parkedVehicles(){return vehicles.map(v=>({type:v.type,x:+v.mesh.position.x.toFixed(1),z:+v.mesh.position.z.toFixed(1)}))},
  pickupsState(){const pos=vehicle?vehicle.mesh.position:player.position;const near=nearestPickup(pos);return {total:pickups.length,visible:pickups.filter(p=>!p.cooldown).length,nitro:nitroUntil>gameTime,nitroLeft:+Math.max(0,nitroUntil-gameTime).toFixed(1),nearest:near?{type:near.pickup.type,x:+near.pickup.group.position.x.toFixed(1),z:+near.pickup.group.position.z.toFixed(1),d:+near.d.toFixed(1)}:null}},
  retagNearestPickup(type){const pos=vehicle?vehicle.mesh.position:player.position;const near=nearestPickup(pos);if(!near||!PICKUP_TYPES[type])return null;near.pickup.type=type;applyPickupLook(near.pickup);return {type:near.pickup.type,x:+near.pickup.group.position.x.toFixed(1),z:+near.pickup.group.position.z.toFixed(1)}},
  forceBust(){bustPlayer()},
  hostileCount(){return civilians.filter(c=>c.hostileUntil>gameTime&&!c.dead).length},
  arcadeAward(){return arcadeAwardLog.slice()},
  grantReward(cash,label){reward(progress,cash);saveProgress(storage,progress);refreshCash();arcadeAwardLog.push({cash,label});return progress.money},
  trafficStatus(){return traffic.map(t=>({type:t.car.type,x:t.car.mesh.position.x,z:t.car.mesh.position.z}))},
  health(value){health=value},
  yaw(value){cameraYaw=value;player.rotation.y=value;camera.position.set(player.position.x+Math.sin(value)*6.7,3.35,player.position.z+Math.cos(value)*6.7)},
  markerVisible(value){marker.visible=value},
  fail(){health=0;finish(false)},
  defeatGuards(){enemies.filter(e=>e.alive&&(e.kind==='guard'||e.kind==='drop-guard')).forEach(e=>damageEnemy(e,100))},
  playerStatus(){const a=player.userData.animation;return {loaded:!!a,role:a?.role,action:a?.current?.getClip().name||null,gun:!!player.userData.model?.userData.gun,visible:player.visible,rate:a?.current?.getEffectiveTimeScale()||0,time:a?.current?.time||0,rotation:player.rotation.y,leftLeg:a?.model?.getObjectByName('mixamorigLeftUpLeg')?.quaternion.toArray(),rightLeg:a?.model?.getObjectByName('mixamorigRightUpLeg')?.quaternion.toArray(),leftKnee:a?.model?.getObjectByName('mixamorigLeftLeg')?.quaternion.toArray(),rightKnee:a?.model?.getObjectByName('mixamorigRightLeg')?.quaternion.toArray()}},
  animalStatus(){return animals.map(a=>({type:a.type,x:a.mesh.position.x,z:a.mesh.position.z,loaded:!!a.mesh.userData.animalAnimation}))},
  renderInfo(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}},
  setRacePeer(Peer){racePeerOverride=Peer||null},
  raceLog(){return race?.log||[]},
  raceState(){return {open:raceOpen,status:race?.status||null,mode:race?.mode||null,code:race?.code||null,track:race?.trackId||raceTrackId,players:(race?.room?.players||[]).map(p=>({id:p.id,name:p.name,kind:p.kind,step:p.step,finished:p.finished,time:p.finishTime})),own:race?.own||null,next:race?.progress?.checkpoints[race.progress.step]||null,prize:race?.prize||0}},
  startSoloRace(id=null,cls=null){if(cls)raceClass=normalizeRaceClass(cls);raceTrackId=id||(race&&race.trackId)||defaultTrackFor(raceClass);if(classOfTrack(raceTrackId)!==raceClass)raceClass=classOfTrack(raceTrackId);startSoloRace()},
  raceClass(){return {selected:raceClass,live:race?currentRaceClass():null,track:raceTrackId,tracks:tracksForClass(raceClass)}},
  setRaceClass(cls){setRaceClass(cls)},
  crowdState(){const counts=crowdCount(civilians);return {...counts,talking:civilians.filter(c=>c.mode==='talk').length,vendors:civilians.filter(c=>c.mode==='vendor').length,sitting:civilians.filter(c=>c.mode==='sit').length,models:crowdModelsLoaded,near:civilians.filter(c=>c.mesh.visible).length}},
  talkNearest(){const person=nearestPerson();if(!person)return null;openStreetConversation(person);return {name:streetName(person),x:person.x,z:person.z,district:person.district,options:[...$('place-actions').children].map(b=>b.textContent)}},
  conversationOptions(){return [...$('place-actions').children].map(b=>b.textContent)},
  pickOption(index){const buttons=[...$('place-actions').children];buttons[index]?.click();return buttons[index]?.textContent||null},
  enterPlaceById(id){const place=landmarkById(id);if(!place)return false;enterPlace(place);openPlace(place);return true},
  placeState(){return {inside:insideHome?interiorPlace.id:null,people:interiorCrowd(insideHome?interiorPlace.id:'').length,actions:[...$('place-actions').children].map(b=>b.textContent)}},
  openDealership(){openDealership();return [...$('place-actions').children].map(b=>b.textContent)},
  buyVehicle(id){const entry=vehicleById(id);if(!entry)return false;progress.money=Math.max(progress.money,entry.price);refreshCash();if(!ownedVehicles.includes(id))ownedVehicles.push(id);saveGarage();spawnOwnedVehicle(id,purchaseSpot(landmarkById('garage')));return true},
  garage(){return {owned:[...ownedVehicles],parked:vehicles.map(v=>({id:v.catalog,brand:v.brand,type:v.type,x:v.mesh.position.x,z:v.mesh.position.z}))}},
  wantedState(){return {heat,stars:$('heat').textContent,police:police.length,lastSeen:lastSeenByPolice,trained:trainedUntil>gameTime,serviced:bikeServicedUntil>gameTime}},
  setHeat(value){heat=Math.max(0,Math.min(3,Number(value)||0));updateHeat();lastSeenByPolice=gameTime},
  radio(){return {track:musicTrack,station:RADIO_STATIONS[musicTrack]||null}},
  cycleRadio(){cycleRadio();return musicTrack},
  bubbles(){return [...document.querySelectorAll('.speech-bubble')].filter(b=>!b.hidden).map(b=>b.textContent)},
  landmarks(){return LANDMARKS.map(place=>({id:place.id,name:place.name,kind:place.kind,district:place.district,x:place.x,z:place.z}))},
  skipCountdown(){if(race){race.startAt=Date.now();race.status='countdown'}},
  raceCheckpoint(){const point=race?.progress?.checkpoints[race.progress.step];return point?{x:point.x,z:point.z}:null},
  debugNearbyBlocks(x,z){return world.blocks.filter(b=>Math.abs(b.x-x)<b.halfX+10&&Math.abs(b.z-z)<b.halfZ+10).map(b=>({x:b.x,z:b.z,hx:+b.halfX.toFixed(1),hz:+b.halfZ.toFixed(1)}))},
  sideMissionTarget(){const t=sideMissionTarget(sideMission);return t?{...t}:null},
  clearMissionEnemies(){enemies.filter(e=>e.alive&&e.kind==='mission').forEach(e=>damageEnemy(e,100))},
  sideMissionState(){return {active:!!sideMission,id:sideMission?.id||null,step:sideMission?.step||0,kills:sideMissionKills,objective:sideMission?sideMissionObjective(sideMission):null,chase:missionChase?{x:missionChase.x,z:missionChase.z}:null}},
  startSideMission(id){startSideMission(id)},
  openMissions(){openMissions()},
  targets(){return enemies.filter(e=>e.alive).map(e=>{const p=e.mesh.position.clone().add(new THREE.Vector3(0,1.35,0)).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,hp:e.hp,kind:e.kind}})}
};
$('cash-display').textContent=`$${progress.money}`;marker.position.set(target.x,0,target.z);camera.position.set(0,5.2,21);currentRoute=roadRoute(player.position,target);applyLayout(controlLayout);updateMap();animate();
