/* ══════════════════════════════════════════════════════════════════
   Motor de alertas inteligentes — regras determinísticas sobre o
   estado atual (não é machine learning; é um motor de regras).
   ══════════════════════════════════════════════════════════════════ */

function computeAlerts(state){
  const alerts = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  state.technicians.filter(t => t.situacao !== 'Desligado').forEach(t => {
    const ind = t.indicadores;

    if(statusFor('tec1', ind.tec1) === 'red'){
      alerts.push({ level:'red', titulo:`TEC1 abaixo da meta`, desc:`${t.name} está em ${fmtPct(ind.tec1)} (meta ${fmtPct(METAS.tec1.verde)})`, techId:t.id });
    }
    if(statusFor('sla', ind.sla) === 'red'){
      alerts.push({ level:'red', titulo:`SLA abaixo da meta`, desc:`${t.name} está em ${fmtPct(ind.sla)} (meta ${fmtPct(METAS.sla.verde)})`, techId:t.id });
    }
    if(statusFor('revisita', ind.revisita) !== 'green'){
      alerts.push({ level: statusFor('revisita', ind.revisita)==='red'?'red':'amber', titulo:'Revisitas acima do aceitável', desc:`${t.name}: ${fmtPct(ind.revisita)} de revisitas`, techId:t.id });
    }
    if(ind.nr35 === 'vencendo'){
      alerts.push({ level:'amber', titulo:'NR35 vencendo', desc:`${t.name} — treinamento de NR35 próximo do vencimento`, techId:t.id });
    }
    if(ind.nr35 === 'vencido'){
      alerts.push({ level:'red', titulo:'NR35 vencido', desc:`${t.name} — treinamento de NR35 vencido, regularizar urgente`, techId:t.id });
    }

    const cons = t.consultivo;
    if(cons && cons.instaladas === 0){
      alerts.push({ level:'amber', titulo:'Consultivo zerado', desc:`${t.name} não teve nenhuma venda consultiva instalada no período`, techId:t.id });
    }

    const prodRecente = state.production.filter(p => p.techId === t.id).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,3);
    if(prodRecente.length && prodRecente.every(p => p.os === 0)){
      alerts.push({ level:'red', titulo:'Sem produção', desc:`${t.name} está sem lançamento de OS nos últimos dias`, techId:t.id });
    }
  });

  state.shifts.filter(s => s.escala === 'Plantão' && s.data >= todayStr).forEach(s => {
    const diff = daysBetween(todayStr, s.data);
    if(diff >= 0 && diff <= 2){
      const t = state.technicians.find(x => x.id === s.techId);
      if(t) alerts.push({ level:'blue', titulo:'Plantão se aproxima', desc:`${t.name} tem plantão em ${fmtDate(s.data)}`, techId:t.id });
    }
  });

  state.vacations.forEach(v => {
    const diff = daysBetween(todayStr, v.inicio);
    if(diff >= 0 && diff <= 15){
      const t = state.technicians.find(x => x.id === v.techId);
      if(t) alerts.push({ level:'blue', titulo:'Férias se aproximando', desc:`${t.name} sai de férias em ${fmtDate(v.inicio)} (${diff} dia(s))`, techId:t.id });
    }
  });

  const order = { red:0, amber:1, blue:2 };
  alerts.sort((a,b) => (order[a.level]??3) - (order[b.level]??3));
  return alerts;
}

function alertColor(level){ return { red:'var(--red)', amber:'var(--amber)', blue:'var(--blue)' }[level] || 'var(--text-3)'; }

function renderAlertsDropdown(state){
  const list = computeAlerts(state);
  const badge = $('#alerts-badge');
  const dropdown = $('#alerts-dropdown');
  if(badge){
    if(list.length){ badge.textContent = list.length; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
  if(!dropdown) return list;
  if(!list.length){
    dropdown.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded icon">notifications</span><span>Nenhum alerta no momento.</span></div>`;
  }else{
    dropdown.innerHTML = list.map(a => `
      <div class="alert-item">
        <span class="alert-dot" style="background:${alertColor(a.level)}"></span>
        <div><b>${escapeHtml(a.titulo)}</b><span>${escapeHtml(a.desc)}</span></div>
      </div>
    `).join('');
  }
  return list;
}
