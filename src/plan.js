import { parseMoney, validDate } from './domain.js';

export const trip = {
  school: 'ELI Schools', agency: 'Love Intercâmbios', total: 299500, paid: 50000,
  period: 'Final de 2027 ou início de 2028', course: 'Academic Year — Dublin PM · 15 h por semana',
  services: ['Seguro médico governamental', 'Learner Protection', 'Exame TIE', 'Uma semana de acomodação estudantil compartilhada', 'Livro de inglês', 'Recepção no aeroporto', 'Serviços de apoio']
};
export const schoolGoal = trip.total - trip.paid;
export const categories = ['Pontos turísticos', 'Restaurantes', 'Viagens pela Europa', 'Moradia', 'Transporte', 'Trabalho', 'Vida estudantil', 'Dicas gerais'];
export const visitStates = ['Quero visitar', 'Planejado', 'Visitado'];
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export const money = (value, currency = 'BRL') => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value / 100);
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dateLabel = value => value ? value.split('-').reverse().join('/') : 'Data indefinida';
export const goalNames = { proof: 'Comprovação financeira', school: 'Pagamento da ELI School' };
export const initialSettings = Object.freeze({ city: 'Dublin', balance: 0 });
export const emptyPlan = () => ({ entries: [], links: [], places: [], documents: [], thanked: {}, done: [], reference: 666500, referenceNote: '', quote: null, history: {} });

export function deadline(departure) {
  if (!departure) return null;
  const date = new Date(departure + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
}

export function safeUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use um link HTTP ou HTTPS sem credenciais.');
  return url.href;
}

export function movement(data, id = crypto.randomUUID()) {
  const { goal, kind, source, date } = data;
  const amount = parseMoney(data.amount);
  const donor = kind === 'deposit' && source === 'donation' ? String(data.donor ?? '').trim() : '';
  if (!Object.hasOwn(goalNames, goal) || !['deposit', 'withdrawal'].includes(kind) ||
      !['own', 'donation'].includes(source) || !date || !validDate(date) || date > today() ||
      amount === 0 || (kind === 'deposit' && source === 'donation' && !donor)) {
    throw new Error('Confira a meta, o valor positivo, a data e o nome para doações.');
  }
  return { id, goal, kind, source: donor ? 'donation' : 'own', date, amount, donor, note: String(data.note ?? '').trim() };
}

export function totals(entries, base = 0) {
  const result = {
    proof: { balance: base ?? 0, own: 0, donation: 0, withdrawals: 0, months: new Set() },
    school: { balance: 0, own: 0, donation: 0, withdrawals: 0, months: new Set() }
  };
  for (const item of entries) {
    const total = result[item.goal];
    total.months.add(item.date.slice(0, 7));
    if (item.kind === 'withdrawal') {
      total.balance -= item.amount;
      total.withdrawals += item.amount;
    } else {
      total.balance += item.amount;
      total[item.source] += item.amount;
    }
  }
  return result;
}

export function validateLedger(entries, base) {
  const balances = { proof: base ?? 0, school: 0 };
  const activity = { proof: 0, school: 0 };
  for (const item of [...entries].sort((a, b) => a.date.localeCompare(b.date) || Number(a.kind === 'withdrawal') - Number(b.kind === 'withdrawal'))) {
    balances[item.goal] += item.kind === 'deposit' ? item.amount : -item.amount;
    activity[item.goal] += item.amount;
    if (!Number.isSafeInteger(activity[item.goal]) || !Number.isSafeInteger(balances[item.goal]) || balances[item.goal] < 0) {
      throw new Error('A movimentação deixaria uma meta com saldo negativo ou inválido no histórico.');
    }
  }
}
