import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences, savePreferences, DEFAULTS } from '../src/preferences.js';

test('sound, assist and sensitivity persist between sessions', () => {
  let saved;
  const storage={setItem(key,value){saved=value},getItem(){return saved}};
  const prefs={...DEFAULTS,muted:true,aimAssist:false,lookSensitivity:8,sfxVolume:.5,musicVolume:.2,musicTrack:'night',graphicsQuality:'performance',voiceLines:true};
  savePreferences(storage,prefs);
  assert.deepEqual(loadPreferences(storage),prefs);
});
test('bad or unavailable storage falls back safely', () => {
  const storage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
  assert.doesNotThrow(()=>savePreferences(storage,{}));
  assert.deepEqual(loadPreferences(storage),{...DEFAULTS});
  assert.deepEqual(loadPreferences({getItem(){return '{bad'}}),{...DEFAULTS});
  assert.equal(loadPreferences({getItem(){return '{"lookSensitivity":999}'}}).lookSensitivity,5);
});
