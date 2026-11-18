import { defaults, validDate, validate } from './domain.js';
import { categories, emptyPlan, initialSettings, movement, safeUrl, trip, validateLedger, visitStates } from './plan.js';

const idPattern = /^[0-9a-f-]{36}$/i;

export async function createBackup(settings, plan) {
  const documents = await Promise.all(plan.documents.map(async item => ({
    id: item.id, category: item.category, date: item.date, name: item.file.name, type: item.file.type,
    data: await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(item.file);
    })
  })));
  return new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), settings, plan: { ...plan, documents } })],
    { type: 'application/json' });
}

function check(condition) {
  if (!condition) throw new Error('O backup contém dados inválidos ou usa uma versão desconhecida.');
}
const string = (value, length) => {
  check(typeof value === 'string' && value.length <= length);
  return value;
};
const optionalUrl = value => value ? safeUrl(string(value, 16000)) : '';
const moneyValue = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000000;

export async function readBackup(file) {
  if (!file.size) throw new Error('Selecione um arquivo de backup com conteúdo.');
  const payload = JSON.parse(await file.text());
  check(payload?.version === 1 && payload.settings && payload.plan);
  const settings = validate({
    ...defaults, goal: payload.settings.goal, monthly: payload.settings.monthly,
    balance: payload.settings.balance, departure: payload.settings.departure, city: payload.settings.city
  });
  const source = payload.plan;
  const plan = emptyPlan();
  const readList = (key, read) => {
    const values = source[key];
    check(Array.isArray(values) && values.length <= 20000);
    const ids = new Set();
    return values.map(item => {
      check(typeof item?.id === 'string' && idPattern.test(item.id) && !ids.has(item.id));
      ids.add(item.id);
      return { ...read(item), id: item.id };
    });
  };
  plan.entries = readList('entries', item => {
    check(moneyValue(item.amount));
    return movement({ ...item, amount: (item.amount / 100).toFixed(2), note: string(item.note, 500), donor: string(item.donor, 100) }, item.id);
  });
  validateLedger(plan.entries, settings.balance);
  const common = item => {
    check(categories.includes(item.category));
    return { title: string(item.title, 160), category: item.category, updated: Number.isFinite(item.updated) ? item.updated : 0 };
  };
  plan.links = readList('links', item => ({ ...common(item), url: safeUrl(string(item.url, 16000)), summary: string(item.summary, 12000) }));
  const links = new Set(plan.links.map(item => item.id));
  plan.places = readList('places', item => {
    check(visitStates.includes(item.status) && (!item.link || links.has(item.link)));
    const lat = item.lat ?? null, lon = item.lon ?? null;
    check(lat === null && lon === null || Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180);
    return { ...common(item), status: item.status, note: string(item.note ?? '', 1000), city: string(item.city, 160), country: string(item.country, 160),
      link: item.link || '', originalUrl: optionalUrl(item.originalUrl), lat, lon };
  });
  plan.documents = readList('documents', item => {
    check(item.date && validDate(item.date));
    const match = string(item.data, 21 * 1024 * 1024).match(/^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/);
    check(match);
    const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
    check(bytes.length > 0 && bytes.length <= 15 * 1024 * 1024);
    const file = new File([bytes], string(item.name, 255), { type: string(item.type, 255) });
    return { file, category: string(item.category, 100), date: item.date };
  });
  check(Array.isArray(source.done) && source.done.every(index => Number.isInteger(index) && index >= 0 && index < trip.services.length));
  plan.done = [...new Set(source.done)];
  const donors = new Set(plan.entries.filter(item => item.source === 'donation').map(item => item.donor.normalize('NFC').toLocaleLowerCase('pt-BR')));
  plan.thanked = Object.fromEntries(Object.entries(source.thanked ?? {}).filter(([key, value]) => donors.has(key) && typeof value === 'boolean'));
  check(moneyValue(source.reference));
  plan.reference = source.reference;
  plan.referenceNote = string(source.referenceNote, 500);
  return { settings, plan };
}

export function isPristine(settings, plan) {
  const initial = { ...defaults, ...initialSettings };
  const empty = emptyPlan();
  return Object.entries(initial).every(([key, value]) => settings[key] === value) &&
    ['entries', 'links', 'places', 'documents', 'done'].every(key => !plan[key].length) &&
    Object.keys(plan.thanked).length === 0 && plan.reference === empty.reference && plan.referenceNote === '';
}
