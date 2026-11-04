import * as THREE from 'three';

// Comic-style speech bubbles for the crowd. They are plain DOM elements placed
// over the canvas by projecting the speaker's head, so text stays crisp on any
// phone and costs nothing when nobody nearby is talking.
export function createBubbles(container, {pool = 4, height = 2.75, maxCharacters = 52} = {}) {
  const layer = document.createElement('div');
  layer.className = 'bubble-layer';
  layer.setAttribute('aria-hidden', 'true');
  const bubbles = [];
  for (let i = 0; i < pool; i++) {
    const el = document.createElement('div');
    el.className = 'speech-bubble';
    el.hidden = true;
    const text = document.createElement('span');
    el.appendChild(text);
    layer.appendChild(el);
    bubbles.push({el, text, current:''});
  }
  container?.appendChild(layer);
  const projected = new THREE.Vector3();

  function trim(value) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    return clean.length > maxCharacters ? `${clean.slice(0, maxCharacters - 1)}…` : clean;
  }

  function update(entries, camera, {width = 0, height:viewportHeight = 0, visible = true} = {}) {
    const list = Array.isArray(entries) ? entries.slice(0, pool) : [];
    bubbles.forEach((bubble, index) => {
      const entry = visible ? list[index] : null;
      if (!entry || !entry.text) { bubble.el.hidden = true; bubble.current = ''; return; }
      const clean = trim(entry.text);
      if (!clean) { bubble.el.hidden = true; bubble.current = ''; return; }
      projected.set(entry.x, (entry.y ?? 0) + height, entry.z).project(camera);
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05) {
        bubble.el.hidden = true; bubble.current = ''; return;
      }
      const left = (projected.x * .5 + .5) * 100, top = (-projected.y * .5 + .5) * 100;
      if (clean !== bubble.current) { bubble.text.textContent = clean; bubble.current = clean; }
      bubble.el.style.left = `${left.toFixed(2)}%`;
      bubble.el.style.top = `${top.toFixed(2)}%`;
      bubble.el.hidden = false;
    });
    return bubbles.filter(bubble => !bubble.el.hidden).length;
  }

  function clear() { for (const bubble of bubbles) { bubble.el.hidden = true; bubble.current = ''; } }
  function destroy() { clear(); layer.remove(); }
  return {update, clear, destroy, layer, get size() { return pool; }};
}
