/* ══════════════════════════════════════════════════════════════════
   Cadastro de Técnicos (CRUD) + Página Individual
   ══════════════════════════════════════════════════════════════════ */

let techListFilters = { equipe:'', situacao:'', termo:'' };

function renderTechniciansView(state){
  const root = $('#view-technicians');
  if(!root) return;
  const equipes = [...new Set(state.technicians.map(t=>t.equipe))];

  root.innerHTML = `
    <div class="view-head">
      <div><h1>Centro de Credenciamento e Cadastro</h1><p class="text-2">Gerencie os técnicos e supervisores da operação.</p></div>
      <div class="view-actions">
        ${Auth.can('edit') ? `<button class="btn btn-primary" id="btn-new-tech"><span class="material-symbols-rounded icon">person_add</span>Novo Técnico</button>` : ''}
      </div>
    </div>
    <div class="filters-bar">
      <label>Equipe</label>
      <select id="tf-equipe"><option value="">Todas</option>${equipes.map(e=>`<option ${techListFilters.equipe===e?'selected':''}>${e}</option>`).join('')}</select>
      <label>Situação</label>
      <select id="tf-situacao"><option value="">Todas</option>${SITUACOES.map(e=>`<option ${techListFilters.situacao===e?'selected':''}>${e}</option>`).join('')}</select>
      <div class="search-box" style="margin-left:auto">
        <span class="material-symbols-rounded icon">search</span>
        <input type="text" id="tf-termo" placeholder="Buscar por nome ou matrícula..." value="${escapeHtml(techListFilters.termo)}">
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Técnico</th><th>Matrícula</th><th>Equipe</th><th>Supervisor</th><th>Situação</th><th>Admissão</th><th class="text-right">Ações</th></tr></thead>
          <tbody id="tech-list-body"></tbody>
        </table>
      </div>
    </div>
  `;
  $('#tf-equipe').onchange = e => { techListFilters.equipe = e.target.value; renderTechListBody(state); };
  $('#tf-situacao').onchange = e => { techListFilters.situacao = e.target.value; renderTechListBody(state); };
  $('#tf-termo').oninput = debounce(e => { techListFilters.termo = e.target.value; renderTechListBody(state); }, 200);
  if($('#btn-new-tech')) $('#btn-new-tech').onclick = () => openTechnicianModal(state);
  renderTechListBody(state);
}

function renderTechListBody(state){
  const tbody = $('#tech-list-body');
  if(!tbody) return;
  const term = techListFilters.termo.toLowerCase();
  const rows = state.technicians.filter(t =>
    (!techListFilters.equipe || t.equipe === techListFilters.equipe) &&
    (!techListFilters.situacao || t.situacao === techListFilters.situacao) &&
    (!term || t.name.toLowerCase().includes(term) || t.matricula.toLowerCase().includes(term))
  );
  tbody.innerHTML = rows.map(t => `
    <tr>
      <td>
        <div class="tech-cell">
          ${t.foto ? `<img class="tech-photo" src="${t.foto}">` : `<span class="tech-photo-ph">${escapeHtml(Auth.initials(t.name))}</span>`}
          <b>${escapeHtml(t.name)}</b>
        </div>
      </td>
      <td class="text-2" style="font-family:monospace; font-size:12px">${escapeHtml(t.matricula)}</td>
      <td class="text-2">${escapeHtml(t.equipe)}</td>
      <td class="text-2">${escapeHtml(t.supervisor)}</td>
      <td><span class="chip status-${t.situacao==='Ativo'?'green':t.situacao==='Desligado'?'red':'amber'}">${escapeHtml(t.situacao)}</span></td>
      <td class="text-2">${fmtDate(t.admissao)}</td>
      <td class="text-right">
        <button class="btn btn-sm btn-ghost" onclick="goToTechnicianProfile('${t.id}')">Perfil</button>
        ${Auth.can('edit') ? `<button class="btn btn-sm btn-ghost" onclick="openTechnicianModal(State,'${t.id}')">Editar</button>` : ''}
        ${Auth.can('delete') ? `<button class="btn btn-sm btn-ghost" onclick="toggleTechnicianStatus(State,'${t.id}')">${t.situacao==='Desligado'?'Reativar':'Desativar'}</button>` : ''}
        ${Auth.can('delete') ? `<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="deleteTechnician(State,'${t.id}')">Remover</button>` : ''}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty-state"><span class="material-symbols-rounded icon">group_off</span><span>Nenhum técnico encontrado.</span></div></td></tr>`;
}

function openTechnicianModal(state, techId=null){
  const tech = techId ? state.technicians.find(t=>t.id===techId) : null;
  const isEdit = !!tech;
  let photoData = tech?.foto || null;

  const body = `
    <div class="flex items-center gap-3" style="margin-bottom:16px">
      <div id="modal-photo-preview">${photoData ? `<img class="tech-photo" style="width:56px;height:56px" src="${photoData}">` : `<span class="tech-photo-ph" style="width:56px;height:56px;font-size:18px">${tech?Auth.initials(tech.name):'?'}</span>`}</div>
      <label class="btn btn-secondary btn-sm">Escolher Foto<input type="file" id="f-foto" accept="image/*" class="hidden"></label>
    </div>
    <div class="field-row">
      <div class="field"><label>Nome Completo</label><input id="f-name" value="${escapeHtml(tech?.name||'')}" placeholder="Ex: Rodrigo M. Souza"></div>
      <div class="field"><label>Matrícula</label><input id="f-matricula" value="${escapeHtml(tech?.matricula||'')}" placeholder="Ex: LM9982"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Supervisor</label><input id="f-supervisor" value="${escapeHtml(tech?.supervisor||'Gestor Lumar')}"></div>
      <div class="field"><label>Contato</label><input id="f-contato" value="${escapeHtml(tech?.contato||'')}" placeholder="(11) 90000-0000"></div>
    </div>
  `;

  const overlay = openModal(isEdit ? 'Editar Técnico' : 'Cadastrar Técnico', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label: isEdit ? 'Salvar Alterações' : 'Cadastrar', className:'btn-primary', onClick: () => submitTechnicianForm(state, techId) },
  ]);

  $('#f-foto').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      photoData = reader.result;
      overlay.dataset.photo = photoData;
      $('#modal-photo-preview').innerHTML = `<img class="tech-photo" style="width:56px;height:56px" src="${photoData}">`;
    };
    reader.readAsDataURL(file);
  };
  overlay.dataset.photo = photoData || '';
}

function submitTechnicianForm(state, techId){
  const name = $('#f-name').value.trim();
  const matricula = $('#f-matricula').value.trim();
  if(!name || !matricula){ toast('Preencha nome e matrícula.', 'error'); return; }

  const overlay = $('#modal-overlay');
  const foto = overlay.dataset.photo || null;
  const payload = {
    name, matricula,
    supervisor: $('#f-supervisor').value.trim() || 'Gestor Lumar',
    contato: $('#f-contato').value.trim(),
    foto,
  };

  if(techId){
    const tech = state.technicians.find(t=>t.id===techId);
    Object.entries(payload).forEach(([k,v]) => {
      if(JSON.stringify(tech[k]) !== JSON.stringify(v)){
        logAudit(state, { entidade:'tecnico', entidadeId:techId, campo:k, antes:tech[k], depois:v, motivo:'Edição de cadastro' });
        tech[k] = v;
      }
    });
    toast(`Dados de ${name} atualizados.`, 'success');
  }else{
    const id = 'T' + Date.now().toString(36).toUpperCase();
    const novo = {
      id, ...payload, badge:'',
      equipe:'', admissao: new Date().toISOString().slice(0,10), situacao:'Ativo',
      cnh:'', veiculo:'', equipamentos:[],
      indicadores: { tec1:0, sla:0, qq:0, ura:0, tnps:0, nr35:'válido', geo:0, revisita:0, retrabalho:0 },
      consultivo: { ofertas:0, aceitas:0, instaladas:0, canceladas:0, valorVendido:0, valorRecebido:0, meta:3000, comissao:0 },
      ocorrencias:[], advertencias:[], treinamentos:[],
    };
    state.technicians.push(novo);
    state.history[id] = [];
    logAudit(state, { entidade:'tecnico', entidadeId:id, campo:'cadastro', antes:null, depois:name, motivo:'Novo cadastro' });
    toast(`${name} cadastrado com sucesso.`, 'success');
  }

  closeModal();
  Sync.scheduleSave(state);
  renderTechniciansView(state);
  refreshGlobalWidgets(state);
}

function toggleTechnicianStatus(state, techId){
  const tech = state.technicians.find(t=>t.id===techId);
  if(!tech) return;
  const novaSituacao = tech.situacao === 'Desligado' ? 'Ativo' : 'Desligado';
  if(!confirm(`Confirma alterar a situação de ${tech.name} para "${novaSituacao}"?`)) return;
  logAudit(state, { entidade:'tecnico', entidadeId:techId, campo:'situacao', antes:tech.situacao, depois:novaSituacao, motivo:'Alteração de status' });
  tech.situacao = novaSituacao;
  Sync.scheduleSave(state);
  renderTechniciansView(state);
  refreshGlobalWidgets(state);
  toast(`Situação de ${tech.name} alterada para ${novaSituacao}.`, 'info');
}

function deleteTechnician(state, techId){
  const tech = state.technicians.find(t=>t.id===techId);
  if(!tech) return;
  if(!confirm(`Remover definitivamente ${tech.name} (matrícula ${tech.matricula})?\n\nIsso apaga o cadastro e todo o histórico de produção, plantões e férias associados. Esta ação não pode ser desfeita.\n\nSe preferir apenas suspender o acesso mantendo o histórico, use "Desativar" em vez de "Remover".`)) return;

  logAudit(state, { entidade:'tecnico', entidadeId:techId, campo:'remocao', antes:tech.name, depois:null, motivo:'Remoção definitiva do cadastro' });

  state.technicians = state.technicians.filter(t => t.id !== techId);
  state.production = state.production.filter(p => p.techId !== techId);
  state.shifts = state.shifts.filter(s => s.techId !== techId);
  state.vacations = state.vacations.filter(v => v.techId !== techId);
  delete state.history[techId];

  Sync.scheduleSave(state);
  renderTechniciansView(state);
  refreshGlobalWidgets(state);
  toast(`${tech.name} foi removido definitivamente.`, 'success');
}

/* ── Perfil individual ─────────────────────────────────────────── */

function goToTechnicianProfile(techId){
  switchView('technician-profile', { techId });
}

function renderTechnicianProfile(state, { techId }){
  const root = $('#view-technician-profile');
  const t = state.technicians.find(x => x.id === techId);
  if(!root) return;
  if(!t){ root.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded icon">person_off</span><span>Técnico não encontrado.</span></div>`; return; }

  const rankingRows = computeGeneralRanking(state);
  const pos = rankingRows.findIndex(r => r.tech.id === techId) + 1;
  const teamAvgTec1 = avg(state.technicians.map(x=>x.indicadores.tec1));

  root.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="switchView('technicians')" style="margin-bottom:12px">
      <span class="material-symbols-rounded icon">arrow_back</span>Voltar para lista
    </button>
    <div class="card profile-head">
      ${t.foto ? `<img class="profile-photo" src="${t.foto}">` : `<span class="profile-photo-ph">${escapeHtml(Auth.initials(t.name))}</span>`}
      <div style="flex:1">
        <div class="flex items-center gap-2"><h2 style="font-size:19px; font-weight:800">${t.badge||''} ${escapeHtml(t.name)}</h2><span class="chip status-${t.situacao==='Ativo'?'green':'amber'}">${escapeHtml(t.situacao)}</span></div>
        <div class="profile-meta">
          <div><span>Matrícula</span><b>${escapeHtml(t.matricula)}</b></div>
          <div><span>Equipe</span><b>${escapeHtml(t.equipe)}</b></div>
          <div><span>Supervisor</span><b>${escapeHtml(t.supervisor)}</b></div>
          <div><span>Admissão</span><b>${fmtDate(t.admissao)}</b></div>
          <div><span>Ranking Geral</span><b>${medalFor(pos-1)} #${pos}</b></div>
        </div>
      </div>
    </div>

    <div class="tabs" id="profile-tabs">
      ${['Indicadores','Gráficos','Produção','Consultivo','Histórico','Ocorrências'].map((l,i)=>`<button class="tab-btn ${i===0?'active':''}" data-tab="${i}">${l}</button>`).join('')}
    </div>

    <div class="tab-panel active" id="ptab-0">
      <div class="grid grid-4">
        ${['tec1','sla','qq','ura','tnps','geo','revisita'].map(k => `
          <div class="card kpi">
            <div class="kpi-top"><div class="kpi-icon icon-${statusFor(k,t.indicadores[k])}"><span class="material-symbols-rounded">insights</span></div>
            <span class="kpi-status status-${statusFor(k,t.indicadores[k])}">${statusLabel(statusFor(k,t.indicadores[k]))}</span></div>
            <div class="kpi-value">${k==='tnps' ? Math.round(t.indicadores[k]*100) : fmtPct(t.indicadores[k])}</div>
            <div class="kpi-label">${k.toUpperCase()}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="tab-panel" id="ptab-1">
      <div class="grid" style="grid-template-columns:1.5fr 1fr">
        <div class="card chart-card"><h4 class="card-title">Evolução TEC1 (14 dias)</h4><div class="chart-box mt-4"><canvas id="chart-profile-line"></canvas></div></div>
        <div class="card chart-card"><h4 class="card-title">Comparativo com a Equipe</h4><div class="chart-box"><canvas id="chart-profile-bar"></canvas></div></div>
      </div>
    </div>

    <div class="tab-panel" id="ptab-2">
      <div class="card">
        <h4 class="card-title" style="margin-bottom:10px">Produção diária (últimos 14 dias)</h4>
        <div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>OS</th><th>Instalações</th><th>Reparos</th><th>Revisitas</th><th>Tempo Médio</th></tr></thead>
          <tbody>${(state.production.filter(p=>p.techId===techId).slice(0,14)).map(p=>`
            <tr><td>${fmtDate(p.data)}</td><td>${p.os}</td><td>${p.instalacoes}</td><td>${p.reparos}</td><td>${p.revisitas}</td><td>${p.tempoMedioMin} min</td></tr>
          `).join('')}</tbody>
        </table></div>
      </div>
    </div>

    <div class="tab-panel" id="ptab-3">
      <div class="grid grid-3">
        <div class="card"><div class="kpi-label">Ofertas / Aceitas</div><div class="kpi-value">${t.consultivo.ofertas} / ${t.consultivo.aceitas}</div></div>
        <div class="card"><div class="kpi-label">Valor Recebido</div><div class="kpi-value">${fmtMoney(t.consultivo.valorRecebido)}</div></div>
        <div class="card"><div class="kpi-label">Comissão</div><div class="kpi-value">${fmtMoney(t.consultivo.comissao)}</div></div>
      </div>
    </div>

    <div class="tab-panel" id="ptab-4">
      <div class="card" id="profile-history"></div>
    </div>

    <div class="tab-panel" id="ptab-5">
      <div class="card">
        <h4 class="card-title" style="margin-bottom:10px">Ocorrências, advertências e treinamentos</h4>
        <div id="profile-ocorrencias"></div>
      </div>
    </div>
  `;

  $all('#profile-tabs .tab-btn').forEach(btn => btn.onclick = () => {
    $all('#profile-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
    $all('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    $('#ptab-'+btn.dataset.tab).classList.add('active');
  });

  const hist = state.history[techId] || [];
  buildLineChart('chart-profile-line', hist.map(h=>fmtDate(h.data).slice(0,5)), [
    { label:t.name, data: hist.map(h=>h.tec1*100), borderColor:'#EE2924', backgroundColor:'rgba(238,41,36,.08)', fill:true },
  ]);
  buildBarChart('chart-profile-bar', ['TEC1','SLA','Qualidade'], [
    { label:t.name, data:[t.indicadores.tec1*100, t.indicadores.sla*100, t.indicadores.qq*100], backgroundColor:'#EE2924' },
    { label:'Média da Equipe', data:[teamAvgTec1*100, avg(state.technicians.map(x=>x.indicadores.sla))*100, avg(state.technicians.map(x=>x.indicadores.qq))*100], backgroundColor:'#9AA4BD' },
  ]);

  const histEvents = state.audit.filter(a => a.entidadeId === techId).map(a => ({
    titulo: `${a.campo} alterado por ${a.usuario}`, data: fmtDateTime(a.ts), desc: a.motivo,
  }));
  renderTimeline('profile-history', histEvents);

  const ocor = [...(t.ocorrencias||[]), ...(t.advertencias||[]), ...(t.treinamentos||[])];
  $('#profile-ocorrencias').innerHTML = ocor.length
    ? `<div class="timeline">${ocor.map(o=>`<div class="timeline-item"><b>${escapeHtml(o.tipo)}</b><span>${fmtDate(o.data)} · ${escapeHtml(o.descricao)}</span></div>`).join('')}</div>`
    : `<div class="empty-state"><span class="material-symbols-rounded icon">fact_check</span><span>Nenhum registro até o momento.</span></div>`;
}
