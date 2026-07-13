/* ══════════════════════════════════════════════════════════════════
   Consultivo — ofertas, vendas, comissão e ranking
   ══════════════════════════════════════════════════════════════════ */

function renderConsultivoView(state){
  const root = $('#view-consultivo');
  if(!root) return;
  const techs = state.technicians.filter(t=>t.situacao!=='Desligado');
  const totalVendido = sum(techs.map(t=>t.consultivo?.valorVendido||0));
  const totalRecebido = sum(techs.map(t=>t.consultivo?.valorRecebido||0));
  const totalMeta = sum(techs.map(t=>t.consultivo?.meta||0));
  const totalComissao = sum(techs.map(t=>t.consultivo?.comissao||0));

  root.innerHTML = `
    <div class="view-head">
      <div><h1>Controle Consultivo</h1><p class="text-2">Ofertas, vendas e comissionamento da equipe.</p></div>
      <div class="view-actions">
        ${Auth.can('edit') ? `<button class="btn btn-primary" id="btn-edit-consultivo"><span class="material-symbols-rounded icon">edit</span>Atualizar Valores</button>` : ''}
      </div>
    </div>
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="card kpi"><div class="kpi-icon icon-indigo"><span class="material-symbols-rounded">sell</span></div><div class="kpi-value">${fmtMoney(totalVendido)}</div><div class="kpi-label">Valor Vendido</div></div>
      <div class="card kpi"><div class="kpi-icon icon-green"><span class="material-symbols-rounded">payments</span></div><div class="kpi-value">${fmtMoney(totalRecebido)}</div><div class="kpi-label">Valor Recebido</div><div class="kpi-meta"><b>Meta ${fmtMoney(totalMeta)}</b></div></div>
      <div class="card kpi"><div class="kpi-icon icon-blue"><span class="material-symbols-rounded">military_tech</span></div><div class="kpi-value">${fmtMoney(totalComissao)}</div><div class="kpi-label">Comissão Total</div></div>
      <div class="card kpi"><div class="kpi-icon icon-amber"><span class="material-symbols-rounded">percent</span></div><div class="kpi-value">${totalMeta ? Math.round(totalRecebido/totalMeta*100) : 0}%</div><div class="kpi-label">Atingimento da Meta</div></div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr">
      <div class="card">
        <h4 class="card-title" style="margin-bottom:12px">Detalhamento por Técnico</h4>
        <div class="table-wrap"><table>
          <thead><tr><th>Técnico</th><th>Ofertas</th><th>Aceitas</th><th>Instaladas</th><th>Canceladas</th><th>Vendido</th><th>Recebido</th><th>Comissão</th></tr></thead>
          <tbody>${techs.map(t=>{
            const c = t.consultivo || {};
            return `<tr>
              <td><b>${escapeHtml(t.name)}</b></td><td>${c.ofertas||0}</td><td>${c.aceitas||0}</td><td>${c.instaladas||0}</td><td>${c.canceladas||0}</td>
              <td>${fmtMoney(c.valorVendido||0)}</td><td>${fmtMoney(c.valorRecebido||0)}</td><td class="text-2">${fmtMoney(c.comissao||0)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
      <div class="card chart-card"><h4 class="card-title">Distribuição de Vendas</h4><div class="chart-box"><canvas id="chart-consultivo-pie"></canvas></div></div>
    </div>
  `;

  buildPieChart('chart-consultivo-pie', techs.map(t=>t.name), techs.map(t=>t.consultivo?.valorRecebido||0),
    ['#EE2924','#4F46E5','#2563EB','#16A34A','#D97706','#9333EA','#0891B2']);

  if($('#btn-edit-consultivo')) $('#btn-edit-consultivo').onclick = () => openConsultivoModal(state);
}

function openConsultivoModal(state){
  const techs = state.technicians.filter(t=>t.situacao!=='Desligado');
  const body = `
    <div class="field"><label>Técnico</label><select id="c-tech">${techs.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
    <div class="field-row">
      <div class="field"><label>Ofertas</label><input type="number" id="c-ofertas"></div>
      <div class="field"><label>Aceitas</label><input type="number" id="c-aceitas"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Instaladas</label><input type="number" id="c-instaladas"></div>
      <div class="field"><label>Canceladas</label><input type="number" id="c-canceladas"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Valor Vendido</label><input type="number" step="0.01" id="c-vendido"></div>
      <div class="field"><label>Valor Recebido</label><input type="number" step="0.01" id="c-recebido"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Meta</label><input type="number" step="0.01" id="c-meta"></div>
      <div class="field"><label>Comissão (%)</label><input type="number" step="0.1" id="c-comissao-pct" value="8"></div>
    </div>
  `;
  const overlay = openModal('Atualizar Consultivo', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Salvar', className:'btn-primary', onClick: () => submitConsultivoForm(state) },
  ]);
  const fill = () => {
    const t = state.technicians.find(x=>x.id === $('#c-tech').value);
    const c = t?.consultivo || {};
    $('#c-ofertas').value = c.ofertas||0; $('#c-aceitas').value = c.aceitas||0;
    $('#c-instaladas').value = c.instaladas||0; $('#c-canceladas').value = c.canceladas||0;
    $('#c-vendido').value = c.valorVendido||0; $('#c-recebido').value = c.valorRecebido||0;
    $('#c-meta').value = c.meta||3000;
  };
  $('#c-tech').onchange = fill; fill();
}

function submitConsultivoForm(state){
  const techId = $('#c-tech').value;
  const t = state.technicians.find(x=>x.id===techId);
  if(!t) return;
  const before = JSON.stringify(t.consultivo);
  const recebido = +$('#c-recebido').value || 0;
  const pct = (+$('#c-comissao-pct').value || 0) / 100;
  t.consultivo = {
    ofertas: +$('#c-ofertas').value||0, aceitas: +$('#c-aceitas').value||0,
    instaladas: +$('#c-instaladas').value||0, canceladas: +$('#c-canceladas').value||0,
    valorVendido: +$('#c-vendido').value||0, valorRecebido: recebido,
    meta: +$('#c-meta').value||0, comissao: recebido * pct,
  };
  logAudit(state, { entidade:'consultivo', entidadeId:techId, campo:'consultivo', antes:before, depois:JSON.stringify(t.consultivo), motivo:'Atualização manual' });
  closeModal();
  Sync.scheduleSave(state);
  renderConsultivoView(state);
  refreshGlobalWidgets(state);
  toast(`Consultivo de ${t.name} atualizado.`, 'success');
}
