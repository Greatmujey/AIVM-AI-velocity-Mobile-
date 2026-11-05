import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerAccount, signInAccount, getSessionAccount, signOut,
  loadAccounts, validEmail, validPassword, normalizeEmail,
} from '../src/accounts.js';
import { setProgressScope, loadProgress, saveProgress } from '../src/economy.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

test('wave8: email and password validation', () => {
  assert.equal(validEmail('You@Example.com'), true);
  assert.equal(validEmail('no-at-sign'), false);
  assert.equal(validEmail('a@b'), false);
  assert.equal(normalizeEmail('  MIXED@Case.COM '), 'mixed@case.com');
  assert.equal(validPassword('1234'), true);
  assert.equal(validPassword('abc'), false);
});

test('wave8: register creates an account and a session', async () => {
  const storage = fakeStorage();
  const result = await registerAccount(storage, 'rider@aivm.test', 'bikesRule1');
  assert.equal(result.ok, true);
  assert.equal(result.account.email, 'rider@aivm.test');
  assert.ok(result.account.id.startsWith('acct-'));
  assert.equal(loadAccounts(storage).length, 1);
  assert.equal(getSessionAccount(storage)?.email, 'rider@aivm.test');
  // the raw password is never stored
  assert.ok(!JSON.stringify([...storage._map.values()]).includes('bikesRule1'));
});

test('wave8: duplicate email is rejected', async () => {
  const storage = fakeStorage();
  await registerAccount(storage, 'dupe@aivm.test', 'pass1');
  const second = await registerAccount(storage, 'DUPE@aivm.test', 'pass2');
  assert.equal(second.ok, false);
  assert.match(second.error, /already has an account/i);
  assert.equal(loadAccounts(storage).length, 1);
});

test('wave8: sign in checks the password, sessions persist', async () => {
  const storage = fakeStorage();
  await registerAccount(storage, 'night@aivm.test', 'cruise99');
  signOut(storage);
  assert.equal(getSessionAccount(storage), null);

  const wrong = await signInAccount(storage, 'night@aivm.test', 'wrongpass');
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /wrong password/i);
  assert.equal(getSessionAccount(storage), null);

  const unknown = await signInAccount(storage, 'ghost@aivm.test', 'cruise99');
  assert.equal(unknown.ok, false);
  assert.match(unknown.error, /no account/i);

  const right = await signInAccount(storage, 'NIGHT@aivm.test', 'cruise99');
  assert.equal(right.ok, true);
  assert.equal(getSessionAccount(storage)?.email, 'night@aivm.test');
});

test('wave8: progress saves are scoped per account', () => {
  const storage = fakeStorage();

  setProgressScope(null);
  const guest = loadProgress(storage);
  guest.money = 111;
  saveProgress(storage, guest);

  setProgressScope('acct-alice');
  const alice = loadProgress(storage);
  assert.equal(alice.money, 0, 'a new account starts fresh');
  alice.money = 900;
  alice.owned = ['mg'];
  saveProgress(storage, alice);

  setProgressScope('acct-bob');
  const bob = loadProgress(storage);
  assert.equal(bob.money, 0);
  bob.money = 42;
  saveProgress(storage, bob);

  // everyone keeps exactly their own save — sign back in, continue where you left off
  setProgressScope('acct-alice');
  assert.deepEqual(loadProgress(storage), { money: 900, owned: ['mg'] });
  setProgressScope('acct-bob');
  assert.equal(loadProgress(storage).money, 42);
  setProgressScope(null);
  assert.equal(loadProgress(storage).money, 111);
});

test('wave8: bad progress data cannot poison an account save', () => {
  const storage = fakeStorage();
  setProgressScope('acct-dodgy');
  storage.setItem('aivm-progress-v1#acct-dodgy', '{"money":"lots","owned":null}');
  const loaded = loadProgress(storage);
  assert.equal(loaded.money, 0);
  assert.deepEqual(loaded.owned, []);
  setProgressScope(null);
});
