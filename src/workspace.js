import { createBackup, isPristine, readBackup } from './backup.js';
import { parseMoney } from './domain.js';
import { loadPlan, loadSettings, restorePlan, updatePlan } from './db.js';
import { categories, deadline, dateLabel, escape, movement, safeUrl, schoolGoal, today, totals, trip, validateLedger, visitStates } from './plan.js';
import { financePage, goalCards, recentEntries, byRecent } from './finance.js';
import { exchangeCard, fetchExchange, pointLabel, ranges } from './exchange.js';
import { discoveries, documents } from './collections.js';

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function coordinates(lat, lon) {
  if (lat === '' && lon === '') return { lat: null, lon: null };
  const y = Number(lat), x = Number(lon);
  if (!lat || !lon || !Number.isFinite(y) || !Number.isFinite(x) || Math.abs(y) > 90 || Math.abs(x) > 180) {
    throw new Error('Informe latitude e longitude verificadas.');
  }
  return { lat: y, lon: x };
}

export async function createWorkspace(db, mount, currentSettings, render) {
  let plan = await loadPlan(db);
  let editing = '', category = '', days = 7, quoteStatus = '', quoteRequest = 0;
  let assistantLink = null, donor = '', updating = false;
  let quoteAttempt = 0;

  async function save(change) {
    plan = await updatePlan(db, change);
    render();
  }

  function status(message) {
    const output = mount.querySelector('#notice');
    if (output) output.textContent = message;
  }

  function paintQuote() {
    const card = mount.querySelector('.exchange');
    if (card) card.outerHTML = exchange();
  }

  async function refresh() {
    const request = ++quoteRequest;
    const range = days;
    quoteAttempt = Date.now();
    quoteStatus = 'Consultando a fonte…';
    paintQuote();
    try {
      const { quote, points } = await fetchExchange(range);
      if (request !== quoteRequest) return;
      if (quote || points.length) {
        plan = await updatePlan(db, old => ({
          ...old,
          quote: quote && (!old.quote || quote.date >= old.quote.date) ? quote : old.quote,
          history: points.length ? { ...old.history, [range]: points } : old.history
        }));
      }
      if (request !== quoteRequest) return;
      quoteStatus = [
        !quote ? 'Falha na consulta da cotação. Exibindo a última referência guardada, se houver.' : '',
        !points.length ? 'Fonte sem resposta histórica para o período. Exibindo dados guardados, se houver.' : ''
      ].filter(Boolean).join(' ');
    } catch {
      if (request !== quoteRequest) return;
      quoteStatus = 'Não foi possível atualizar a cotação.';
    }
    paintQuote();
  }

  function exchange() {
    return exchangeCard(plan, days, quoteStatus, schoolGoal, totals(plan.entries).school.balance);
  }

  function dashboard(settings) {
    const important = [
      !settings.departure ? 'Definir a data de embarque' : 'Quitar a escola até ' + dateLabel(deadline(settings.departure)),
      !plan.documents.some(item => item.category === 'Confirmação da agência') ? 'Anexar a confirmação da agência' : '',
      plan.done.length < trip.services.length ? `${trip.services.length - plan.done.length} serviços a conferir` : '',
      'Revisar a exigência de comprovação antes do embarque'
    ].filter(Boolean);
    return `<div class="section-title"><h2>Metas financeiras</h2><a href="#finance">Abrir finanças →</a></div>${goalCards(plan, settings)}
      <div class="lower-grid">${exchange()}<article class="card"><h2>Últimas movimentações</h2>${recentEntries([...plan.entries].sort(byRecent).slice(0, 4))}<a href="#finance">Registrar movimentação →</a></article></div>
      <div class="lower-grid"><article class="card"><h2>Descobertas recentes</h2><ul class="summary">${[...plan.links, ...plan.places].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0)).slice(0, 5).map(item => `<li>${escape(item.title)} · ${escape(item.status || item.category)}</li>`).join('') || '<li>Nenhuma descoberta salva.</li>'}</ul><a href="#discoveries">Abrir Minhas Descobertas →</a></article>
      <article class="card"><h2>Pendências importantes</h2><ul class="summary">${important.map(item => `<li>${escape(item)}</li>`).join('')}</ul><a href="#documents">Abrir contrato e documentos →</a></article></div>`;
  }

  function assistant() {
    return `<section class="heading"><div><h1>Assistente My Ireland</h1><p>Planeje tarefas, viagens e agradecimentos.</p></div></section>
      <form class="card" data-form="assistant"><h2>${assistantLink ? 'Analisar ' + escape(assistantLink.title) : donor ? 'Preparar agradecimento para ' + escape(donor) : 'Enviar uma pergunta'}</h2>
      <p>Ao enviar, o serviço de IA recebe a pergunta${assistantLink ? ', o link e o texto salvo' : donor ? ' e o nome do doador' : ''}, além do contexto financeiro se você optar por incluí-lo. Arquivos e histórico de movimentações ficam no navegador.</p>
      <label>Código de acesso do assistente<input name="token" type="password" required autocomplete="off"></label>
      <label>Solicitação<textarea name="prompt" maxlength="2000" required>${assistantLink ? 'Sugira itens de checklist sustentados pelo conteúdo informado. Use uma linha por item.' : donor ? 'Redija uma mensagem de agradecimento pessoal e breve, sem mencionar valores nem supor detalhes.' : ''}</textarea></label>
      <label class="inline"><input name="context" type="checkbox"> Incluir destino, contrato e saldos agregados no contexto</label>
      <button class="button">Enviar à IA</button><p data-ai-status role="status"></p><pre data-ai-result hidden></pre>
      </form>${assistantLink ? `<form class="card block" data-form="suggestions"><h2>Revisar e salvar checklist</h2><p>Edite o texto e mantenha apenas um item por linha. Depois de salvar, você pode incluir local e notas em Minhas Descobertas.</p><label>Itens revisados<textarea name="items" maxlength="4000" required></textarea></label><button class="button">Confirmar itens</button></form>` : ''}`;
  }

  mount.addEventListener('submit', async event => {
    const form = event.target;
    const type = form.dataset.form;
    if (!type) return;
    event.preventDefault();
    if (updating) return;
    const data = Object.fromEntries(new FormData(form));
    const id = form.dataset.id || crypto.randomUUID();
    const button = form.querySelector('button');
    updating = true;
    button.disabled = true;
    try {
      if (type === 'assistant') {
        const output = form.querySelector('[data-ai-status]');
        output.textContent = 'Consultando…';
        const settings = currentSettings();
        const sum = totals(plan.entries, settings.balance);
        const payload = { prompt: data.prompt };
        if (assistantLink) payload.link = { url: assistantLink.url, summary: assistantLink.summary };
        if (donor) payload.recipient = donor;
        if (data.context) payload.context = {
          trip, departure: settings.departure, city: settings.city, currency: { proof: 'BRL', school: 'EUR' },
          amountsInCents: { personalGoal: settings.goal, proofRecorded: sum.proof.balance, proofInitialKnown: settings.balance !== null, schoolReserve: sum.school.balance }
        };
        const response = await fetch('/api/assistant', {
          method: 'POST', signal: AbortSignal.timeout(32000),
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.token }, body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({ error: 'O backend do assistente está indisponível neste ambiente.' }));
        form.elements.token.value = '';
        if (!response.ok || !result.text) throw new Error(result.error || 'O assistente ficou indisponível.');
        const display = form.querySelector('[data-ai-result]');
        display.textContent = result.text;
        display.hidden = false;
        const draft = mount.querySelector('[data-form="suggestions"] textarea');
        if (draft && assistantLink?.summary.trim()) draft.value = result.text.slice(0, 4000);
        output.textContent = '';
        return;
      }

      if (type === 'restore') {
        const backup = await readBackup(data.backup);
        if (!confirm('Restaurar este backup neste navegador?')) return;
        await restorePlan(db, backup, isPristine);
        location.reload();
        return;
      }

      if (type === 'entry' && form.dataset.id && !confirm('Salvar a alteração nesta movimentação?')) return;
      if (type === 'suggestions' && !confirm('Salvar os itens revisados no checklist?')) return;
      await save((old, settings) => {
        if (type === 'reference') return { ...old, reference: parseMoney(data.reference), referenceNote: data.referenceNote.trim() };
        if (type === 'entry') {
          if (form.dataset.id && !old.entries.some(item => item.id === id)) throw new Error('Movimentação indisponível.');
          const entries = [...old.entries.filter(item => item.id !== id), movement(data, id)];
          validateLedger(entries, settings.balance);
          editing = '';
          return { ...old, entries };
        }
        if (type === 'document') {
          if (!data.file.size || data.file.size > 15 * 1024 * 1024) throw new Error('Escolha um arquivo de até 15 MB.');
          return { ...old, documents: [...old.documents, { id, category: data.category, file: data.file, date: today() }] };
        }
        if (type === 'suggestions') {
          const link = old.links.find(item => item.id === assistantLink?.id);
          if (!link) throw new Error('O link original precisa estar salvo.');
          const lines = data.items.split('\n').map(line => line.trim()).filter(Boolean);
          if (!lines.length || lines.length > 25 || lines.some(line => line.length > 160)) throw new Error('Revise até 25 itens com até 160 caracteres por linha.');
          const places = lines.map(title => ({ id: crypto.randomUUID(), title, city: '', country: '', status: visitStates[0], category: link.category, link: link.id, originalUrl: link.url, updated: Date.now() }));
          return { ...old, places: [...old.places, ...places] };
        }
        const title = data.title?.trim();
        if (!title || !categories.includes(data.category)) throw new Error('Informe um título e uma categoria.');
        const common = { id, title, category: data.category, updated: Date.now() };
        if (type === 'link') {
          const item = { ...common, url: safeUrl(data.url), summary: data.summary.trim() };
          editing = '';
          return { ...old, links: [...old.links.filter(item => item.id !== id), item] };
        }
        const linked = old.links.find(item => item.id === data.link);
        const previous = old.places.find(item => item.id === id);
        if (!visitStates.includes(data.status)) throw new Error('Escolha uma situação válida.');
        const item = { ...common, city: data.city.trim(), country: data.country.trim(), status: data.status, note: data.note.trim(),
          link: linked?.id || '', originalUrl: linked?.url || (previous && !previous.link ? previous.originalUrl : '') || '', ...coordinates(data.lat, data.lon) };
        editing = '';
        return { ...old, places: [...old.places.filter(item => item.id !== id), item] };
      });
      if (type === 'suggestions') location.hash = 'discoveries';
      status('Alteração salva neste navegador.');
    } catch (error) {
      const output = form.querySelector('[data-ai-status]');
      if (output) {
        form.elements.token.value = '';
        output.textContent = error.message;
      } else status(error.message || 'Não foi possível salvar a alteração.');
    } finally {
      updating = false;
      button.disabled = false;
    }
  });

  mount.addEventListener('click', async event => {
    const control = event.target.closest('[data-action], [data-range], [data-point]');
    if (!control) return;
    const { action, id, range, point } = control.dataset;
    try {
      if (range && Object.hasOwn(ranges, range)) {
        days = Number(range);
        await refresh();
      } else if (point !== undefined) {
        const chart = control.closest('.exchange');
        chart.querySelector('[data-quote-point]').value = point;
        chart.querySelector('[data-point-output]').textContent = pointLabel(plan.history[days][point]);
      } else if (action === 'exchange') await refresh();
      else if (action === 'analyze' || action === 'thank-ai') {
        assistantLink = action === 'analyze' ? plan.links.find(item => item.id === id) : null;
        donor = action === 'thank-ai' ? id : '';
        if (location.hash === '#assistant') render();
        else location.hash = 'assistant';
      } else if (action.startsWith('edit-') || action.startsWith('cancel-')) {
        editing = action.startsWith('edit-') ? id : '';
        render();
        if (editing) mount.querySelector(`form[data-id="${editing}"] input`)?.focus();
      } else if (action === 'download-document') {
        const file = plan.documents.find(item => item.id === id)?.file;
        if (file) download(file, file.name);
      } else if (action === 'backup') {
        const settings = await loadSettings(db);
        const saved = await loadPlan(db);
        download(await createBackup(settings, saved), `my-ireland-${today()}.json`);
      } else if (action === 'thanks') {
        await save(old => ({ ...old, thanked: { ...old.thanked, [id]: !(Object.hasOwn(old.thanked, id) && old.thanked[id]) } }));
      } else if (action.startsWith('delete-') && confirm('Excluir este registro?')) {
        const collection = { entry: 'entries', link: 'links', place: 'places', document: 'documents' }[action.slice(7)];
        await save((old, settings) => {
          const updated = { ...old, [collection]: old[collection].filter(item => item.id !== id) };
          if (collection === 'entries') validateLedger(updated.entries, settings.balance);
          if (collection === 'links') {
            const originalUrl = old.links.find(item => item.id === id)?.url;
            updated.places = old.places.map(item => item.link === id ? { ...item, link: '', originalUrl } : item);
          }
          if (editing === id) editing = '';
          return updated;
        });
      }
    } catch (error) { status(error.message || 'A ação não pôde ser concluída.'); }
  });

  mount.addEventListener('change', async event => {
    const control = event.target;
    if (control.matches('[data-category-filter]')) {
      category = control.value;
      render();
    }
    if (control.matches('[data-service]')) {
      const index = Number(control.dataset.service), checked = control.checked;
      try { await save(old => ({ ...old, done: checked ? [...new Set([...old.done, index])] : old.done.filter(item => item !== index) })); }
      catch (error) {
        control.checked = !checked;
        status(error.message);
      }
    }
  });

  mount.addEventListener('input', event => {
    if (event.target.matches('[data-quote-point]')) {
      mount.querySelector('[data-point-output]').textContent = pointLabel(plan.history[days][Number(event.target.value)]);
    }
  });
  setInterval(() => { if (mount.querySelector('.exchange') && !document.hidden) refresh(); }, 30 * 60000);

  return {
    dashboard, assistant,
    finance: settings => financePage(plan, settings, editing, exchange()),
    discoveries: () => discoveries(plan, editing, category),
    documents: settings => documents(plan, settings),
    proofBalance: settings => settings.balance === null && !plan.entries.some(item => item.goal === 'proof') ? null : totals(plan.entries, settings.balance).proof.balance,
    reset: page => {
      editing = '';
      if (page !== 'assistant') { assistantLink = null; donor = ''; }
    },
    onNavigation: () => { if (mount.querySelector('.exchange') && Date.now() - quoteAttempt > 30 * 60000) refresh(); }
  };
}
