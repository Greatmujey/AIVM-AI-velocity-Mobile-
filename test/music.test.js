import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS, MUSIC_TRACK_IDS, composeBar, mulberry } from '../src/music.js';

test('the five stations keep their names and ids for the radio and settings', () => {
  assert.deepEqual(TRACK_IDS, ['coast', 'night', 'harbor', 'race', 'missions']);
  assert.equal(MUSIC_TRACK_IDS[0], 'off');
  assert.equal(TRACKS.coast.name, 'COAST DRIVE');
  assert.equal(TRACKS.race.name, 'RACE FUEL');
});

test('every bar composes playable events inside one bar and audible range', () => {
  for (const id of TRACK_IDS) for (let bar = 0; bar < 16; bar++) {
    const events = composeBar(id, bar, 5);
    assert.ok(events.length > 4, `${id} bar ${bar} is empty`);
    for (const event of events) {
      assert.ok(event.step >= 0 && event.step < 16, `${id} bar ${bar} step ${event.step}`);
      assert.ok(event.gain > 0 && event.gain <= 1.2, `${id} ${event.voice} gain`);
      if (event.freq) assert.ok(event.freq > 40 && event.freq < 1200, `${id} ${event.voice} freq ${event.freq}`);
      if (event.len) assert.ok(event.len > 0 && event.len < 4, `${id} ${event.voice} len`);
    }
  }
});

test('the band arranges itself: quiet intro, full chorus with a lead', () => {
  for (const id of TRACK_IDS) {
    const intro = composeBar(id, 0, 4), chorus = composeBar(id, 8, 4);
    const voices = list => new Set(list.map(e => e.voice));
    assert.ok(voices(chorus).has('lead'), `${id} chorus needs a lead`);
    assert.ok(voices(chorus).has('kick') && voices(chorus).has('snare'), `${id} chorus needs drums`);
    assert.ok(!voices(intro).has('snare'), `${id} intro should not crack the snare`);
    assert.ok(voices(intro).has('bass') && voices(intro).has('pad'), `${id} intro keeps bass and keys`);
    assert.ok(chorus.length > intro.length, `${id} chorus should be busier than the intro`);
  }
});

test('a fill lands at the end of every fourth bar', () => {
  for (const id of TRACK_IDS) {
    const fill = composeBar(id, 3, 6).filter(e => e.step >= 12 && (e.voice === 'snare' || e.voice === 'tom'));
    assert.ok(fill.length >= 2, `${id} bar 3 fill`);
  }
});

test('performances are repeatable per seed but differ between seeds', () => {
  assert.deepEqual(composeBar('harbor', 5, 11), composeBar('harbor', 5, 11));
  assert.notDeepEqual(composeBar('harbor', 5, 11), composeBar('harbor', 5, 12));
  const rng = mulberry(9);
  const first = [rng(), rng(), rng()];
  const again = mulberry(9);
  assert.deepEqual(first, [again(), again(), again()]);
});
