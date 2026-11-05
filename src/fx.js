// Combat feedback and death animation. The maths lives in plain functions so it
// can be unit-tested; the THREE-facing helpers only touch objects they are given.

// --- Ragdoll toppling ---------------------------------------------------------
// A spring-damper that topples a body from upright (0) onto its side (PI/2).
// Under-damped on purpose: the body overshoots slightly and settles, like a
// limp falling figure rather than a rigid plank.
export const RAGDOLL_TARGET = Math.PI / 2;
export function createRagdoll(impulse = 4) {
  return { angle: 0, omega: impulse, age: 0, settled: false, fallYaw: 0 };
}
export function ragdollStep(r, dt, stiffness = 34, damping = 4.2) {
  if (!r || r.settled) { if (r) r.age += dt; return r }
  const step = Math.min(dt, 1 / 30);
  const alpha = -stiffness * (r.angle - RAGDOLL_TARGET) - damping * r.omega;
  r.omega += alpha * step;
  r.angle += r.omega * step;
  r.age += dt;
  // Ground contact: never sink through the floor, lose a little energy on impact.
  if (r.angle > RAGDOLL_TARGET + .05) { r.angle = RAGDOLL_TARGET + .05; r.omega = -Math.abs(r.omega) * .3 }
  if (Math.abs(r.angle - RAGDOLL_TARGET) < .01 && Math.abs(r.omega) < .05) { r.angle = RAGDOLL_TARGET; r.omega = 0; r.settled = true }
  return r;
}
// Fade-out after the body has been lying for a while; returns opacity 0..1.
export function ragdollFade(age, hold = 4, fade = 1.2) {
  return Math.max(0, Math.min(1, 1 - (age - hold) / fade));
}
// Direction a body should fall: away from the shot. Returns a yaw angle.
export function fallYawFrom(shotFrom, body) {
  const dx = body.x - shotFrom.x, dz = body.z - shotFrom.z;
  return Math.atan2(dx, dz);
}

// --- Blood / hit particles ----------------------------------------------------
// Ballistic droplets; each particle dies on touching the ground.
export function particleStep(p, dt, gravity = 9.5) {
  p.vy -= gravity * dt;
  p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  p.life -= dt;
  if (p.y <= 0) { p.y = 0; p.life = Math.min(p.life, 0) }
  return p.life > 0;
}
export function spawnDroplets(origin, normal, count, random = Math.random) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const spread = .9 + random() * 1.8, up = 1.2 + random() * 2.2;
    out.push({
      x: origin.x, y: origin.y, z: origin.z,
      vx: normal.x * spread + (random() - .5) * 2.4,
      vy: up,
      vz: normal.z * spread + (random() - .5) * 2.4,
      life: .45 + random() * .5,
      size: .05 + random() * .07,
    });
  }
  return out;
}

// Pool of small blood droplets drawn with one InstancedMesh.
export function createHitFx(THREE, scene, capacity = 160) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xa40f0f });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 6;
  scene.add(mesh);
  const live = [];
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const ragdolls = [];
  function burst(origin, normal, count = 12) {
    for (const d of spawnDroplets(origin, normal, count)) {
      if (live.length >= capacity) live.shift();
      live.push(d);
    }
  }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) if (!particleStep(live[i], dt)) live.splice(i, 1);
    const n = Math.min(live.length, capacity);
    for (let i = 0; i < n; i++) {
      const p = live[i];
      pos.set(p.x, p.y, p.z); scale.setScalar(p.size);
      matrix.compose(pos, new THREE.Quaternion(), scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }
  // Ragdolls: the group is kept in the scene until it fades out.
  function startRagdoll(group, fallYaw, impulse = 4) {
    const r = createRagdoll(impulse); r.fallYaw = fallYaw;
    ragdolls.push({ group, r });
    group.rotation.order = 'YXZ';
    group.rotation.y = fallYaw;
    return r;
  }
  function updateRagdolls(dt) {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const { group, r } = ragdolls[i];
      ragdollStep(r, dt);
      group.rotation.x = r.angle;
      group.position.y = -Math.min(.35, r.angle * .2);
      const alpha = ragdollFade(r.age);
      group.visible = alpha > 0;
      if (alpha <= 0) { scene.remove(group); ragdolls.splice(i, 1) }
    }
  }
  function clear() {
    live.length = 0; mesh.count = 0;
    for (const { group } of ragdolls) scene.remove(group);
    ragdolls.length = 0;
  }
  return { burst, update, startRagdoll, updateRagdolls, clear, get liveCount() { return live.length }, get ragdollCount() { return ragdolls.length }, hidden };
}

// --- Police siren (two channels) ---------------------------------------------
// Left and right channels wail out of phase, with a short yelp layered on top.
// Each channel is an oscillator through a stereo panner so it sounds like a
// vehicle roof bar passing the listener.
export function sirenFrequencies(t) {
  const wail = Math.sin(t * 2.1);
  return {
    left: 690 + 300 * (wail * .5 + .5),
    right: 690 + 300 * (-wail * .5 + .5),
  };
}
export function createSiren(audio, destination) {
  let nodes = null;
  function start() {
    if (nodes || !audio) return;
    const out = audio.createGain(); out.gain.value = 0;
    out.connect(destination);
    const channels = [-1, 1].map(pan => {
      const osc = audio.createOscillator(), panner = audio.createStereoPanner?.(), gain = audio.createGain();
      osc.type = 'triangle'; gain.gain.value = .5;
      osc.connect(gain);
      if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(out) } else gain.connect(out);
      osc.start();
      return { osc, gain };
    });
    nodes = { out, channels };
  }
  function update(t, on, volume = .05) {
    if (!audio) return;
    if (on) start();
    if (!nodes) return;
    const f = sirenFrequencies(t), now = audio.currentTime;
    nodes.channels[0].osc.frequency.setTargetAtTime(f.left, now, .03);
    nodes.channels[1].osc.frequency.setTargetAtTime(f.right, now, .03);
    nodes.out.gain.setTargetAtTime(on ? volume : 0, now, .08);
  }
  function stop() {
    if (!nodes || !audio) return;
    const { out, channels } = nodes, now = audio.currentTime;
    out.gain.setTargetAtTime(0, now, .05);
    for (const c of channels) { try { c.osc.stop(now + .4) } catch {} }
    nodes = null;
  }
  return { update, stop, get active() { return !!nodes } };
}
