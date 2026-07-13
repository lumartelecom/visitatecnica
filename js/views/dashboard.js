/* ══════════════════════════════════════════════════════════════════
   Dashboard Principal — KPIs, gráficos, mesa de desempenho
   ══════════════════════════════════════════════════════════════════ */

const KPI_META = {
  total:        { label:'Total de Técnicos', icon:'groups', color:'blue' },
  producaoDia:  { label:'Produção do Dia', icon:'today', color:'blue', metaPorTecnico:5 },
  producaoMes:  { label:'Produção do Mês', icon:'calendar_month', color:'indigo', metaPorTecnico:110 },
  tec1:         { label:'TEC1', icon:'verified_user', color:null, format:v=>fmtPct(v) },
  sla:          { label:'SLA', icon:'schedule', color:null, format:v=>fmtPct(v) },
  ura:          { label:'URA', icon:'record_voice_over', color:null, format:v=>fmtPct(v) },
  qq:           { label:'Qualidade (QQ)', icon:'workspace_premium', color:null, format:v=>fmtPct(v) },
  tnps:         { label:'TNPS', icon:'thumb_up', color:null, format:v=>Math.round(v*100) },
  nr35:         { label:'NR35 em dia', icon:'health_and_safety', color:null },
  geo:          { label:'Aderência GEO', icon:'my_location', color:null, format:v=>fmtPct(v) },
  consultivo:   { label:'Consultivo', icon:'monetization_on', color:'indigo', format:v=>fmtMoney(v) },
  revisita:     { label:'Revisitas', icon:'restart_alt', color:null, format:v=>fmtPct(v) },
  pendencias:   { label:'Pendências', icon:'flag', color:null },
};

let dashboardFilters = { periodo:30, equipe:'', supervisor:'', situacao:'' };

function filterTechnicians(state, f=dashboardFilters){
  return state.technicians.filter(t =>
    (!f.equipe || t.equipe === f.equipe) &&
    (!f.supervisor || t.supervisor === f.supervisor) &&
    (!f.situacao || t.situacao === f.situacao)
  );
}

function computeDashboardKPIs(state, filteredTechs){
  const ids = new Set(filteredTechs.map(t=>t.id));
  const todayStr = new Date().toISOString().slice(0,10);
  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate()-30);
  const prodInScope = state.production.filter(p => ids.has(p.techId));

  const prodDia = sum(prodInScope.filter(p => p.data === todayStr).map(p=>p.os));
  const prodMes = sum(prodInScope.filter(p => new Date(p.data) >= cutoff30).map(p=>p.os));

  const avgOf = k => filteredTechs.length ? avg(filteredTechs.map(t => t.indicadores[k])) : 0;
  const nr35OK = filteredTechs.length ? filteredTechs.filter(t => t.indicadores.nr35 === 'válido').length : 0;
  const consultivoTotal = sum(filteredTechs.map(t => t.consultivo?.valorRecebido || 0));
  const consultivoMeta = sum(filteredTechs.map(t => t.consultivo?.meta || 0));
  const pendencias = computeAlerts(state).filter(a => a.level === 'red' && ids.has(a.techId)).length;

  return {
    total: filteredTechs.length,
    producaoDia: prodDia,
    producaoMes: prodMes,
    tec1: avgOf('tec1'), sla: avgOf('sla'), ura: avgOf('ura'), qq: avgOf('qq'), tnps: avgOf('tnps'), geo: avgOf('geo'),
    revisita: avgOf('revisita'),
    nr35: { ok: nr35OK, total: filteredTechs.length },
    consultivo: { valor: consultivoTotal, meta: consultivoMeta },
    pendencias,
  };
}

function kpiCardHTML(key, value, opts={}){
  const meta = KPI_META[key];
  let status = 'green', displayValue = value, subMeta = '';
  if(['tec1','sla','ura','qq','tnps','geo','revisita'].includes(key)){
    status = statusFor(key === 'tnps' ? 'tnps' : key, key==='tnps' ? value : value);
    displayValue = meta.format(value);
    subMeta = `Meta ${key==='tnps' ? Math.round(METAS[key]?.verde*100 || 80) : fmtPct(METAS[key]?.verde || 0)}`;
  }else if(key === 'producaoDia' || key === 'producaoMes'){
    const target = meta.metaPorTecnico * (opts.total||1) * (key==='producaoMes'?1:1);
    const pct = target ? value/target : 0;
    status = pct >= 1 ? 'green' : pct >= 0.85 ? 'amber' : 'red';
    displayValue = value + ' OS';
    subMeta = `Meta ${target}`;
  }else if(key === 'nr35'){
    const {ok, total} = value;
    status = ok === total ? 'green' : ok >= total*0.7 ? 'amber' : 'red';
    displayValue = `${ok}/${total}`;
    subMeta = 'Técnicos em dia';
  }else if(key === 'consultivo'){
    status = value.meta && value.valor >= value.meta ? 'green' : value.valor >= (value.meta||0)*0.7 ? 'amber' : 'red';
    displayValue = fmtMoney(value.valor);
    subMeta = `Meta ${fmtMoney(value.meta)}`;
  }else if(key === 'pendencias'){
    status = value === 0 ? 'green' : value <= 2 ? 'amber' : 'red';
    displayValue = value;
    subMeta = 'Alertas críticos abertos';
  }else if(key === 'total'){
    status = 'blue'; displayValue = value; subMeta = 'Ativos no período';
  }

  const iconClass = status === 'blue' ? 'icon-blue' : `icon-${status}`;
  const statusClass = status === 'blue' ? 'status-green' : `status-${status}`;
  return `
    <div class="card kpi">
      <div class="kpi-top">
        <div class="kpi-icon ${iconClass}"><span class="material-symbols-rounded">${meta.icon}</span></div>
        <span class="kpi-status ${statusClass}">${status==='blue'?'Ativo':statusLabel(status)}</span>
      </div>
      <div class="kpi-value">${displayValue}</div>
      <div class="kpi-label">${meta.label}</div>
      <div class="kpi-meta"><b>${subMeta}</b></div>
    </div>
  `;
}

function renderDashboardView(state){
  const root = $('#view-dashboard');
  if(!root) return;
  const equipes = [...new Set(state.technicians.map(t=>t.equipe))];
  const supervisores = [...new Set(state.technicians.map(t=>t.supervisor))];

  root.innerHTML = `
    <div class="view-head">
      <div><h1>Performance e Indicadores de Campo</h1><p class="text-2">Monitoramento integrado da equipe de manutenção — atualizado em tempo real.</p></div>
      <div class="view-actions">
        <button class="btn btn-secondary" id="btn-print-dash"><span class="material-symbols-rounded icon">print</span>Imprimir</button>
        <button class="btn btn-primary" id="btn-export-dash"><span class="material-symbols-rounded icon">download</span>Exportar CSV</button>
      </div>
    </div>

    <div class="filters-bar">
      <label>Equipe</label>
      <select id="f-equipe"><option value="">Todas</option>${equipes.map(e=>`<option ${dashboardFilters.equipe===e?'selected':''}>${e}</option>`).join('')}</select>
      <label>Supervisor</label>
      <select id="f-supervisor"><option value="">Todos</option>${supervisores.map(e=>`<option ${dashboardFilters.supervisor===e?'selected':''}>${e}</option>`).join('')}</select>
      <label>Situação</label>
      <select id="f-situacao"><option value="">Todas</option>${SITUACOES.map(e=>`<option ${dashboardFilters.situacao===e?'selected':''}>${e}</option>`).join('')}</select>
      <label>Período</label>
      <select id="f-periodo">
        <option value="7" ${dashboardFilters.periodo==7?'selected':''}>7 dias</option>
        <option value="30" ${dashboardFilters.periodo==30?'selected':''}>30 dias</option>
        <option value="90" ${dashboardFilters.periodo==90?'selected':''}>90 dias</option>
      </select>
    </div>

    <div class="grid grid-4" id="dash-kpis" style="margin-bottom:20px"></div>

    <div class="grid" style="grid-template-columns:2fr 1fr; margin-bottom:20px" id="dash-charts-row">
      <div class="card chart-card">
        <h4 class="card-title">Evolução do TEC1 (equipe) · Projeção IA</h4>
        <p class="card-sub">Tendência calculada por regressão linear sobre o histórico — projeção heurística, não um modelo de IA generativo.</p>
        <div class="chart-box mt-4"><canvas id="chart-evolution"></canvas></div>
      </div>
      <div class="card chart-card">
        <h4 class="card-title">Mapeamento de Competências</h4>
        <div class="chart-box"><canvas id="chart-radar"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mt-2" style="margin-bottom:14px">
        <h3 class="card-title" style="margin:0">Mesa de Desempenho (Ranking Gamificado)</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Técnico</th><th>Matrícula</th><th>TEC1</th><th>SLA</th><th>Consultivo</th><th class="text-right">Ação</th>
          </tr></thead>
          <tbody id="dash-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  $('#f-equipe').onchange = e => { dashboardFilters.equipe = e.target.value; renderDashboardView(state); };
  $('#f-supervisor').onchange = e => { dashboardFilters.supervisor = e.target.value; renderDashboardView(state); };
  $('#f-situacao').onchange = e => { dashboardFilters.situacao = e.target.value; renderDashboardView(state); };
  $('#f-periodo').onchange = e => { dashboardFilters.periodo = +e.target.value; renderDashboardView(state); };
  $('#btn-export-dash').onclick = () => exportDashboardCSV(state);
  $('#btn-print-dash').onclick = () => window.print();

  const filtered = filterTechnicians(state);
  const kpis = computeDashboardKPIs(state, filtered);
  $('#dash-kpis').innerHTML = [
    kpiCardHTML('total', kpis.total),
    kpiCardHTML('producaoDia', kpis.producaoDia, {total:kpis.total}),
    kpiCardHTML('producaoMes', kpis.producaoMes, {total:kpis.total}),
    kpiCardHTML('tec1', kpis.tec1),
    kpiCardHTML('sla', kpis.sla),
    kpiCardHTML('ura', kpis.ura),
    kpiCardHTML('qq', kpis.qq),
    kpiCardHTML('tnps', kpis.tnps),
    kpiCardHTML('nr35', kpis.nr35),
    kpiCardHTML('geo', kpis.geo),
    kpiCardHTML('consultivo', kpis.consultivo),
    kpiCardHTML('revisita', kpis.revisita),
    kpiCardHTML('pendencias', kpis.pendencias),
  ].join('');

  renderDashboardCharts(state, filtered);
  renderDashboardTable(state, filtered);
}

function renderDashboardCharts(state, filtered){
  const days = 14;
  const labels = [];
  const teamAvg = [];
  for(let i=0;i<days;i++){
    let dateStr = null, vals = [];
    filtered.forEach(t => {
      const h = (state.history[t.id]||[])[i];
      if(h){ dateStr = h.data; vals.push(h.tec1); }
    });
    if(dateStr){ labels.push(fmtDate(dateStr).slice(0,5)); teamAvg.push(vals.length ? avg(vals)*100 : null); }
  }
  const forecast = predictNext(teamAvg.filter(v=>v!=null), 3);
  const forecastLabels = [...labels, '+1d','+2d','+3d'];
  const forecastData = [...teamAvg, ...Array(3).fill(null)];
  forecastData[forecastData.length-1] = Math.round(forecast*10)/10;

  buildLineChart('chart-evolution', forecastLabels, [
    { label:'TEC1 Realizado', data: teamAvg, borderColor:'#EE2924', backgroundColor:'rgba(238,41,36,.08)', fill:true, spanGaps:true },
    { label:'Projeção', data: forecastData, borderColor:'#4F46E5', borderDash:[6,4], spanGaps:true },
  ]);

  const teamRadar = filtered.length ? {
    tec1: avg(filtered.map(t=>t.indicadores.tec1))*100,
    sla: avg(filtered.map(t=>t.indicadores.sla))*100,
    qq: avg(filtered.map(t=>t.indicadores.qq))*100,
    consultivo: Math.min(100, avg(filtered.map(t=> (t.consultivo?.valorRecebido||0) / (t.consultivo?.meta||1) * 100))),
    ura: avg(filtered.map(t=>t.indicadores.ura))*100,
    tnps: avg(filtered.map(t=>t.indicadores.tnps))*100,
  } : {tec1:0,sla:0,qq:0,consultivo:0,ura:0,tnps:0};

  buildRadarChart('chart-radar', ['TEC1','SLA','Qualidade','Consultivo','URA','TNPS'],
    [{ label:'Equipe', data:[teamRadar.tec1, teamRadar.sla, teamRadar.qq, teamRadar.consultivo, teamRadar.ura, teamRadar.tnps],
       backgroundColor:'rgba(238,41,36,.12)', borderColor:'#EE2924' }]);
}

function renderDashboardTable(state, filtered, searchTerm=''){
  const tbody = $('#dash-table-body');
  if(!tbody) return;
  const term = searchTerm.toLowerCase();
  const rows = filtered.filter(t => !term || t.name.toLowerCase().includes(term) || t.matricula.toLowerCase().includes(term));
  tbody.innerHTML = rows.map(t => `
    <tr>
      <td>
        <div class="tech-cell">
          ${t.foto ? `<img class="tech-photo" src="${t.foto}">` : `<span class="tech-photo-ph">${escapeHtml(Auth.initials(t.name))}</span>`}
          <div><b>${t.badge||''} ${escapeHtml(t.name)}</b><div class="text-3" style="font-size:11px">${escapeHtml(t.equipe)}</div></div>
        </div>
      </td>
      <td class="text-2" style="font-family:monospace; font-size:12px">${escapeHtml(t.matricula)}</td>
      <td><span class="chip status-${statusFor('tec1', t.indicadores.tec1)}">${fmtPct(t.indicadores.tec1)}</span></td>
      <td><span class="chip status-${statusFor('sla', t.indicadores.sla)}">${fmtPct(t.indicadores.sla)}</span></td>
      <td class="text-2">${fmtMoney(t.consultivo?.valorRecebido||0)}</td>
      <td class="text-right"><button class="btn btn-sm btn-ghost" onclick="goToTechnicianProfile('${t.id}')">Ver perfil</button></td>
    </tr>
  `).join('') || `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-rounded icon">search_off</span><span>Nenhum técnico encontrado.</span></div></td></tr>`;
}

function exportDashboardCSV(state){
  const filtered = filterTechnicians(state);
  const headers = ['Técnico','Matrícula','Equipe','Supervisor','TEC1','SLA','QQ','URA','TNPS','Consultivo (R$)'];
  const rows = filtered.map(t => [t.name, t.matricula, t.equipe, t.supervisor, fmtPct(t.indicadores.tec1), fmtPct(t.indicadores.sla), fmtPct(t.indicadores.qq), fmtPct(t.indicadores.ura), Math.round(t.indicadores.tnps*100), (t.consultivo?.valorRecebido||0).toFixed(2)]);
  downloadBlob(toCSV(rows, headers), `dashboard-indicadores-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  toast('CSV exportado com sucesso.', 'success');
}
