// Real recorded songs for the in-game radio — actual music, not synthesis.
// All six tracks are instrumental Afro-fusion / African-groove songs by John
// Bartmann, released under CC0 1.0 (public domain) and sourced via chosic.com
// and the SoundSafari CC0-1.0-Music corpus on GitHub. See CREDITS.md.
export const SONGS = {
  'song-umlungu':  { file: 'afro-umlungu.mp3',  title: 'UMLUNGU',               artist: 'John Bartmann' },
  'song-kwela':    { file: 'afro-kwela.mp3',    title: 'A KWELA FELLA',         artist: 'John Bartmann' },
  'song-iyanetha': { file: 'afro-iyanetha.mp3', title: 'IYANETHA',              artist: 'John Bartmann' },
  'song-village':  { file: 'afro-village.mp3',  title: 'HAPPY AFRICAN VILLAGE', artist: 'John Bartmann' },
  'song-moon':     { file: 'afro-moon.mp3',     title: 'AFRICAN MOON',          artist: 'John Bartmann' },
  'song-west':     { file: 'afro-west.mp3',     title: 'WEST IN AFRICA',        artist: 'John Bartmann' },
  'song-seeme':    { file: 'hip-when-you-see-me.mp3', title: 'WHEN YOU SEE ME NOW', artist: 'HoliznaRAPS' },
  'song-greatest': { file: 'hip-greatest-self.mp3',   title: 'GREATEST SELF',       artist: 'FlowForRhythm' },
  'song-killpain': { file: 'hip-kill-the-pain.mp3',   title: 'KILL THE PAIN',       artist: 'FlowForRhythm' },
  'song-winning':  { file: 'hip-winning-track.mp3',   title: 'THE WINNING TRACK',   artist: 'FlowForRhythm' },
  'song-niceday':  { file: 'hip-nice-day.mp3',        title: 'NICE DAY',            artist: 'FlowForRhythm' },
};
export const SONG_IDS = Object.keys(SONGS);

// The song radio plays alongside the live-band engine: when a song station is
// tuned in the synth band steps aside, and volume/mute follow the same
// settings. Tracks are fetched once, decoded and looped from memory.
export function createSongRadio(ctx) {
  const base = import.meta.env?.BASE_URL ?? '/';
  const buffers = new Map();
  let gain = null, src = null, srcGain = null, current = null, failed = new Set();

  function ensureGain() {
    if (!gain) { gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination) }
    return gain;
  }
  async function load(id) {
    if (buffers.has(id)) return buffers.get(id);
    const response = await fetch(`${base}assets/music/${SONGS[id].file}`);
    if (!response.ok) throw new Error(`song ${id} missing (${response.status})`);
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    buffers.set(id, buffer);
    return buffer;
  }
  function stopSrc(fade = 0) {
    if (!src) return;
    const now = ctx.currentTime;
    try {
      if (fade > 0 && srcGain) {
        srcGain.gain.cancelScheduledValues(now); srcGain.gain.setValueAtTime(srcGain.gain.value, now);
        srcGain.gain.linearRampToValueAtTime(0, now + fade); src.stop(now + fade + .05);
      } else src.stop();
    } catch { /* already stopped */ }
    try { src.disconnect() } catch { /* noop */ }
    if (srcGain) try { srcGain.disconnect() } catch { /* noop */ }
    src = null; srcGain = null;
  }

  return {
    // Called every frame. `id` is a SONGS key, or null/anything else to stop.
    update(id, volume, muted) {
      if (!id || !SONGS[id]) { if (current) { stopSrc(.25); current = null } return }
      const g = ensureGain();
      g.gain.value = muted ? 0 : Math.min(1, Math.max(0, volume) * 1.6);
      if (current === id) {
        if (!muted && ctx.state === 'suspended') { try { ctx.resume() } catch { /* autoplay guard */ } }
        return;
      }
      current = id; stopSrc(.3);
      load(id).then(buffer => {
        if (current !== id) return;
        const now = ctx.currentTime, fadeGain = ctx.createGain();
        fadeGain.gain.setValueAtTime(0, now); fadeGain.gain.linearRampToValueAtTime(1, now + .7); fadeGain.connect(g);
        const s = ctx.createBufferSource();
        s.buffer = buffer; s.loop = true; s.connect(fadeGain); s.start(); src = s; srcGain = fadeGain;
      }).catch(error => {
        failed.add(id);
        if (current === id) current = null;
        console.warn('Could not play song', id, error?.message || error);
      });
    },
    state() { return { current, playing: !!src, cached: buffers.size, failed: [...failed] } },
  };
}
