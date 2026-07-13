/* ══════════════════════════════════════════════════════════════════
   Registro de Produção Diária
   ══════════════════════════════════════════════════════════════════ */

let productionFilters = { techId:'', dataIni:'', dataFim:'' };

function renderProductionView(state){
  const root = $('#view-production');
  if(!root) return;
  root.innerHTML = `
    <div class="view-head">
      <div><h1>Produção Diária</h1><p class="text-2">Registro de OS, instalações, reparos e revisitas por técnico.</p></div>
      <div class="view-actions">
        ${Auth.can('edit_producao') || Auth.can('edit') ? `<button class="btn btn-primary" id="btn-new-prod"><span class="material-symbols-rounded icon">add_task</span>Lançar Produção</button>` : ''}
      </div>
    </div>
    <div class="filters-bar">
      <label>Técnico</label>
      <select id="pf-tech"><option value="">Todos</option>${state.technicians.map(t=>`<option value="${t.id}" ${productionFilters.techId===t.id?'selected':''}>${t.name}</option>`).join('')}</select>
      <label>De</label><input type="date" id="pf-ini" value="${productionFilters.dataIni}">
      <label>Até</label><input type="date" id="pf-fim" value="${productionFilters.dataFim}">
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Técnico</th><th>OS</th><th>Instalações</th><th>Reparos</th><th>Mudanças</th><th>Retiradas</th><th>Revisitas</th><th>Consultivos</th><th>Tempo Médio</th><th>Deslocamento</th></tr></thead>
          <tbody id="prod-table-body"></tbody>
        </table>
      </div>
    </div>
  `;
  $('#pf-tech').onchange = e => { productionFilters.techId = e.target.value; renderProductionTable(state); };
  $('#pf-ini').onchange = e => { productionFilters.dataIni = e.target.value; renderProductionTable(state); };
  $('#pf-fim').onchange = e => { productionFilters.dataFim = e.target.value; renderProductionTable(state); };
  if($('#btn-new-prod')) $('#btn-new-prod').onclick = () => openProductionModal(state);
  renderProductionTable(state);
}

function renderProductionTable(state){
  const tbody = $('#prod-table-body');
  if(!tbody) return;
  let rows = [...state.production].sort((a,b)=>b.data.localeCompare(a.data));
  if(productionFilters.techId) rows = rows.filter(p=>p.techId===productionFilters.techId);
  if(productionFilters.dataIni) rows = rows.filter(p=>p.data >= productionFilters.dataIni);
  if(productionFilters.dataFim) rows = rows.filter(p=>p.data <= productionFilters.dataFim);
  rows = rows.slice(0, 200);
  tbody.innerHTML = rows.map(p => {
    const t = state.technicians.find(x=>x.id===p.techId);
    return `<tr>
      <td>${fmtDate(p.data)}</td><td>${escapeHtml(t?.name||'—')}</td><td><b>${p.os}</b></td>
      <td>${p.instalacoes}</td><td>${p.reparos}</td><td>${p.mudancas}</td><td>${p.retiradas}</td>
      <td>${p.revisitas}</td><td>${p.consultivos}</td><td>${p.tempoMedioMin} min</td><td>${p.deslocamentoMin} min</td>
    </tr>`;
  }).join('') || `<tr><td colspan="11"><div class="empty-state"><span class="material-symbols-rounded icon">assignment</span><span>Nenhum lançamento no período.</span></div></td></tr>`;
}

function openProductionModal(state){
  const body = `
    <div class="field"><label>Técnico</label><select id="p-tech">${state.technicians.filter(t=>t.situacao!=='Desligado').map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
    <div class="field"><label>Data</label><input type="date" id="p-data" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field-row">
      <div class="field"><label>Quantidade de OS</label><input type="number" min="0" id="p-os" value="0"></div>
      <div class="field"><label>Instalações</label><input type="number" min="0" id="p-inst" value="0"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Reparos</label><input type="number" min="0" id="p-rep" value="0"></div>
      <div class="field"><label>Mudanças</label><input type="number" min="0" id="p-mud" value="0"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Retiradas</label><input type="number" min="0" id="p-ret" value="0"></div>
      <div class="field"><label>Revisitas</label><input type="number" min="0" id="p-rev" value="0"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Consultivos</label><input type="number" min="0" id="p-cons" value="0"></div>
      <div class="field"><label>Tempo Médio (min)</label><input type="number" min="0" id="p-tempo" value="60"></div>
    </div>
    <div class="field"><label>Tempo de Deslocamento (min)</label><input type="number" min="0" id="p-desl" value="20"></div>
    <div class="field"><label>Observações</label><textarea id="p-obs"></textarea></div>
  `;
  openModal('Lançar Produção Diária', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Salvar', className:'btn-primary', onClick: () => submitProductionForm(state) },
  ]);
}

function submitProductionForm(state){
  const techId = $('#p-tech').value;
  const data = $('#p-data').value;
  if(!techId || !data){ toast('Selecione técnico e data.', 'error'); return; }
  const entry = {
    id: `${techId}-${data}-${Date.now().toString(36)}`,
    techId, data,
    os: +$('#p-os').value || 0, instalacoes: +$('#p-inst').value || 0, reparos: +$('#p-rep').value || 0,
    mudancas: +$('#p-mud').value || 0, retiradas: +$('#p-ret').value || 0, revisitas: +$('#p-rev').value || 0,
    consultivos: +$('#p-cons').value || 0, tempoMedioMin: +$('#p-tempo').value || 0, deslocamentoMin: +$('#p-desl').value || 0,
    observacoes: $('#p-obs').value.trim(),
  };
  state.production.unshift(entry);
  const t = state.technicians.find(x=>x.id===techId);
  logAudit(state, { entidade:'producao', entidadeId:techId, campo:'lancamento', antes:null, depois:`${entry.os} OS em ${fmtDate(data)}`, motivo:'Lançamento diário' });
  closeModal();
  Sync.scheduleSave(state);
  renderProductionView(state);
  refreshGlobalWidgets(state);
  toast(`Produção de ${t?.name||''} registrada.`, 'success');
}
