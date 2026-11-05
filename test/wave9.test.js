import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, SONG_IDS, createSongRadio } from '../src/song-radio.js';
import { loadPreferences, DEFAULTS } from '../src/preferences.js';

test('wave9: six real songs ship on the radio', () => {
  assert.equal(SONG_IDS.length, 6);
  const files = SONG_IDS.map(id => SONGS[id].file);
  assert.equal(new Set(files).size, 6, 'each song has its own file');
  for (const id of SONG_IDS) {
    assert.match(id, /^song-/);
    assert.match(SONGS[id].file, /^afro-.*\.mp3$/);
    assert.equal(SONGS[id].artist, 'John Bartmann');
    assert.ok(SONGS[id].title.length > 2);
  }
});

test('wave9: song station ids survive preferences round-trip', () => {
  const map = new Map();
  const storage = { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
  for (const id of SONG_IDS) {
    map.set('aivm-settings-v1', JSON.stringify({ ...DEFAULTS, musicTrack: id }));
    assert.equal(loadPreferences(storage).musicTrack, id, `${id} should persist`);
  }
  map.set('aivm-settings-v1', JSON.stringify({ ...DEFAULTS, musicTrack: 'pirate-radio' }));
  assert.equal(loadPreferences(storage).musicTrack, DEFAULTS.musicTrack, 'unknown stations reset to default');
});

test('wave9: song radio stops cleanly for unknown stations', () => {
  // a silent fake audio context — verifies update()/state() bookkeeping
  const ctx = {
    state: 'running',
    destination: {},
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() {}, stop() {}, onended: null, disconnect() {} }),
    decodeAudioData: async () => ({}),
    resume: async () => {},
  };
  const radio = createSongRadio(ctx);
  radio.update(null, 0.5, false);
  assert.deepEqual(radio.state(), { current: null, playing: false, cached: 0, failed: [] });
  radio.update('coast', 0.5, false); // band station, not a song → stays silent
  assert.equal(radio.state().current, null);
  radio.update('song-kwela', 0.5, true); // muted → gain zero, no crash
  assert.equal(radio.state().current, 'song-kwela'); // decoding kicks off async
  assert.equal(radio.state().playing, false); // nothing audible until decode lands
  radio.update('coast', 0.5, false); // tuning back to the band stops the song
  assert.equal(radio.state().current, null);
});
