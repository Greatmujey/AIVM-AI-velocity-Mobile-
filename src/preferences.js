const DEFAULTS = { muted: false, aimAssist: true, lookSensitivity: 5, sfxVolume: .7, musicVolume: .35, musicTrack: 'coast', graphicsQuality: 'balanced' };
const KEY = 'aivm-settings-v1';

export function loadPreferences(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || '{}');
    const value = Number(data.lookSensitivity);
    const volume = key => typeof data[key] === 'number' && data[key] >= 0 && data[key] <= 1 ? data[key] : DEFAULTS[key];
    return {
      muted: typeof data.muted === 'boolean' ? data.muted : DEFAULTS.muted,
      aimAssist: typeof data.aimAssist === 'boolean' ? data.aimAssist : DEFAULTS.aimAssist,
      lookSensitivity: Number.isFinite(value) && value >= 1 && value <= 10 ? value : DEFAULTS.lookSensitivity,
      sfxVolume: volume('sfxVolume'), musicVolume: volume('musicVolume'),
      musicTrack: ['off','coast','night'].includes(data.musicTrack) ? data.musicTrack : DEFAULTS.musicTrack,
      graphicsQuality: ['balanced','performance'].includes(data.graphicsQuality) ? data.graphicsQuality : DEFAULTS.graphicsQuality,
    };
  } catch { return { ...DEFAULTS }; }
}
export function savePreferences(storage, preferences) {
  try { storage?.setItem(KEY, JSON.stringify(preferences)); } catch { /* Gameplay works when storage is blocked. */ }
}
