/* ══════════════════════════════════════════════════════════════════
   Plantões e Escalas
   Regra: plantão ocorre apenas aos domingos e feriados, com 2 técnicos
   escalados por dia; quem trabalha no plantão recebe uma folga
   compensatória em outro dia (ver generateShiftsSchedule em data.js).
   ══════════════════════════════════════════════════════════════════ */

function renderShiftsView(state){
  const root = $('#view-shifts');
  if(!root) return;
  const todayStr = new Date().toISOString().slice(0,10);
  const upcoming = state.shifts.filter(s => s.data >= todayStr).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,80);

  root.innerHTML = `
    <div class="view-head">
      <div><h1>Plantões e Escalas</h1><p class="text-2">Plantão ocorre apenas aos domingos e feriados, sempre com 2 técnicos escalados; cada um recebe uma folga compensatória em outro dia.</p></div>
      <div class="view-actions">
        ${Auth.can('edit') || Auth.can('edit_producao') ? `<button class="btn btn-secondary" id="btn-gen-shift"><span class="material-symbols-rounded icon">auto_fix_high</span>Gerar Escala Automática</button>` : ''}
        ${Auth.can('edit') || Auth.can('edit_producao') ? `<button class="btn btn-primary" id="btn-new-shift"><span class="material-symbols-rounded icon">event_available</span>Nova Escala</button>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Dia</th><th>Técnico</th><th>Escala</th><th>Troca</th><th>Cobertura</th><th class="text-right">Ações</th></tr></thead>
        <tbody id="shifts-table-body"></tbody>
      </table></div>
    </div>
  `;
  if($('#btn-new-shift')) $('#btn-new-shift').onclick = () => openShiftModal(state);
  if($('#btn-gen-shift')) $('#btn-gen-shift').onclick = () => regenerateShifts(state);
  renderShiftsTable(state, upcoming);
}

const WEEKDAY_LABELS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function renderShiftsTable(state, rows){
  const tbody = $('#shifts-table-body');
  if(!tbody) return;
  tbody.innerHTML = rows.map(s => {
    const t = state.technicians.find(x=>x.id===s.techId);
    const date = new Date(s.data+'T00:00:00');
    const color = s.escala === 'Plantão' ? 'amber' : s.escala === 'Folga' ? 'green' : 'blue';
    const feriado = isNationalHoliday(date);
    return `<tr>
      <td>${fmtDate(s.data)}</td>
      <td class="text-2">${WEEKDAY_LABELS[date.getDay()]}${feriado ? ' <span class="chip status-red" style="padding:1px 6px">Feriado</span>' : ''}</td>
      <td>${escapeHtml(t?.name||'—')}</td>
      <td><span class="chip status-${color==='blue'?'green':color}">${escapeHtml(s.escala)}</span></td>
      <td class="text-2">${escapeHtml(s.troca||'—')}</td><td class="text-2">${escapeHtml(s.cobertura||'—')}</td>
      <td class="text-right">${Auth.can('edit') || Auth.can('edit_producao') ? `<button class="btn btn-sm btn-ghost" onclick="openShiftModal(State,'${s.id}')">Editar</button>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty-state"><span class="material-symbols-rounded icon">event_busy</span><span>Nenhuma escala futura.</span></div></td></tr>`;
}

function openShiftModal(state, shiftId=null){
  const shift = shiftId ? state.shifts.find(s=>s.id===shiftId) : null;
  const body = `
    <div class="field"><label>Técnico</label><select id="s-tech">${state.technicians.filter(t=>t.situacao!=='Desligado').map(t=>`<option value="${t.id}" ${shift?.techId===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div>
    <div class="field-row">
      <div class="field"><label>Data</label><input type="date" id="s-data" value="${shift?.data || new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>Escala</label>
        <select id="s-escala">${['Comercial','Plantão','Folga'].map(e=>`<option ${shift?.escala===e?'selected':''}>${e}</option>`).join('')}</select>
      </div>
    </div>
    <p class="text-3" style="font-size:11px; margin:-6px 0 12px">Plantão só deveria ocorrer aos domingos/feriados. Ao salvar um Plantão, uma folga compensatória é criada automaticamente no dia seguinte para o técnico.</p>
    <div class="field"><label>Troca (com quem)</label><input id="s-troca" value="${escapeHtml(shift?.troca||'')}"></div>
    <div class="field"><label>Cobertura</label><input id="s-cobertura" value="${escapeHtml(shift?.cobertura||'')}"></div>
  `;
  openModal(shift ? 'Editar Escala' : 'Nova Escala', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Salvar', className:'btn-primary', onClick: () => submitShiftForm(state, shiftId) },
  ]);
}

function submitShiftForm(state, shiftId){
  const techId = $('#s-tech').value, data = $('#s-data').value, escala = $('#s-escala').value;
  const troca = $('#s-troca').value.trim(), cobertura = $('#s-cobertura').value.trim();
  const date = new Date(data+'T00:00:00');

  if(escala === 'Plantão' && !isPlantaoDay(date)){
    if(!confirm(`${fmtDate(data)} não é domingo nem feriado. Plantão deveria ocorrer só nesses dias — confirma mesmo assim?`)) return;
  }

  if(shiftId){
    const shift = state.shifts.find(s=>s.id===shiftId);
    Object.assign(shift, { techId, data, escala, troca, cobertura });
  }else{
    state.shifts.push({ id:`${techId}-shift-${data}-${Date.now().toString(36)}`, techId, data, escala, troca, cobertura });
  }

  if(escala === 'Plantão'){
    const folgaData = toISODate(addDays(date, 1));
    const jaTemFolga = state.shifts.some(s => s.techId === techId && s.data === folgaData && s.escala === 'Folga');
    if(!jaTemFolga){
      state.shifts.push({ id:`${techId}-shift-${folgaData}-folga-${Date.now().toString(36)}`, techId, data:folgaData, escala:'Folga', troca:null, cobertura:'Compensação de plantão' });
    }
  }

  logAudit(state, { entidade:'plantao', entidadeId:techId, campo:'escala', antes:null, depois:`${escala} em ${fmtDate(data)}`, motivo:'Atualização de escala' });
  closeModal();
  Sync.scheduleSave(state);
  renderShiftsView(state);
  refreshGlobalWidgets(state);
  toast('Escala salva com sucesso.', 'success');
}

function regenerateShifts(state){
  if(!confirm('Isso substitui toda a escala de plantões futura (a partir de hoje) pela geração automática (domingos e feriados, 2 técnicos por dia, com folga compensatória). Escalas passadas não são afetadas. Confirma?')) return;
  const todayStr = new Date().toISOString().slice(0,10);
  const today = new Date(); today.setHours(0,0,0,0);
  state.shifts = state.shifts.filter(s => s.data < todayStr);
  const novos = generateShiftsSchedule(state.technicians, today, 90);
  state.shifts.push(...novos);
  logAudit(state, { entidade:'plantao', entidadeId:'global', campo:'escala', antes:null, depois:'Regeneração automática (90 dias)', motivo:'Geração automática de escala' });
  Sync.scheduleSave(state);
  renderShiftsView(state);
  refreshGlobalWidgets(state);
  toast('Escala de plantões regenerada automaticamente.', 'success');
}
