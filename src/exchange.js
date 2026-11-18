import { validDate } from './domain.js';
import { dateLabel, money, today } from './plan.js';

export const ranges = { 7: '7 dias', 30: '30 dias', 90: '90 dias', 365: '1 ano' };
const formatRate = rate => 'R$ ' + (rate / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
const url = 'https://api.frankfurter.dev/v1';
const rateUnits = value => Math.round(value * 1000000);

export async function fetchExchange(days) {
  const end = today();
  const start = new Date(end + 'T12:00:00Z');
  start.setUTCDate(start.getUTCDate() - days + 1);
  const from = start.toISOString().slice(0, 10);
  const get = async path => {
    const response = await fetch(url + path + '?base=EUR&symbols=BRL', { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new Error('Cotação indisponível.');
    return response.json();
  };
  const [latest, history] = await Promise.allSettled([get('/latest'), get('/' + from + '..' + end)]);
  const quote = latest.status === 'fulfilled' && Number.isFinite(latest.value.rates?.BRL) && latest.value.rates.BRL > 0 &&
    latest.value.date && validDate(latest.value.date)
    ? { date: latest.value.date, rate: rateUnits(latest.value.rates.BRL), checked: Date.now() } : null;
  const points = Object.entries(history.status === 'fulfilled' ? history.value.rates ?? {} : {})
    .filter(([date, rate]) => validDate(date) && date >= from && date <= end && Number.isFinite(rate.BRL) && rate.BRL > 0)
    .map(([date, rate]) => [date, rateUnits(rate.BRL)]).sort(([a], [b]) => a.localeCompare(b));
  return { quote, points };
}

export function convert(cents, rate) {
  return Number((BigInt(cents) * BigInt(rate) + 500000n) / 1000000n);
}

export function exchangeCard(plan, days, status, remaining, reserve) {
  const quote = plan.quote;
  const points = plan.history[days] ?? [];
  const old = quote && (Date.now() - quote.checked > 3600000 || Date.parse(today()) - Date.parse(quote.date) > 3 * 86400000);
  const rates = points.map(point => point[1]);
  const min = Math.min(...rates), max = Math.max(...rates);
  const change = points.length > 1 ? (rates.at(-1) / rates[0] - 1) * 100 : null;
  const coords = points.map(([, rate], index) => [8 + index * 384 / Math.max(points.length - 1, 1), 98 - (rate - min) * 88 / (max - min || 1)]);
  return `<article class="card exchange"><div class="section-title"><h2>Euro · EUR/BRL</h2><button class="button secondary" data-action="exchange">Atualizar</button></div>
    <h3>${quote ? formatRate(quote.rate) : 'Cotação indisponível'}</h3>
    <p>Referência Frankfurter${quote ? ' de ' + dateLabel(quote.date) + ' · Consultada em ' + new Date(quote.checked).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''}. O custo de compra pode incluir spread, IOF e tarifas.</p>
    ${old ? '<p class="hint">Cotação desatualizada.</p>' : ''}<p role="status">${status}</p>
    ${quote ? `<p>Saldo contratual da escola em reais pela referência <strong>${money(convert(remaining, quote.rate))}</strong> · Reserva atual em reais <strong>${money(convert(reserve, quote.rate))}</strong></p>` : ''}
    <div class="actions">${Object.entries(ranges).map(([key, label]) => `<button class="button secondary" type="button" data-range="${key}" aria-pressed="${Number(key) === days}">${label}</button>`).join('')}</div>
    ${points.length ? `<svg viewBox="0 0 400 108" aria-label="Histórico da cotação" role="img"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${coords.join(' ')}"/>${coords.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="${points.length > 95 ? 2 : 4}" data-point="${index}" fill="currentColor"><title>${dateLabel(points[index][0])} · ${formatRate(rates[index])}</title></circle>`).join('')}</svg>
    <input aria-label="Selecionar data no gráfico" type="range" data-quote-point min="0" max="${points.length - 1}" value="${points.length - 1}"><output data-point-output>${dateLabel(points.at(-1)[0])} · ${formatRate(rates.at(-1))}</output>
    <p>${change === null ? 'Variação indisponível' : 'Variação ' + change.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%'} · Mín. ${formatRate(min)} · Máx. ${formatRate(max)} · ${points.length} observações disponíveis</p>
    <p>Dados publicados de ${dateLabel(points[0][0])} a ${dateLabel(points.at(-1)[0])}. A fonte publica em dias úteis.</p>` : '<p>Sem dados históricos disponíveis para este período.</p>'}</article>`;
}
export const pointLabel = ([date, rate]) => dateLabel(date) + ' · ' + formatRate(rate);
