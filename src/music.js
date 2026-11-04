// Five small original synth loops, generated locally; no external music files.
// Each score has a chord bed, a bass line, an arpeggio and optional drums.
export const TRACKS = {
  coast: {
    name:'COAST DRIVE', bpm:104, lead:'triangle', drums:true,
    chords:[[220,277.2,329.6],[196,246.9,293.7],[174.6,220,261.6],[196,246.9,293.7]],
    bass:[110,98,87.3,98],
    arp:[0,1,2,1,0,2,1,2, 0,1,2,1,2,1,0,1],
  },
  night: {
    name:'NIGHT CRUISE', bpm:86, lead:'sine', drums:false,
    chords:[[164.8,196,246.9],[146.8,174.6,220],[130.8,164.8,196],[146.8,174.6,220]],
    bass:[82.4,73.4,65.4,73.4],
    arp:[0,0,1,2,2,1,0,1, 2,1,0,0,1,2,1,0],
  },
  harbor: {
    name:'HARBOR LIGHTS', bpm:96, lead:'square', drums:true,
    chords:[[174.6,207.7,261.6],[155.6,196,233.1],[130.8,164.8,196],[155.6,196,233.1]],
    bass:[87.3,77.8,65.4,77.8],
    arp:[0,1,2,1, 0,1,2,1, 2,1,0,1, 2,1,0,1],
  },
  race: {
    name:'RACE FUEL', bpm:138, lead:'sawtooth', drums:true,
    chords:[[293.7,349.2,440],[261.6,329.6,392],[220,277.2,329.6],[246.9,311.1,392]],
    bass:[146.8,130.8,110,123.5],
    arp:[0,2,1,2, 0,2,1,2, 0,2,1,2, 0,2,1,2],
  },
  missions: {
    name:'MISSION WIRE', bpm:120, lead:'sawtooth', drums:true,
    chords:[[196,246.9,311.1],[174.6,220,277.2],[146.8,185,233.1],[164.8,207.7,261.6]],
    bass:[98,87.3,73.4,82.4],
    arp:[0,1,2,2, 1,0,2,1, 0,1,2,2, 2,0,1,0],
  },
};
export const TRACK_IDS = Object.keys(TRACKS);
export const MUSIC_TRACK_IDS = ['off', ...TRACK_IDS];

let noiseBuffer = null;
function noise(audio) {
  if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer;
  const length = Math.max(1, Math.floor(audio.sampleRate * .16));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  noiseBuffer = buffer;
  return buffer;
}

export function createMusic(audio) {
  let next = 0, step = 0, lastTrack = null;
  function tone(score, frequency, start, duration, type, peak) {
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), start + .03);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration * .92);
    osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + duration);
  }
  function drum(score, index, start, stepLength, volume) {
    if (!score.drums) return;
    if (index % 8 === 0) { // kick: quick pitch drop
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(120, start);
      osc.frequency.exponentialRampToValueAtTime(45, start + .12);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.5 * volume, start + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .15);
      osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .16);
    }
    if (index % 8 === 4) { // snare: short noise burst
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = noise(audio);
      gain.gain.setValueAtTime(.28 * volume, start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .12);
      source.connect(gain); gain.connect(audio.destination); source.start(start); source.stop(start + .14);
    }
    if (index % 2 === 0) tone(score, 0, start, stepLength * .5, 'sine', 0); // reserved, silent
    if (index % 2 === 1) { // hi-hat
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = noise(audio);
      gain.gain.setValueAtTime(.07 * volume, start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .05);
      source.connect(gain); gain.connect(audio.destination); source.start(start); source.stop(start + .06);
    }
  }
  return {
    update(track, volume, muted) {
      const score = TRACKS[track];
      if (!score || muted || volume <= 0 || audio.state !== 'running') { next = 0; lastTrack = track; return }
      if (track !== lastTrack) { step = 0; next = 0; lastTrack = track }
      const now = audio.currentTime;
      if (next < now) next = now + .05;
      // Schedule slightly ahead so phone browsers do not drop the beat.
      while (next < now + .2) {
        const octave = 60 / score.bpm, stepLength = octave / 4, bar = Math.floor(step / 16) % score.chords.length, slot = step % 16;
        const chord = score.chords[bar];
        if (slot === 0 || slot === 8) { // chord pad
          for (const frequency of chord) tone(score, frequency, next, stepLength * 7, 'sine', .022 * volume);
        }
        if (slot % 4 === 0) tone(score, score.bass[bar], next, stepLength * 3, 'triangle', .05 * volume);
        tone(score, chord[score.arp[slot] % chord.length] * 2, next, stepLength * .85, score.lead, .03 * volume);
        drum(score, slot, next, stepLength, volume);
        next += stepLength; step++;
      }
    },
  };
}
