// Quick email + password accounts. Everything lives in localStorage on this
// device: an account list (email + salted SHA-256 hash, never the raw
// password) and a session id. Signing in scopes the progress and garage save
// keys to that account, so each player continues exactly where they left off
// and guests keep their own separate save.
const ACCOUNTS_KEY = 'aivm-accounts-v1';
const SESSION_KEY = 'aivm-session-v1';

export function loadAccounts(storage) {
  try {
    const list = JSON.parse(storage?.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(list) ? list.filter(a => a && typeof a.id === 'string' && typeof a.email === 'string') : [];
  } catch { return []; }
}
function saveAccounts(storage, list) {
  try { storage?.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch { /* private browsing */ }
}
export function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
export function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) }
export function validPassword(password) { return String(password || '').length >= 4 }

async function hashPassword(password, salt) {
  const text = `${salt}::${password}`;
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // SubtleCrypto can be unavailable in exotic contexts; fall back to a
    // salted non-crypto digest so the flow still works offline.
    let h1 = 0x811c9dc5, h2 = 0x1000193;
    for (let i = 0; i < text.length; i++) {
      h1 = ((h1 ^ text.charCodeAt(i)) * 16777619) >>> 0;
      h2 = ((h2 + text.charCodeAt(i) * (i + 7)) * 2654435761) >>> 0;
    }
    return `fb${h1.toString(16)}${h2.toString(16)}`;
  }
}

export async function registerAccount(storage, email, password) {
  email = normalizeEmail(email);
  if (!validEmail(email)) return { ok: false, error: 'Enter a valid email like you@example.com.' };
  if (!validPassword(password)) return { ok: false, error: 'Password must be at least 4 characters.' };
  const list = loadAccounts(storage);
  if (list.some(a => a.email === email)) return { ok: false, error: 'That email already has an account. Sign in instead.' };
  const salt = Math.random().toString(36).slice(2, 12);
  const account = {
    id: `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    email, salt, hash: await hashPassword(password, salt), created: Date.now(),
  };
  list.push(account); saveAccounts(storage, list); setSession(storage, account.id);
  return { ok: true, account };
}

export async function signInAccount(storage, email, password) {
  const account = loadAccounts(storage).find(a => a.email === normalizeEmail(email));
  if (!account) return { ok: false, error: 'No account with that email. Create one first.' };
  const hash = await hashPassword(password, account.salt);
  if (hash !== account.hash) return { ok: false, error: 'Wrong password. Try again.' };
  setSession(storage, account.id);
  return { ok: true, account };
}

export function setSession(storage, id) { try { storage?.setItem(SESSION_KEY, String(id)) } catch { /* ignore */ } }
export function getSessionId(storage) { try { return storage?.getItem(SESSION_KEY) || null } catch { return null } }
export function getSessionAccount(storage) {
  const id = getSessionId(storage);
  return id ? loadAccounts(storage).find(a => a.id === id) || null : null;
}
export function signOut(storage) { try { storage?.removeItem(SESSION_KEY) } catch { /* ignore */ } }
