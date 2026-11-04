const DEFAULTS = { muted: false, aimAssist: true, lookSensitivity: 5, sfxVolume: .7, musicVolume: .35, musicTrack: 'coast', graphicsQuality: 'balanced', aimSensitivity: 5, steerSensitivity: 5, invertLook: false, highContrast: false, voiceLines: false };
const KEY = 'aivm-settings-v1';

export function loadPreferences(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || '{}');
    const value = Number(data.lookSensitivity);
    const volume = key => typeof data[key] === 'number' && data[key] >= 0 && data[key] <= 1 ? data[key] : DEFAULTS[key];
    return {
      muted: typeof data.muted === 'boolean' ? data.muted : DEFAULTS.muted,
      aimSensitivity: Number.isFinite(Number(data.aimSensitivity)) && Number(data.aimSensitivity)>=1 && Number(data.aimSensitivity)<=10 ? Number(data.aimSensitivity) : DEFAULTS.aimSensitivity,
      steerSensitivity: Number.isFinite(Number(data.steerSensitivity)) && Number(data.steerSensitivity)>=1 && Number(data.steerSensitivity)<=10 ? Number(data.steerSensitivity) : DEFAULTS.steerSensitivity,
      voiceLines: typeof data.voiceLines === 'boolean' ? data.voiceLines : DEFAULTS.voiceLines,
      highContrast: typeof data.highContrast === 'boolean' ? data.highContrast : DEFAULTS.highContrast,
      invertLook: typeof data.invertLook === 'boolean' ? data.invertLook : DEFAULTS.invertLook,
      aimAssist: typeof data.aimAssist === 'boolean' ? data.aimAssist : DEFAULTS.aimAssist,
      lookSensitivity: Number.isFinite(value) && value >= 1 && value <= 10 ? value : DEFAULTS.lookSensitivity,
      sfxVolume: volume('sfxVolume'), musicVolume: volume('musicVolume'),
      musicTrack: ['off','coast','night','harbor','race','missions'].includes(data.musicTrack) ? data.musicTrack : DEFAULTS.musicTrack,
      graphicsQuality: ['balanced','performance'].includes(data.graphicsQuality) ? data.graphicsQuality : DEFAULTS.graphicsQuality,
    };
  } catch { return { ...DEFAULTS }; }
}
export function savePreferences(storage, preferences) {
  try { storage?.setItem(KEY, JSON.stringify(preferences)); } catch { /* Gameplay works when storage is blocked. */ }
}
