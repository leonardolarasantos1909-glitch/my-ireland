import { categories, dateLabel, deadline, escape, money, schoolGoal, trip, visitStates } from './plan.js';

const options = (values, selected) => values.map(value => `<option ${value === selected ? 'selected' : ''}>${escape(value)}</option>`).join('');
const textField = (name, label, value, required = false) => `<label>${label}<input name="${name}" maxlength="160" value="${escape(value)}" ${required ? 'required' : ''}></label>`;
const buttons = (type, id) => `<div class="actions"><button data-action="edit-${type}" data-id="${id}">Editar</button><button data-action="delete-${type}" data-id="${id}">Excluir</button></div>`;

export function discoveries(plan, editing, filter) {
  const link = plan.links.find(item => item.id === editing);
  const place = plan.places.find(item => item.id === editing);
  const grouped = new Map();
  for (const item of plan.places.filter(item => !filter || item.category === filter)) {
    const location = [item.city, item.country].filter(Boolean).join(', ') || 'Local a definir';
    if (!grouped.has(location)) grouped.set(location, []);
    grouped.get(location).push(item);
  }
  return `<section class="heading"><div><h1>Minhas Descobertas</h1><p>Salve conteúdos e organize lugares por destino e categoria.</p></div></section>
    <form class="card block" data-form="link" data-id="${link?.id ?? ''}"><h2>${link ? 'Editar link' : 'Salvar link'}</h2><div class="form-grid">
    ${textField('title', 'Título', link?.title, true)}
    <label>URL do YouTube, Instagram ou outro site<input name="url" type="url" required value="${escape(link?.url)}"></label>
    <label>Categoria<select name="category">${options(categories, link?.category)}</select></label>
    <label>Descrição, resumo ou transcrição autorizada<textarea name="summary" maxlength="12000">${escape(link?.summary)}</textarea></label></div>
    <button class="button">Salvar link</button>${link ? '<button type="button" data-action="cancel-edit">Cancelar</button>' : ''}</form>
    <article class="card block"><h2>Links salvos</h2>${plan.links.length ? `<ul class="records">${[...plan.links].reverse().map(item => `<li><div><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer"><strong>${escape(item.title)} ↗</strong></a><p>${escape(item.category)}</p></div>
    <div class="actions"><button data-action="analyze" data-id="${item.id}">Sugerir checklist com IA</button>${buttons('link', item.id)}</div></li>`).join('')}</ul>` : '<p>Nenhum link salvo.</p>'}</article>
    <form class="card block" data-form="place" data-id="${place?.id ?? ''}"><h2>${place ? 'Editar item' : 'Adicionar ao checklist'}</h2><div class="form-grid">
    ${textField('title', 'Lugar ou tarefa', place?.title, true)}${textField('city', 'Cidade', place?.city)}${textField('country', 'País', place?.country)}
    <label>Categoria<select name="category">${options(categories, place?.category)}</select></label>
    <label>Situação<select name="status">${options(visitStates, place?.status)}</select></label>
    <label>Link original<select name="link"><option value="">Sem vínculo</option>${plan.links.map(item => `<option value="${item.id}" ${item.id === place?.link ? 'selected' : ''}>${escape(item.title)}</option>`).join('')}</select></label>
    <label>Latitude verificada<input name="lat" type="number" step="any" min="-90" max="90" value="${escape(place?.lat)}"></label>
    <label>Longitude verificada<input name="lon" type="number" step="any" min="-180" max="180" value="${escape(place?.lon)}"></label>
    <label>Notas pessoais<textarea name="note" maxlength="1000">${escape(place?.note)}</textarea></label></div>
    <button class="button">Salvar item</button>${place ? '<button type="button" data-action="cancel-edit">Cancelar</button>' : ''}</form>
    <article class="card block"><h2>Checklist por destino</h2><label>Filtrar por categoria<select data-category-filter><option value="">Todas</option>${options(categories, filter)}</select></label>
    ${grouped.size ? [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([location, items]) => `<h3>${escape(location)}</h3><ul class="records">${items.map(item => {
      const url = plan.links.find(link => link.id === item.link)?.url || item.originalUrl;
      return `<li><div><strong>${escape(item.title)}</strong><p>${escape(item.category)} · ${escape(item.status)}${item.note ? ' · ' + escape(item.note) : ''}</p>
      ${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">Conteúdo original ↗</a>` : ''}
      ${item.lat != null ? `<a href="https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=16/${item.lat}/${item.lon}" target="_blank" rel="noopener noreferrer">Ver no mapa ↗</a>` : ''}</div>${buttons('place', item.id)}</li>`;
    }).join('')}</ul>`).join('') : '<p>Nenhum item nesta seleção.</p>'}</article>`;
}

export function documents(plan, settings) {
  return `<section class="heading"><div><h1>Meu contrato e documentos</h1><p>Contrato assinado em janeiro de 2025 com a Love Intercâmbios.</p></div></section>
    <div class="lower-grid"><article class="card"><h2>Contrato · ${trip.school}</h2><p>${trip.course} · 25 semanas de General English e 2 meses de férias.</p>
    <dl><dt>Valor contratado</dt><dd>${money(trip.total, 'EUR')}</dd><dt>Entrada paga</dt><dd>${money(trip.paid, 'EUR')}</dd><dt>Saldo contratual</dt><dd>${money(schoolGoal, 'EUR')}</dd><dt>Prazo de quitação</dt><dd>Até 30 dias antes do embarque${settings.departure ? ' · ' + dateLabel(deadline(settings.departure)) : ' · Data ainda indefinida'}</dd></dl>
    <div class="hint">Confirmação informada pelo usuário após a assinatura. A agência confirmou que o contrato continua válido até o embarque e que o preço contratado será mantido. Anexe a evidência abaixo.</div></article>
    <article class="card"><h2>Serviços contratados</h2><p>Marque os serviços que já conferiu.</p><ul class="checklist">${trip.services.map((service, index) => `<li><label><input data-service="${index}" type="checkbox" ${plan.done.includes(index) ? 'checked' : ''}>${escape(service)}</label></li>`).join('')}</ul></article></div>
    <form class="card block" data-form="document"><h2>Anexar documento</h2><div class="form-grid"><label>Tipo<select name="category"><option>Contrato original</option><option>Confirmação da agência</option><option>Comprovante</option><option>Outro</option></select></label>
    <label>PDF ou outro arquivo, até 15 MB<input name="file" type="file" required></label></div><button class="button">Guardar neste navegador</button></form>
    <article class="card block"><h2>Arquivos guardados</h2>${plan.documents.length ? `<ul class="records">${plan.documents.map(item => `<li><div><strong>${escape(item.file.name)}</strong><p>${escape(item.category)} · ${dateLabel(item.date)}</p></div><div class="actions"><button data-action="download-document" data-id="${item.id}">Baixar</button><button data-action="delete-document" data-id="${item.id}">Excluir</button></div></li>`).join('')}</ul>` : '<p>Nenhum documento anexado.</p>'}</article>`;
}
