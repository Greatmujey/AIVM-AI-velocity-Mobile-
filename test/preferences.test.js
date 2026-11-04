import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences, savePreferences } from '../src/preferences.js';

test('sound, assist and sensitivity persist between sessions', () => {
  let saved;
  const storage={setItem(key,value){saved=value},getItem(){return saved}};
  const prefs={muted:true,aimAssist:false,lookSensitivity:8,sfxVolume:.5,musicVolume:.2,musicTrack:'night',graphicsQuality:'performance',aimSensitivity:5,steerSensitivity:5,invertLook:false,highContrast:false};
  savePreferences(storage,prefs);
  assert.deepEqual(loadPreferences(storage),prefs);
});
test('bad or unavailable storage falls back safely', () => {
  const storage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
  assert.doesNotThrow(()=>savePreferences(storage,{}));
  assert.deepEqual(loadPreferences(storage),{muted:false,aimAssist:true,lookSensitivity:5,sfxVolume:.7,musicVolume:.35,musicTrack:'coast',graphicsQuality:'balanced',aimSensitivity:5,steerSensitivity:5,invertLook:false,highContrast:false});
  assert.deepEqual(loadPreferences({getItem(){return '{bad'}}),{muted:false,aimAssist:true,lookSensitivity:5,sfxVolume:.7,musicVolume:.35,musicTrack:'coast',graphicsQuality:'balanced',aimSensitivity:5,steerSensitivity:5,invertLook:false,highContrast:false});
  assert.equal(loadPreferences({getItem(){return '{"lookSensitivity":999}'}}).lookSensitivity,5);
});
