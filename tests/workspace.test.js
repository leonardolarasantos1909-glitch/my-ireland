import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { deadline, movement, safeUrl, schoolGoal, totals, validateLedger } from '../src/plan.js';
import { convert, fetchExchange } from '../src/exchange.js';
import { loadPlan, loadSettings, openDatabase, saveSettings, updatePlan } from '../src/db.js';
import worker from '../worker/index.js';

const date = '2025-02-10';
const make = (data, id) => movement({ date, kind: 'deposit', goal: 'proof', source: 'own', amount: '100', ...data }, id);

test('doações entram uma vez e retiradas respeitam independência e ordem do histórico', () => {
  const own = make({}, 'a');
  const donation = make({ amount: '25', goal: 'school', source: 'donation', donor: 'Ana' }, 'b');
  const withdrawal = make({ kind: 'withdrawal', amount: '35' }, 'c');
  const sums = totals([own, donation, withdrawal], 500);
  assert.equal(sums.proof.balance, 7000);
  assert.equal(sums.school.balance, 2500);
  assert.equal(sums.school.donation, 2500);
  assert.equal(sums.school.own, 0);
  assert.throws(() => make({ source: 'donation' }, 'd'), /nome/);
  assert.throws(() => validateLedger([donation, withdrawal], 500), /negativo/);
  assert.throws(() => validateLedger([{ ...withdrawal, date: '2025-02-09' }, own], 500), /negativo/);
  assert.equal(schoolGoal, 249500);
  assert.equal(deadline(null), null);
  assert.equal(deadline('2028-03-10'), '2028-02-09');
  assert.equal(convert(schoolGoal, 6003200), 1497798);
  assert.throws(() => safeUrl('javascript:alert(1)'));
});

test('movimentações persistem e reduções inválidas de saldo são rejeitadas atomicamente', async () => {
  let db = await openDatabase();
  const settings = await loadSettings(db);
  await saveSettings(db, { ...settings, balance: 10000 });
  await updatePlan(db, plan => ({ ...plan, entries: [make({ kind: 'withdrawal', amount: '10' }, 'w')] }));
  await assert.rejects(saveSettings(db, settings), /negativo/);
  db.close();
  db = await openDatabase();
  assert.equal((await loadPlan(db)).entries[0].amount, 1000);
  assert.equal((await loadSettings(db)).balance, 10000);
  db.close();
});

test('falha do provedor não cria valores cambiais', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  assert.deepEqual(await fetchExchange(7), { quote: null, points: [] });
});

test('endpoint de IA exige configuração e origem local antes de contatar o provedor', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Chamada inesperada'); });
  const url = 'https://my-ireland.example/api/assistant';
  const request = origin => new Request(url, { method: 'POST', headers: { Origin: origin } });
  assert.equal((await worker.fetch(request('https://other.example'), {})).status, 403);
  assert.equal((await worker.fetch(request('https://my-ireland.example'), {})).status, 503);
  assert.equal(fetch.mock.calls.length, 0);
});

test('site publicado exige acesso pessoal antes de servir arquivos', async () => {
  const request = new Request('https://my-ireland.example/assets/bundle.js');
  const ASSETS = { fetch: () => { throw new Error('Asset privado não deve ser servido'); } };
  assert.equal((await worker.fetch(request, { ASSETS })).status, 503);
  const original = Object.getOwnPropertyDescriptor(crypto.subtle, 'timingSafeEqual');
  Object.defineProperty(crypto.subtle, 'timingSafeEqual', { configurable: true, value: (a, b) => Buffer.from(a).equals(Buffer.from(b)) });
  try {
    const secret = 'a'.repeat(32);
    const guarded = await worker.fetch(request, { ASSETS, APP_ACCESS_TOKEN: secret });
    assert.equal(guarded.status, 401);
    assert.match(guarded.headers.get('WWW-Authenticate'), /Basic/);
    const authorized = new Request(request, { headers: { Authorization: 'Basic ' + btoa('my-ireland:' + secret) } });
    const response = await worker.fetch(authorized, {
      APP_ACCESS_TOKEN: secret,
      ASSETS: { fetch: assetRequest => {
        assert.equal(assetRequest.headers.get('Authorization'), null);
        return new Response('Asset privado');
      } }
    });
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(await response.text(), 'Asset privado');
  } finally {
    if (original) Object.defineProperty(crypto.subtle, 'timingSafeEqual', original);
    else delete crypto.subtle.timingSafeEqual;
  }
});

test('histórico cambial mantém apenas observações válidas do período solicitado', async t => {
  const { today } = await import('../src/plan.js');
  const date = today();
  const fetch = t.mock.method(globalThis, 'fetch', async url => Response.json(url.includes('/latest')
    ? { date, rates: { BRL: 6.0321 } }
    : { rates: { [date]: { BRL: 6.0321 }, '1999-01-01': { BRL: 2.10 }, 'invalid': { BRL: 3 } } }));
  const result = await fetchExchange(365);
  assert.equal(fetch.mock.calls.length, 2);
  assert.equal(result.quote.rate, 6032100);
  assert.deepEqual(result.points, [[date, 6032100]]);
});
