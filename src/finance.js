import { dateLabel, escape, goalNames, money, schoolGoal, today, totals } from './plan.js';

export function goalCards(plan, settings) {
  const sums = totals(plan.entries, settings.balance);
  return '<div class="lower-grid goal-grid">' + Object.entries(goalNames).map(([id, name]) => {
    const currency = id === 'proof' ? 'BRL' : 'EUR';
    const goal = id === 'proof' ? settings.goal : schoolGoal;
    const { balance, own, donation, withdrawals, months } = sums[id];
    const unknown = id === 'proof' && settings.balance === null;
    const progress = goal ? Math.min(100, Math.floor(balance * 100 / goal)) : 100;
    const deposits = own + donation;
    return `<article class="card goal-card">
      <div class="goal-heading"><h2>${name}</h2><span class="currency-chip">${currency}</span></div>
      <dl class="goal-values">
        <div><dt>${unknown ? 'Saldo registrado' : 'Total economizado'}</dt><dd>${money(balance, currency)}</dd></div>
        <div><dt>Meta</dt><dd>${money(goal, currency)}</dd></div>
      </dl>
      <div class="goal-progress"><span>${unknown ? 'Saldo anterior desconhecido' : 'Faltam ' + money(Math.max(0, goal - balance), currency)}</span><strong>${progress}%</strong></div>
      <progress aria-label="Progresso registrado de ${name}" max="100" value="${progress}"></progress>
      <p>Recursos próprios ${money(own, currency)} · Doações ${money(donation, currency)}</p>
      <p>Entradas acumuladas ${money(deposits, currency)} · Retiradas ${money(withdrawals, currency)}</p>
      <p>${months.size ? 'Média de entradas por mês com atividade ' + money(Math.round(deposits / months.size), currency) : 'Sem média histórica disponível.'}</p>
      ${id === 'proof' ? '<small>Os recursos desta meta são exclusivos para comprovação financeira.</small>' : '<small>Reserva adicional para quitar o saldo contratual em uma única vez.</small>'}</article>`;
  }).join('') + '</div>';
}
export const byRecent = (a, b) => b.date.localeCompare(a.date);
const options = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
const value = cents => (cents / 100).toFixed(2);
const donorKey = name => name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');

export function recentEntries(entries, edit = false) {
  return entries.length ? `<ul class="records">${entries.map(item => `<li><div><strong>${item.kind === 'withdrawal' ? 'Retirada' : item.source === 'donation' ? 'Doação de ' + escape(item.donor) : 'Depósito próprio'}</strong><p>${dateLabel(item.date)} · ${goalNames[item.goal]} · ${money(item.amount, item.goal === 'proof' ? 'BRL' : 'EUR')}${item.note ? ' · ' + escape(item.note) : ''}</p></div>
  ${edit ? `<div class="actions"><button data-action="edit-entry" data-id="${item.id}">Editar</button><button data-action="delete-entry" data-id="${item.id}">Excluir</button></div>` : ''}</li>`).join('')}</ul>` : '<p>Nenhuma movimentação registrada.</p>';
}

export function financePage(plan, settings, editing, exchange) {
  const item = plan.entries.find(entry => entry.id === editing);
  const donors = new Map();
  for (const entry of plan.entries.filter(entry => entry.source === 'donation')) {
    const key = donorKey(entry.donor);
    const donor = donors.get(key) ?? { name: entry.donor, proof: 0, school: 0 };
    donor[entry.goal] += entry.amount;
    donors.set(key, donor);
  }
  return `<section class="heading"><div><h1>Finanças</h1><p>Comprovação e escola têm saldos independentes. Os depósitos são livres.</p></div></section>
    ${goalCards(plan, settings)}
    <p class="hint">Visão consolidada em moedas separadas. A meta em euros é adicional à meta em reais. Cada movimentação entra em apenas uma meta.</p>
    <div class="lower-grid">${exchange}<form class="card" data-form="reference"><h2>Referência de comprovação</h2><p>R$ 60 mil é a meta pessoal inicial. A referência em euros deve ser revisada com as regras vigentes no embarque.</p>
    <label>Referência em euros<input name="reference" required inputmode="decimal" value="${value(plan.reference)}"></label>
    <label>Fonte ou observação<input name="referenceNote" maxlength="500" value="${escape(plan.referenceNote)}" placeholder="Referência discutida inicialmente"></label>
    <button class="button">Salvar referência</button></form></div>
    <form class="card block" data-form="entry" data-id="${item?.id ?? ''}"><h2>${item ? 'Editar movimentação' : 'Registrar movimentação'}</h2><div class="form-grid">
    <label>Tipo<select name="kind">${options({ deposit: 'Depósito', withdrawal: 'Retirada' }, item?.kind)}</select></label>
    <label>Meta<select name="goal">${options({ proof: 'Comprovação · BRL', school: 'Escola · EUR' }, item?.goal)}</select></label>
    <label>Valor na moeda da meta<input name="amount" value="${item ? value(item.amount) : ''}" inputmode="decimal" required></label>
    <label>Data<input name="date" type="date" max="${today()}" value="${item?.date ?? today()}" required></label>
    <label>Origem do depósito<select name="source">${options({ own: 'Dinheiro próprio', donation: 'Doação' }, item?.source)}</select></label>
    <label>Nome do doador<input name="donor" maxlength="100" value="${escape(item?.donor)}"></label>
    <label>Observação ou justificativa<textarea name="note" maxlength="500">${escape(item?.note)}</textarea></label></div>
    <button class="button">${item ? 'Salvar edição' : 'Registrar'}</button>
    ${item ? '<button class="button secondary" data-action="cancel-entry" type="button">Cancelar edição</button>' : ''}</form>
    <article class="card block"><h2>Histórico de movimentações</h2>${recentEntries([...plan.entries].sort(byRecent), true)}</article>
    <article class="card block"><h2>Doações e agradecimentos</h2><p>Os totais acima separam recursos próprios de doações por moeda. Os valores abaixo já integram suas metas.</p>
    ${donors.size ? `<ul class="records">${[...donors].map(([key, donor]) => `<li><div><strong>${escape(donor.name)}</strong><p>${money(donor.proof)} · ${money(donor.school, 'EUR')} · ${Object.hasOwn(plan.thanked, key) && plan.thanked[key] ? 'Agradecimento realizado' : 'Agradecimento pendente'}</p></div><div class="actions"><button data-action="thanks" data-id="${escape(key)}">Alternar situação</button><button data-action="thank-ai" data-id="${escape(donor.name)}">Redigir com IA</button></div></li>`).join('')}</ul>` : '<p>Nenhum doador registrado.</p>'}
    <h3>Histórico de contribuições</h3>${recentEntries(plan.entries.filter(entry => entry.kind === 'deposit').sort(byRecent))}</article>`;
}
