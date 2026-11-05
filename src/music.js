// Five original stations, performed live by a small synthesised band: drums with
// fills and swing, a bass player who leans behind the beat, keys/guitar stabs and
// an improvising lead. Everything is generated in the browser from these scores;
// no external music files and no copyrighted compositions.
export const TRACKS = {
  coast: {
    name: 'COAST DRIVE', bpm: 104, genre: 'one-drop',
    swing: .06, lead: 'triangle', cut: 1800,
    chords: [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 293.7]],
    bass: [110, 98, 87.3, 98],
  },
  night: {
    name: 'NIGHT CRUISE', bpm: 86, genre: 'slow-burn',
    swing: .14, lead: 'sine', cut: 1200,
    chords: [[164.8, 196, 246.9], [146.8, 174.6, 220], [130.8, 164.8, 196], [146.8, 174.6, 220]],
    bass: [82.4, 73.4, 65.4, 73.4],
  },
  harbor: {
    name: 'HARBOR LIGHTS', bpm: 96, genre: 'highlife',
    swing: .04, lead: 'square', cut: 2200,
    chords: [[174.6, 207.7, 261.6], [155.6, 196, 233.1], [130.8, 164.8, 196], [155.6, 196, 233.1]],
    bass: [87.3, 77.8, 65.4, 77.8],
  },
  race: {
    name: 'RACE FUEL', bpm: 138, genre: 'drive',
    swing: 0, lead: 'sawtooth', cut: 2600,
    chords: [[293.7, 349.2, 440], [261.6, 329.6, 392], [220, 277.2, 329.6], [246.9, 311.1, 392]],
    bass: [146.8, 130.8, 110, 123.5],
  },
  missions: {
    name: 'MISSION WIRE', bpm: 120, genre: 'funk',
    swing: .09, lead: 'sawtooth', cut: 2000,
    chords: [[196, 246.9, 311.1], [174.6, 220, 277.2], [146.8, 185, 233.1], [164.8, 207.7, 261.6]],
    bass: [98, 87.3, 73.4, 82.4],
  },
};
export const TRACK_IDS = Object.keys(TRACKS);
export const MUSIC_TRACK_IDS = ['off', ...TRACK_IDS];

// --- deterministic per-performance randomness -------------------------------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
}

// Rhythm templates per genre, in 16th steps of one bar.
const KIT = {
  'one-drop': { kick: [8], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [4, 12], perc: [3, 11], stab: [2, 6, 10, 14] },
  'slow-burn': { kick: [0, 7, 10], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [14], perc: [], stab: [0, 8] },
  highlife: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [6], perc: [0, 3, 6, 8, 11, 14], stab: [2, 5, 8, 11, 14] },
  drive: { kick: [0, 8, 14], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [8], perc: [], stab: [0, 4, 8, 12] },
  funk: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [2, 10], perc: [1, 3, 5, 7, 9, 11, 13, 15], stab: [0, 3, 8, 11] },
};
// Lead phrase rhythms (step, length in steps) reused call-and-response style.
const PHRASES = [
  [[0, 2], [3, 1], [4, 2], [8, 3], [12, 2]],
  [[0, 1], [2, 1], [4, 3], [8, 1], [10, 2], [12, 4]],
  [[2, 2], [6, 2], [8, 1], [10, 1], [12, 3]],
  [[0, 3], [4, 1], [6, 2], [10, 2], [14, 2]],
];
const sectionOf = bar => Math.floor(bar / 4) % 4; // 0 intro, 1 verse, 2 chorus, 3 bridge

// Degrees of the current chord plus colour notes the lead may bend through.
function leadNote(chord, root, degree, random) {
  const scale = [1, 9 / 8, 6 / 5, 3 / 2, 5 / 3, 2];
  const pick = scale[degree % scale.length];
  const base = chord[degree % chord.length];
  return base * pick / (random() < .3 ? 2 : 1) * (root > 200 ? .5 : 1);
}

// One bar of the performance as a plain event list, so it can be unit tested
// without an AudioContext and cached by the scheduler.
export function composeBar(track, bar, seed = 7) {
  const score = TRACKS[track]; if (!score) return [];
  const kit = KIT[score.genre], random = mulberry(seed * 7919 + bar * 104729 + track.length * 31);
  const section = sectionOf(bar), chord = score.chords[bar % score.chords.length], root = score.bass[bar % score.bass.length];
  const stepSec = 60 / score.bpm / 4;
  const events = [], push = (voice, stepAt, data) => events.push({ voice, step: stepAt, ...data });
  const human = (spread = .014) => (random() * 2 - 1) * spread;

  const drumsOn = section !== 0, full = section === 2, bridge = section === 3;
  // Slow intros keep a brushed count-in so the bar is never silent.
  if (section === 0 && score.genre === 'slow-burn') for (const step of [0, 4, 8, 12]) push('hat', step, { gain: .35 + random() * .15 });
  if (drumsOn || section === 0 && score.genre !== 'slow-burn') {
    for (const step of kit.kick) if (drumsOn || step === 0) push('kick', step, { gain: step === 0 ? 1 : .82 + random() * .18 });
    for (const step of kit.snare) if (drumsOn) push('snare', step, { gain: full ? 1 : .8, rim: bridge });
    const hats = bridge ? kit.hat.filter(s => s % 4 === 2) : kit.hat;
    for (const step of hats) if (drumsOn || section === 0) push('hat', step, { gain: step % 4 === 2 ? .9 : .5 + random() * .3 });
    for (const step of kit.open) if (full) push('open', step, { gain: .8 });
    for (const step of kit.perc) if (drumsOn) push('perc', step, { gain: .5 + random() * .4, high: step % 2 === 1 });
  }
  // A fill announces the next section: rolling snare or tumbling toms.
  if (bar % 4 === 3) for (let i = 0; i < (full ? 4 : 2); i++) {
    const step = 12 + i;
    if (score.genre === 'drive' || score.genre === 'funk') push('tom', step, { gain: .8 - i * .12, pitch: 3 - i });
    else push('snare', step, { gain: .5 + i * .16, rim: false });
  }
  // Bass: roots in the intro, patterns with ghost notes and octaves afterwards.
  const bassSteps = section === 0 ? [0, 8] : score.genre === 'drive' ? [0, 2, 4, 6, 8, 10, 12, 14] : score.genre === 'funk' ? [0, 3, 6, 8, 11, 14] : [0, 4, 8, 12];
  for (const step of bassSteps) {
    const octave = full && random() < .3 ? 2 : 1;
    push('bass', step, { offset: human(.01), freq: root * octave, len: (score.genre === 'drive' ? 1.6 : 3) * stepSec, gain: step === 0 ? 1 : .7 + random() * .3, slide: random() < .12 });
  }
  if (bridge && bar % 2 === 1) push('bass', 14, { offset: human(), freq: root * 1.5, len: 2 * stepSec, gain: .8, slide: true });
  // Keys pad every bar, stabs on the genre's off-beats from the verse up.
  if (section !== 3 || bar % 2 === 0) push('pad', 0, { chord, len: 15 * stepSec, gain: section === 0 ? 1 : .7 });
  if (section !== 0) for (const step of kit.stab) if (random() < (full ? .95 : .6)) push('stab', step, { offset: human(.008), chord, note: Math.floor(random() * chord.length), gain: .5 + random() * .4 });
  // The lead improvises in choruses and answers itself in bridges.
  if (full || bridge) {
    const phrase = PHRASES[(bar + (bridge ? 2 : 0)) % PHRASES.length];
    for (const [step, len] of phrase) {
      if (random() < .15) continue; // players breathe
      push('lead', step, { offset: human(), freq: leadNote(chord, root, Math.floor(random() * 6), random), len: len * 1.1 * stepSec, gain: .7 + random() * .35, vibrato: len >= 2 });
    }
  } else if (section === 1 && bar % 2 === 1) {
    const phrase = PHRASES[bar % PHRASES.length].slice(0, 3);
    for (const [step, len] of phrase) push('lead', step, { offset: human(), freq: leadNote(chord, root, Math.floor(random() * 4), random), len: len * stepSec, gain: .5 + random() * .2, vibrato: false });
  }
  return events.sort((a, b) => a.step - b.step);
}

let noiseBuffer = null;
function noise(audio) {
  if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer;
  const length = Math.max(1, Math.floor(audio.sampleRate * .3));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  noiseBuffer = buffer; return buffer;
}

export function createMusic(audio) {
  // One glue bus so the band sits together instead of stacking raw oscillators.
  const bus = audio.createDynamicsCompressor ? audio.createDynamicsCompressor() : audio.createGain();
  if (bus.threshold) { bus.threshold.value = -18; bus.ratio.value = 5; bus.attack.value = .004; bus.release.value = .18 }
  bus.connect(audio.destination);
  const send = audio.createGain(); send.gain.value = .3; send.connect(bus);
  const delay = audio.createDelay(1); delay.delayTime.value = .28;
  const feedback = audio.createGain(); feedback.gain.value = .3;
  delay.connect(feedback); feedback.connect(delay); delay.connect(send);

  function env(start, duration, peak, attack = .012) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    gain.connect(bus); return gain;
  }
  function osc(type, freq, start, stop) {
    const o = audio.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, start);
    o.start(start); o.stop(stop); return o;
  }
  function burst(start, duration, peak, filterType, freq, q = 1) {
    const source = audio.createBufferSource(); source.buffer = noise(audio);
    const filter = audio.createBiquadFilter(); filter.type = filterType; filter.frequency.value = freq; filter.Q.value = q;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(bus);
    source.start(start); source.stop(start + duration + .02);
  }
  const voices = {
    kick(volume) { return (start, event) => { const o = osc('sine', 130, start, start + .2), g = env(start, .19, .62 * volume * event.gain, .005); o.frequency.exponentialRampToValueAtTime(44, start + .11); o.connect(g) } },
    snare(volume) { return (start, event) => { burst(start, event.rim ? .07 : .14, (event.rim ? .16 : .3) * volume * event.gain, 'bandpass', event.rim ? 2400 : 1800, 1.1); const o = osc('triangle', 190, start, start + .09), g = env(start, .08, .12 * volume * event.gain, .004); o.connect(g) } },
    hat(volume) { return (start, event) => burst(start, .045, .075 * volume * event.gain, 'highpass', 7200, 1.4) },
    open(volume) { return (start, event) => burst(start, .22, .07 * volume * event.gain, 'highpass', 6200, 1.2) },
    perc(volume) { return (start, event) => { const o = osc('sine', event.high ? 1150 : 720, start, start + .12), g = env(start, .11, .09 * volume * event.gain, .003); o.frequency.exponentialRampToValueAtTime(event.high ? 820 : 520, start + .09); o.connect(g) } },
    tom(volume) { return (start, event) => { const o = osc('sine', 220 - event.pitch * 34, start, start + .18), g = env(start, .17, .3 * volume * event.gain, .004); o.frequency.exponentialRampToValueAtTime(110 - event.pitch * 16, start + .15); o.connect(g) } },
    bass(volume) { return (start, event) => {
      const o = osc('sawtooth', event.freq, start, start + event.len + .12);
      if (event.slide) o.frequency.exponentialRampToValueAtTime(event.freq * 1.02, start + .09);
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(700, start); filter.frequency.exponentialRampToValueAtTime(240, start + .22); filter.Q.value = 6;
      const g = env(start, event.len + .08, .16 * volume * event.gain, .014);
      o.connect(filter); filter.connect(g);
    } },
    pad(volume) { return (start, event) => {
      for (const [i, freq] of event.chord.entries()) for (const detune of [-5, 5]) {
        const o = osc('sawtooth', freq * (i === 0 ? .5 : 1), start, start + event.len + .5);
        o.detune.value = detune;
        const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
        const g = audio.createGain();
        g.gain.setValueAtTime(.0001, start);
        g.gain.linearRampToValueAtTime(.014 * volume * event.gain / event.chord.length, start + .35);
        g.gain.linearRampToValueAtTime(.0001, start + event.len + .4);
        o.connect(filter); filter.connect(g); g.connect(bus);
      }
    } },
    stab(volume) { return (start, event) => {
      const freq = event.chord[event.note % event.chord.length] * 2;
      for (const detune of [-7, 7]) {
        const o = osc('square', freq, start, start + .16); o.detune.value = detune;
        const filter = audio.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = freq * 1.4; filter.Q.value = 1.4;
        const g = env(start, .14, .05 * volume * event.gain, .005);
        o.connect(filter); filter.connect(g);
      }
    } },
    lead(volume) { return (start, event) => {
      const o = osc(leadType, event.freq, start, start + event.len + .2);
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = leadCut;
      const g = env(start, event.len + .15, .075 * volume * event.gain, .02);
      if (event.vibrato) { const lfo = osc('sine', 5.4, start, start + event.len + .2), lfoGain = audio.createGain(); lfoGain.gain.value = event.freq * .012; lfo.connect(lfoGain); lfoGain.connect(o.frequency) }
      o.connect(filter); filter.connect(g); g.connect(delay);
    } },
  };

  let next = 0, step = 0, lastTrack = null, barCache = new Map(), performanceSeed = 1 + Math.floor(Math.random() * 9999);
  let leadType = 'triangle', leadCut = 1800;
  function barEvents(track, bar) {
    const key = `${track}:${bar}`;
    if (!barCache.has(key)) {
      barCache.set(key, composeBar(track, bar, performanceSeed));
      if (barCache.size > 64) barCache.delete(barCache.keys().next().value);
    }
    return barCache.get(key);
  }
  const vocalBuffers = {};
  let vocalPlaying = false, vocalNow = null;
  function setVocal(track, buffer) { vocalBuffers[track] = buffer; vocalPlaying = false }
  return { setVocal, vocalState() { return { tracks: Object.keys(vocalBuffers), playing: vocalPlaying, current: vocalNow } },
    update(track, volume, muted) {
      const score = TRACKS[track];
      if (!score || muted || volume <= 0 || audio.state !== 'running') { next = 0; lastTrack = track; return }
      if (track !== lastTrack) { step = 0; next = 0; lastTrack = track; leadType = score.lead; leadCut = score.cut; performanceSeed = 1 + Math.floor(Math.random() * 9999); barCache.clear() }
      const now = audio.currentTime;
      if (next < now) next = now + .06;
      while (next < now + .25) {
        const stepLength = 60 / score.bpm / 4, bar = Math.floor(step / 16), slot = step % 16;
        const swung = next + (slot % 2 === 1 ? stepLength * score.swing : 0);
        for (const event of barEvents(track, bar)) {
          if (event.step !== slot) continue;
          const play = voices[event.voice];
          if (play) play(volume)(Math.max(now + .005, swung + (event.offset || 0)), event);
        }
        next += stepLength; step++;
    const vocalBuffer = vocalBuffers[track];
    if (vocalBuffer && !vocalPlaying && volume > 0 && !muted && sectionOf(bar) === 2 && bar % 4 === 0) {
      vocalPlaying = true; vocalNow = track;
      const src = audio.createBufferSource(), g = audio.createGain();
      src.buffer = vocalBuffer; g.gain.value = Math.min(1, volume * 2.4);
      src.connect(g); g.connect(audio.destination); src.start(now + .05);
      src.onended = () => { vocalPlaying = false; vocalNow = null };
    }
      }
      // expose for tests/debug
      this.step = step;
    },
  };
}
