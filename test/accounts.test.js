import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadAccounts, normalizeEmail, validEmail, validPassword,
  registerAccount, signInAccount, getSessionAccount, getSessionId, signOut,
} from '../src/accounts.js';
import { loadProgress, saveProgress, setProgressScope, progressKey, reward } from '../src/economy.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

test('email + password validation', () => {
  assert.equal(normalizeEmail('  Boo@Example.COM '), 'boo@example.com');
  assert.ok(validEmail('you@example.com'));
  assert.ok(!validEmail('nope'));
  assert.ok(!validEmail('a@b'));
  assert.ok(validPassword('abcd'));
  assert.ok(!validPassword('abc'));
});

test('register creates an account, hashes the password and starts a session', async () => {
  const storage = fakeStorage();
  const result = await registerAccount(storage, 'Rider@Example.com', 'pass1');
  assert.ok(result.ok, result.error);
  assert.equal(result.account.email, 'rider@example.com');
  const list = loadAccounts(storage);
  assert.equal(list.length, 1);
  assert.notEqual(list[0].hash, 'pass1');
  assert.ok(list[0].hash.length >= 16);
  assert.equal(getSessionId(storage), result.account.id);
});

test('register rejects bad email, short password and duplicates', async () => {
  const storage = fakeStorage();
  assert.equal((await registerAccount(storage, 'bad', 'pass1')).ok, false);
  assert.equal((await registerAccount(storage, 'a@b.com', 'x')).ok, false);
  assert.ok((await registerAccount(storage, 'a@b.com', 'pass1')).ok);
  const dupe = await registerAccount(storage, 'A@B.COM', 'pass2');
  assert.equal(dupe.ok, false);
  assert.match(dupe.error, /already has an account/i);
  assert.equal(loadAccounts(storage).length, 1);
});

test('sign in checks the password and restores the session', async () => {
  const storage = fakeStorage();
  await registerAccount(storage, 'rider@example.com', 'pass1');
  signOut(storage);
  assert.equal(getSessionAccount(storage), null);
  const wrong = await signInAccount(storage, 'rider@example.com', 'nope');
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /wrong password/i);
  const missing = await signInAccount(storage, 'ghost@example.com', 'pass1');
  assert.equal(missing.ok, false);
  const ok = await signInAccount(storage, 'RIDER@example.com ', 'pass1');
  assert.ok(ok.ok);
  assert.equal(getSessionAccount(storage)?.email, 'rider@example.com');
});

test('scoped progress: each account keeps its own save slot', () => {
  const storage = fakeStorage();
  setProgressScope(null);
  const guest = loadProgress(storage);
  reward(guest, 300);
  saveProgress(storage, guest);

  setProgressScope('acct-1');
  assert.match(progressKey(), /#acct-1$/);
  const acct1 = loadProgress(storage);
  assert.equal(acct1.money, 0, 'new account starts fresh');
  reward(acct1, 900);
  saveProgress(storage, acct1);

  setProgressScope('acct-2');
  assert.equal(loadProgress(storage).money, 0);

  setProgressScope('acct-1');
  assert.equal(loadProgress(storage).money, 900, 'signing back in resumes the save');

  setProgressScope(null);
  assert.equal(loadProgress(storage).money, 300, 'guest save untouched');
});
