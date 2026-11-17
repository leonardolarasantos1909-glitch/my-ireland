export const defaults = Object.freeze({
  goal: 6000000, monthly: 30000, balance: null, departure: null, city: null,
  currency: 'BRL', secondaryCurrency: 'EUR', locale: 'pt-BR', timezone: 'America/Sao_Paulo'
});
export function parseMoney(value) {
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Informe um valor não negativo, com até duas casas decimais, sem separador de milhar.');
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > 1000000000000n) throw new Error('O valor máximo permitido é R$ 10 bilhões.');
  return Number(cents);
}
export function validDate(value) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validate(settings) {
  for (const key of ['goal', 'monthly', 'balance']) {
    if (key === 'balance' && settings[key] === null) continue;
    if (!Number.isSafeInteger(settings[key]) || settings[key] < 0 || settings[key] > 1000000000000) throw new Error('Valor financeiro inválido.');
  }
  if (!validDate(settings.departure)) throw new Error('Informe uma data de embarque válida.');
  if (settings.city !== null && (typeof settings.city !== 'string' || settings.city.length > 80)) throw new Error('Cidade inválida.');
  return settings;
}
export function projection(settings) {
  if (settings.balance === null) return null;
  const remaining = Math.max(0, settings.goal - settings.balance);
  const months = remaining === 0 ? 0 : settings.monthly === 0 ? null : Number((BigInt(remaining) + BigInt(settings.monthly) - 1n) / BigInt(settings.monthly));
  return { remaining, months, progress: settings.goal === 0 ? 100 : Math.min(100, Math.floor(settings.balance * 100 / settings.goal)) };
}
export function daysUntil(departure, now = new Date()) {
  if (!departure) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return Math.round((Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${p.year}-${p.month}-${p.day}T00:00:00Z`)) / 86400000);
}
