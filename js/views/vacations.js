/* ══════════════════════════════════════════════════════════════════
   Férias e Afastamentos
   ══════════════════════════════════════════════════════════════════ */

function renderVacationsView(state){
  const root = $('#view-vacations');
  if(!root) return;
  const todayStr = new Date().toISOString().slice(0,10);
  const rows = [...state.vacations].sort((a,b)=>a.inicio.localeCompare(b.inicio));

  root.innerHTML = `
    <div class="view-head">
      <div><h1>Férias e Afastamentos</h1><p class="text-2">Calendário de férias, licenças e retorno da equipe.</p></div>
      <div class="view-actions">
        ${Auth.can('edit') ? `<button class="btn btn-primary" id="btn-new-vac"><span class="material-symbols-rounded icon">beach_access</span>Nova Solicitação</button>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Técnico</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Status</th><th>Dias até início</th></tr></thead>
        <tbody>${rows.map(v => {
          const t = state.technicians.find(x=>x.id===v.techId);
          const diff = daysBetween(todayStr, v.inicio);
          return `<tr>
            <td><b>${escapeHtml(t?.name||'—')}</b></td><td>${escapeHtml(v.tipo)}</td>
            <td>${fmtDate(v.inicio)}</td><td>${fmtDate(v.fim)}</td>
            <td><span class="chip status-${v.status==='Aprovado'?'green':'amber'}">${escapeHtml(v.status)}</span></td>
            <td class="${diff>=0 && diff<=15 ? 'text-2' : ''}">${diff >= 0 ? diff+' dias' : 'Em andamento/concluído'}</td>
          </tr>`;
        }).join('') || `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-rounded icon">event_busy</span><span>Nenhum registro.</span></div></td></tr>`}</tbody>
      </table></div>
    </div>
  `;
  if($('#btn-new-vac')) $('#btn-new-vac').onclick = () => openVacationModal(state);
}

function openVacationModal(state){
  const body = `
    <div class="field"><label>Técnico</label><select id="v-tech">${state.technicians.filter(t=>t.situacao!=='Desligado').map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
    <div class="field"><label>Tipo</label><select id="v-tipo">${['Férias','Licença Médica','Licença Maternidade/Paternidade','Afastamento'].map(t=>`<option>${t}</option>`).join('')}</select></div>
    <div class="field-row">
      <div class="field"><label>Início</label><input type="date" id="v-inicio"></div>
      <div class="field"><label>Fim</label><input type="date" id="v-fim"></div>
    </div>
    <div class="field"><label>Status</label><select id="v-status">${['Solicitado','Aprovado'].map(s=>`<option>${s}</option>`).join('')}</select></div>
  `;
  openModal('Nova Solicitação de Férias/Afastamento', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Salvar', className:'btn-primary', onClick: () => submitVacationForm(state) },
  ]);
}

function submitVacationForm(state){
  const techId = $('#v-tech').value, inicio = $('#v-inicio').value, fim = $('#v-fim').value;
  if(!inicio || !fim){ toast('Informe as datas de início e fim.', 'error'); return; }
  if(fim < inicio){ toast('A data de fim deve ser posterior ao início.', 'error'); return; }
  state.vacations.push({ id:`${techId}-vac-${Date.now().toString(36)}`, techId, inicio, fim, tipo:$('#v-tipo').value, status:$('#v-status').value });
  const t = state.technicians.find(x=>x.id===techId);
  logAudit(state, { entidade:'ferias', entidadeId:techId, campo:'solicitacao', antes:null, depois:`${$('#v-tipo').value} de ${fmtDate(inicio)} a ${fmtDate(fim)}`, motivo:'Nova solicitação' });
  closeModal();
  Sync.scheduleSave(state);
  renderVacationsView(state);
  refreshGlobalWidgets(state);
  toast(`Solicitação registrada para ${t?.name||''}.`, 'success');
}
