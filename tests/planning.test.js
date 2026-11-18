import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { defaults, parseMoney, projection, validate, daysUntil } from '../src/domain.js';
import { openDatabase, loadSettings, saveSettings } from '../src/db.js';

test('valores monetários são convertidos em centavos exatos', () => {
  assert.equal(parseMoney('60000,00'), 6000000);
  assert.equal(parseMoney('0.29'), 29);
  assert.equal(parseMoney('300'), 30000);
  for (const value of ['-1', '1.234', 'NaN', '', '1e3', '10000000000.01']) assert.throws(() => parseMoney(value));
});
test('saldo desconhecido é diferente de zero confirmado', () => {
  assert.equal(projection(defaults), null);
  assert.deepEqual(projection({ ...defaults, balance: 0 }), { remaining: 6000000, months: 200, progress: 0 });
  assert.equal(projection({ ...defaults, balance: 6000000 }).months, 0);
  assert.equal(projection({ ...defaults, balance: 0, monthly: 0 }).months, null);
  assert.equal(projection({ ...defaults, balance: 1 }).months, 200);
});
test('valida datas reais e valores não negativos', () => {
  assert.throws(() => validate({ ...defaults, departure: '2026-02-30' }));
  assert.throws(() => validate({ ...defaults, monthly: -1 }));
  assert.throws(() => validate({ ...defaults, balance: 0.5 }));
  assert.doesNotThrow(() => validate({ ...defaults, departure: '2028-02-29' }));
  assert.equal(daysUntil(null), null);
  assert.equal(daysUntil('2026-11-17', new Date('2026-11-17T01:00:00Z')), 1);
  assert.equal(daysUntil('2026-11-17', new Date('2026-11-17T12:00:00Z')), 0);
});
test('seed idempotente preserva nulos e configurações após reabrir o banco', async () => {
  let db = await openDatabase();
  assert.deepEqual(await loadSettings(db), { ...defaults, city: 'Dublin', balance: 0 });
  const changed = { ...defaults, goal: 12345, monthly: 234, balance: 0, city: 'Cork', departure: '2028-02-29' };
  await saveSettings(db, changed);
  db.close();
  db = await openDatabase();
  assert.deepEqual(await loadSettings(db), changed);
  assert.deepEqual(await loadSettings(db), changed);
  await assert.rejects(saveSettings(db, { ...changed, balance: -1 }));
  assert.deepEqual(await loadSettings(db), changed);
  await saveSettings(db, { ...changed, balance: null, city: null, departure: null });
  assert.equal((await loadSettings(db)).balance, null);
  db.close();
});

test('migração de IndexedDB v1 preserva os dados cadastrados', async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('my-ireland');
    request.onsuccess = resolve;
    request.onerror = reject;
  });
  const existing = { ...defaults, city: 'Galway', balance: 12345 };
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('my-ireland', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings').put(existing, 'personal');
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = reject;
  });
  const db = await openDatabase();
  assert.deepEqual(await loadSettings(db), existing);
  db.close();
});
