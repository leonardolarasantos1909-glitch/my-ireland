import './style.css';
import { parseMoney, projection, daysUntil } from './domain.js';
import { openDatabase, loadSettings, saveSettings } from './db.js';
import { createWorkspace } from './workspace.js';
import { money, escape, trip } from './plan.js';

const app = document.querySelector('#app');
let db, settings, workspace, page = 'dashboard';
const nav = [
  ['dashboard', 'Visão geral', 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
  ['finance', 'Finanças', 'M3 6h18v13H3z M3 10h18 M7 15h4'],
  ['discoveries', 'Minhas Descobertas', 'M6 4h12v16l-6-4-6 4z'],
  ['documents', 'Contrato e documentos', 'M5 3h9l5 5v13H5z M14 3v5h5 M8 13h8 M8 17h6'],
  ['assistant', 'Assistente', 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z'],
  ['cities', 'Explorar cidades', 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z M14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z'],
  ['guide', 'Meu planejamento', 'M5 5h14v16H5z M5 9h14 M8 3v4 M16 3v4 M8 15l2 2 5-5'],
  ['settings', 'Configurações', 'M4 6h16 M4 12h16 M4 18h16 M8 4v4 M15 10v4 M10 16v4']
];

const pages = {
  dashboard, settings: settingsPage, cities: citiesPage, guide: guidePage,
  finance: () => workspace.finance(settings), discoveries: () => workspace.discoveries(),
  documents: () => workspace.documents(settings), assistant: () => workspace.assistant()
};
function render() {
  const currentLabel = nav.find(([id]) => id === page)[1];
  app.innerHTML = `
    <button type="button" class="skip-link" id="skip-content">Ir para o conteúdo</button>
    <aside class="sidebar">
      <a class="brand" href="#dashboard"><span class="brand-mark" aria-hidden="true">MI</span>My Ireland</a>
      <nav aria-label="Navegação principal">
        ${nav.map(([id, label, path]) => `<a href="#${id}" ${page === id ? 'aria-current="page"' : ''}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg><span>${label}</span>
        </a>`).join('')}
      </nav>
    </aside>
    <main id="main-content" tabindex="-1">
      <div class="content">
        <header class="page-context">${currentLabel}</header>
        ${pages[page]()}
      </div>
    </main>
    <div id="notice" role="status" aria-live="polite"></div>`;
  document.querySelector('#skip-content').addEventListener('click', () => document.querySelector('#main-content').focus());
  document.querySelector('#settings-form')?.addEventListener('submit', handleSave);
  document.querySelector('#simulate')?.addEventListener('click', () => {
    const p = projection({ ...settings, balance: 0 });
    document.querySelector('#simulation').textContent = p.months === null ? 'Cenário hipotético começando do zero: sem poupança mensal, não há previsão para atingir a meta.' : `Cenário hipotético começando do zero: ${p.months} meses com ${money(settings.monthly)} por mês. Não inclui rendimentos, inflação ou variação cambial.`;
  });
}
function dashboard() {
  const days = daysUntil(settings.departure);
  return `<section class="heading dashboard-heading">
    <div><h1>My Ireland<span>.</span></h1><p>${escape(settings.city || 'Destino a confirmar')}, Irlanda · ${trip.school} · ${trip.agency}</p></div>
    <a class="button secondary" href="#settings">Personalizar plano</a>
  </section>
  <section class="hero" aria-labelledby="departure-period">
    <div>
      <span class="tag">Brasil → Irlanda</span>
      <h2 id="departure-period">${trip.period}</h2>
      <p>${settings.departure ? 'Embarque em ' + settings.departure.split('-').reverse().join('/') + (days > 0 ? ' · Faltam ' + days + ' dias' : '') : 'Data exata de embarque indefinida.'}</p>
    </div>
    <div class="hero-details">
      <p><strong>${trip.course}</strong><br>25 semanas de General English e 2 meses de férias.<br>Passagem aérea como presente da minha mãe, sem despesa própria prevista.</p>
      <a class="button highlight" href="#documents">Ver meu contrato <span aria-hidden="true">↗</span></a>
    </div>
  </section>
  ${workspace.dashboard(settings)}`;
}
function settingsPage() {
  const decimal = n => (n / 100).toFixed(2);
  return `<section class="heading"><div><h1>Suas configurações<span>.</span></h1><p>Você decide as metas. Cada alteração depende da sua confirmação.</p></div></section><form id="settings-form" class="card form-card"><h2>Planejamento pessoal</h2><div class="form-grid"><label>Meta financeira (BRL)<input name="goal" inputmode="decimal" required value="${decimal(settings.goal)}"></label><label>Poupança mensal para simulação (BRL)<input name="monthly" inputmode="decimal" required value="${decimal(settings.monthly)}"></label><label>Saldo inicial fora do histórico (BRL)<input name="balance" inputmode="decimal" placeholder="Ainda não informado" value="${settings.balance === null ? '' : decimal(settings.balance)}"><small>As movimentações são somadas a este saldo. Deixe em branco se o saldo inicial for desconhecido.</small></label><label>Data de embarque<input name="departure" type="date" value="${settings.departure || ''}"><small>Opcional. Nenhuma data será presumida.</small></label><label>Cidade de destino<input name="city" maxlength="80" list="cities" placeholder="Cidade ainda não escolhida" value="${escape(settings.city || '')}"><datalist id="cities"><option>Dublin</option><option>Cork</option><option>Galway</option><option>Limerick</option></datalist></label></div><div class="hint">Português (Brasil) · BRL / EUR · America/Sao_Paulo<br>Seus dados ficam no banco deste navegador. Faça backup antes de limpar os dados do site. Cada navegador e endereço tem seu próprio armazenamento.</div><p id="form-error" role="alert"></p><button class="button" type="submit">Confirmar e salvar alterações</button></form><article class="card block"><h2>Exportar backup</h2><p>O arquivo inclui configurações, movimentações, nomes, descobertas e anexos. Guarde-o em um local privado.</p><button class="button secondary" data-action="backup">Baixar backup JSON</button></article><form class="card block" data-form="restore"><h2>Restaurar backup</h2><p>Use um navegador sem planejamento cadastrado para preservar seus dados atuais.</p><label>Arquivo de backup JSON<input name="backup" type="file" accept=".json,application/json" required></label><button class="button secondary">Restaurar</button></form>`;
}
function citiesPage() {
  return `<section class="heading"><div><h1>Onde começa seu capítulo<span>?</span></h1><p>Compare características gerais. Os custos precisam ser pesquisados antes da decisão.</p></div></section><section class="city-grid">${[['Dublin','A capital irlandesa','Maior centro urbano do país; uma opção para pesquisar escolas, conexões e vida cultural.'],['Cork','No sul da Irlanda','Uma cidade universitária para conhecer e incluir na sua pesquisa de intercâmbio.'],['Galway','Na costa oeste','Uma opção para explorar a cultura local e pesquisar oportunidades de estudo.']].map(([city, subtitle, text], i) => `<article class="card city-card"><div class="city-art city-${i}" aria-hidden="true">${['⌂','♧','≈'][i]}</div><div><span class="eyebrow">${subtitle}</span><h2>${city}</h2><p>${text}</p><small>Custos de moradia, escola e transporte: ainda não pesquisados.</small></div></article>`).join('')}</section><article class="card"><h2>Compare antes de escolher</h2><div class="table-wrap"><table><thead><tr><th>Critério</th><th>Dublin</th><th>Cork</th><th>Galway</th></tr></thead><tbody>${['Curso e escola','Moradia disponível','Custo mensal verificado','Transporte'].map(label => `<tr><th>${label}</th><td>A pesquisar</td><td>A pesquisar</td><td>A pesquisar</td></tr>`).join('')}</tbody></table></div><p>Você pode editar seu destino nas configurações.</p><a class="button" href="#settings">Definir meu destino →</a></article>`;
}
function guidePage() {
  const balance = workspace.proofBalance(settings);
  const p = projection({ ...settings, balance });
  return `<section class="heading"><div><h1>Seu planejamento<span>.</span></h1><p>Orientações locais baseadas nos seus dados.</p></div></section><article class="card guide"><span class="stat-icon">✧</span><h2>Vamos organizar o próximo passo</h2><p>Sua meta confirmada é ${money(settings.goal)} e a poupança mensal planejada é ${money(settings.monthly)}.</p><p>${p ? `Seu saldo informado é ${money(balance)}. Faltam ${money(p.remaining)} para a meta.` : 'Seu saldo ainda não foi informado. Cadastre-o para calcular quanto falta e acompanhar seu progresso.'}</p><p>${settings.city ? `Destino cadastrado: ${escape(settings.city)}.` : 'A cidade ainda não foi definida. Compare escolas, moradia e transporte usando fontes atualizadas antes de escolher.'} ${settings.departure ? 'A data de embarque está cadastrada no seu plano.' : 'A data de embarque também permanece em aberto.'}</p><div class="hint">Comece pelo saldo confirmado, revise quanto consegue guardar por mês e pesquise os custos reais do intercâmbio. Não há despesas, reservas ou taxas de câmbio presumidas.</div><h3>Explorar uma hipótese</h3><p>Uma simulação não altera seu saldo, sua meta ou sua poupança mensal.</p><button class="button secondary" id="simulate">Simular começando do zero</button><p id="simulation" role="status"></p><a href="#settings">Atualizar meus dados →</a></article>`;
}
async function handleSave(event) {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form), button = form.querySelector('button');
  button.disabled = true;
  try {
    const next = { ...settings, goal: parseMoney(data.get('goal')), monthly: parseMoney(data.get('monthly')), balance: data.get('balance').trim() === '' ? null : parseMoney(data.get('balance')), departure: data.get('departure') || null, city: data.get('city').trim() || null };
    await saveSettings(db, next);
    settings = next;
    render();
    document.querySelector('#notice').textContent = 'Planejamento salvo neste navegador.';
  } catch (error) {
    document.querySelector('#form-error').textContent = error.message;
    button.disabled = false;
  }
}
function navigate(event) {
  page = nav.some(x => x[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  workspace.reset(page);
  render();
  workspace.onNavigation();
  if (event) document.querySelector('#main-content').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
async function initialize() {
try {
  db = await openDatabase();
  settings = await loadSettings(db);
  workspace = await createWorkspace(db, app, () => settings, render);
  window.addEventListener('hashchange', navigate);
  navigate();
} catch {
  app.innerHTML = '<main class="startup-error"><h1>Não foi possível abrir seu planejamento.</h1><p>Permita o armazenamento local no navegador e recarregue a página. Seus dados existentes não foram substituídos.</p><button onclick="location.reload()">Tentar novamente</button></main>';
}

}
initialize();
