const DEFAULTS = { muted: false, aimAssist: true, lookSensitivity: 5 };
const KEY = 'aivm-settings-v1';

export function loadPreferences(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || '{}');
    const value = Number(data.lookSensitivity);
    return {
      muted: typeof data.muted === 'boolean' ? data.muted : DEFAULTS.muted,
      aimAssist: typeof data.aimAssist === 'boolean' ? data.aimAssist : DEFAULTS.aimAssist,
      lookSensitivity: Number.isFinite(value) && value >= 1 && value <= 10 ? value : DEFAULTS.lookSensitivity,
    };
  } catch { return { ...DEFAULTS }; }
}

export function savePreferences(storage, preferences) {
  try { storage?.setItem(KEY, JSON.stringify(preferences)); } catch { /* Gameplay works when storage is blocked. */ }
}
