import './style.css';
import { parseMoney, projection, daysUntil } from './domain.js';
import { openDatabase, loadSettings, saveSettings } from './db.js';

const app = document.querySelector('#app');
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let db, settings, page = 'dashboard';
const nav = [['dashboard', '◫', 'Visão geral'], ['cities', '⌖', 'Explorar cidades'], ['guide', '✧', 'Meu planejamento'], ['settings', '⚙', 'Configurações']];
function render() {
  app.innerHTML = `<aside><a class="brand" href="#dashboard"><span class="brand-mark">♧</span> my ireland<span class="brand-dot">.</span></a><div class="nav-label">SEU INTERCÂMBIO</div><nav>${nav.map(([id, icon, label]) => `<a href="#${id}" class="${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''}><span>${icon}</span>${label}</a>`).join('')}</nav><div class="sidebar-note"><span>UM PASSO DE CADA VEZ</span><p>Seu próximo capítulo<br>começa no planejamento.</p><div class="clover">♧</div></div><div class="profile"><span class="avatar">MI</span><div>Meu espaço pessoal<small>Brasil → Irlanda</small></div></div></aside><main><header><span>MEU INTERCÂMBIO <b>/ ${escape(nav.find(x => x[0] === page)[2])}</b></span><span class="private">● Espaço pessoal</span></header><div class="content">${page === 'dashboard' ? dashboard() : page === 'settings' ? settingsPage() : page === 'cities' ? citiesPage() : guidePage()}<footer>Feito para transformar planos em possibilidades.<span>MY IRELAND · BRL / EUR</span></footer></div></main><div id="notice" role="status" aria-live="polite"></div>`;
  document.querySelector('#settings-form')?.addEventListener('submit', handleSave);
  document.querySelector('#simulate')?.addEventListener('click', () => {
    const p = projection({ ...settings, balance: 0 });
    document.querySelector('#simulation').textContent = p.months === null ? 'Cenário hipotético começando do zero: sem poupança mensal, não há previsão para atingir a meta.' : `Cenário hipotético começando do zero: ${p.months} meses com ${money(settings.monthly)} por mês. Não inclui rendimentos, inflação ou variação cambial.`;
  });
}
function dashboard() {
  const p = projection(settings), days = daysUntil(settings.departure);
  return `<section class="heading"><div><div class="eyebrow">O SEU FUTURO ESTÁ EM CONSTRUÇÃO</div><h1>Um novo capítulo espera por você<span>.</span></h1><p>Organize seus planos e dê o próximo passo rumo à Irlanda.</p></div><a class="button secondary" href="#settings">⚙ Personalizar plano</a></section>
  <section class="hero"><div><span class="tag">BRASIL → IRLANDA</span><h2>Grandes jornadas começam<br>com pequenos passos.</h2><p>Um plano que respeita o seu tempo.<br>Uma conquista de cada vez.</p><a class="button light" href="#settings">Planejar minha jornada <span>↗</span></a></div><div class="landscape" aria-hidden="true"><div class="sun"></div><div class="hill back"></div><div class="hill front"></div><div class="house"><i></i><b></b></div><div class="path"></div><span class="landscape-label">YOUR NEXT CHAPTER</span></div></section>
  <section class="section-title"><h2>Seu plano financeiro</h2><span>Valores em reais · BRL</span></section><section class="stats"><article class="card"><span class="stat-icon">◎</span><p>Meta financeira</p><h3>${money(settings.goal)}</h3><small>O destino do seu planejamento</small></article><article class="card"><span class="stat-icon">↗</span><p>Economia mensal planejada</p><h3>${money(settings.monthly)}</h3><small>Um compromisso com o seu futuro</small></article><article class="card"><span class="stat-icon">▤</span><p>Total economizado</p><h3 class="${p ? '' : 'unknown'}">${p ? money(settings.balance) : 'Ainda não informado'}</h3><a href="#settings">${p ? 'Atualizar saldo' : 'Informar meu saldo'} →</a></article></section>
  <section class="lower-grid"><article class="card progress-card"><div class="section-title"><h2>Cada passo conta</h2><span class="pill">Sua meta</span></div><div class="progress-number">${p ? p.progress + '%' : 'Ainda não calculado'}</div><div class="track" role="progressbar" aria-label="Progresso financeiro" ${p ? `aria-valuenow="${p.progress}" aria-valuemin="0" aria-valuemax="100"` : 'aria-valuetext="Saldo ainda não informado"'}><div style="width:${p?.progress ?? 0}%"></div></div><div class="progress-caption"><span>${p ? 'Valor restante' : 'Aguardando saldo inicial'}</span><strong>${p ? money(p.remaining) : '—'}</strong></div><div class="hint">${!p ? 'Informe quanto você já economizou para acompanhar seu progresso.' : p.months === null ? 'Cadastre uma poupança mensal maior que zero para calcular uma projeção.' : `Projeção: ${p.months} meses para atingir a meta, mantendo ${money(settings.monthly)}/mês. Sem rendimentos, inflação ou variação cambial.`}</div></article><article class="card journey"><div class="section-title"><h2>Seu próximo destino</h2><span>⌖</span></div><div class="journey-row"><span class="round-icon">⌖</span><div><small>CIDADE NA IRLANDA</small><p>${escape(settings.city || 'Cidade ainda não escolhida')}</p><a href="#cities">Explorar possibilidades →</a></div></div><div class="journey-row"><span class="round-icon">▦</span><div><small>DATA DE EMBARQUE</small><p>${settings.departure ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(settings.departure + 'T12:00:00Z')) : 'Data de embarque não definida'}</p>${days === null ? '<small>Você pode decidir no seu tempo.</small>' : `<small>${days > 0 ? `Faltam ${days} dias` : days === 0 ? 'O embarque é hoje' : `Data há ${Math.abs(days)} dias`}</small>`}</div></div></article></section><a href="#guide" class="planning-banner"><span class="round-icon">✧</span><div><h3>Clareza para o seu próximo passo</h3><p>Veja orientações baseadas no que você já planejou.</p></div><span>→</span></a>`;
}
function settingsPage() {
  const decimal = n => (n / 100).toFixed(2);
  return `<section class="heading"><div><div class="eyebrow">UM PLANO DO SEU JEITO</div><h1>Suas configurações<span>.</span></h1><p>Você decide as metas. Cada alteração depende da sua confirmação.</p></div></section><form id="settings-form" class="card form-card"><h2>Planejamento pessoal</h2><div class="form-grid"><label>Meta financeira (BRL)<input name="goal" inputmode="decimal" required value="${decimal(settings.goal)}"></label><label>Poupança mensal planejada (BRL)<input name="monthly" inputmode="decimal" required value="${decimal(settings.monthly)}"></label><label>Saldo atual confirmado (BRL)<input name="balance" inputmode="decimal" placeholder="Ainda não informado" value="${settings.balance === null ? '' : decimal(settings.balance)}"><small>Deixe em branco se desconhecido. Zero é um saldo confirmado.</small></label><label>Data de embarque<input name="departure" type="date" value="${settings.departure || ''}"><small>Opcional. Nenhuma data será presumida.</small></label><label>Cidade de destino<input name="city" maxlength="80" list="cities" placeholder="Cidade ainda não escolhida" value="${escape(settings.city || '')}"><datalist id="cities"><option>Dublin</option><option>Cork</option><option>Galway</option><option>Limerick</option></datalist></label></div><div class="hint">Português (Brasil) · BRL / EUR · America/Sao_Paulo<br>Seus dados ficam no banco local deste navegador. Não há sincronização entre dispositivos; limpar os dados do site apaga o planejamento.</div><p id="form-error" role="alert"></p><button class="button" type="submit">Confirmar e salvar alterações</button></form>`;
}
function citiesPage() {
  return `<section class="heading"><div><div class="eyebrow">DESCUBRA POSSIBILIDADES</div><h1>Onde começa seu capítulo<span>?</span></h1><p>Compare características gerais. Os custos precisam ser pesquisados antes da decisão.</p></div></section><section class="city-grid">${[['Dublin','A capital irlandesa','Maior centro urbano do país; uma opção para pesquisar escolas, conexões e vida cultural.'],['Cork','No sul da Irlanda','Uma cidade universitária para conhecer e incluir na sua pesquisa de intercâmbio.'],['Galway','Na costa oeste','Uma opção para explorar a cultura local e pesquisar oportunidades de estudo.']].map(([city, subtitle, text], i) => `<article class="card city-card"><div class="city-art city-${i}" aria-hidden="true">${['⌂','♧','≈'][i]}</div><div><span class="eyebrow">${subtitle}</span><h2>${city}</h2><p>${text}</p><small>Custos de moradia, escola e transporte: ainda não pesquisados.</small></div></article>`).join('')}</section><article class="card"><h2>Compare antes de escolher</h2><div class="table-wrap"><table><thead><tr><th>Critério</th><th>Dublin</th><th>Cork</th><th>Galway</th></tr></thead><tbody>${['Curso e escola','Moradia disponível','Custo mensal verificado','Transporte'].map(label => `<tr><th>${label}</th><td>A pesquisar</td><td>A pesquisar</td><td>A pesquisar</td></tr>`).join('')}</tbody></table></div><p>Nenhuma cidade é escolhida automaticamente. Você também pode cadastrar outra cidade.</p><a class="button" href="#settings">Definir meu destino →</a></article>`;
}
function guidePage() {
  const p = projection(settings);
  return `<section class="heading"><div><div class="eyebrow">CLAREZA PARA SEGUIR EM FRENTE</div><h1>Seu planejamento<span>.</span></h1><p>Orientações locais baseadas nos seus dados, sem inteligência artificial conectada.</p></div></section><article class="card guide"><span class="stat-icon">✧</span><h2>Vamos organizar o próximo passo</h2><p>Sua meta confirmada é ${money(settings.goal)} e a poupança mensal planejada é ${money(settings.monthly)}.</p><p>${p ? `Seu saldo informado é ${money(settings.balance)}. Faltam ${money(p.remaining)} para a meta.` : 'Seu saldo ainda não foi informado. Cadastre-o para calcular quanto falta e acompanhar seu progresso.'}</p><p>${settings.city ? `Destino cadastrado: ${escape(settings.city)}.` : 'A cidade ainda não foi definida. Compare escolas, moradia e transporte usando fontes atualizadas antes de escolher.'} ${settings.departure ? 'A data de embarque está cadastrada no seu plano.' : 'A data de embarque também permanece em aberto.'}</p><div class="hint">Comece pelo saldo confirmado, revise quanto consegue guardar por mês e pesquise os custos reais do intercâmbio. Não há despesas, reservas ou taxas de câmbio presumidas.</div><h3>Explorar uma hipótese</h3><p>Uma simulação não altera seu saldo, sua meta ou sua poupança mensal.</p><button class="button secondary" id="simulate">Simular começando do zero</button><p id="simulation" role="status"></p><a href="#settings">Atualizar meus dados →</a></article>`;
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
function navigate() {
  page = nav.some(x => x[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  render();
  window.scrollTo(0, 0);
}
async function initialize() {
try {
  db = await openDatabase();
  settings = await loadSettings(db);
  window.addEventListener('hashchange', navigate);
  navigate();
} catch {
  app.innerHTML = '<main class="startup-error"><h1>Não foi possível abrir seu planejamento.</h1><p>Permita o armazenamento local no navegador e recarregue a página. Seus dados existentes não foram substituídos.</p><button onclick="location.reload()">Tentar novamente</button></main>';
}

}
initialize();
