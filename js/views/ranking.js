/* ══════════════════════════════════════════════════════════════════
   Ranking automático — geral e por indicador, com medalhas 🥇🥈🥉
   ══════════════════════════════════════════════════════════════════ */

const RANKING_WEIGHTS = { tec1:.25, sla:.20, qq:.15, tnps:.15, ura:.10, consultivo:.15 };

function productionTotal(state, techId, days=30){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
  return sum(state.production.filter(p => p.techId === techId && new Date(p.data) >= cutoff).map(p => p.os));
}

function computeGeneralRanking(state){
  const techs = state.technicians.filter(t => t.situacao !== 'Desligado');
  const maxConsultivo = Math.max(1, ...techs.map(t => t.consultivo?.valorRecebido || 0));
  const rows = techs.map(t => {
    const ind = t.indicadores;
    const consultivoNorm = (t.consultivo?.valorRecebido || 0) / maxConsultivo;
    const score =
      ind.tec1 * RANKING_WEIGHTS.tec1 +
      ind.sla  * RANKING_WEIGHTS.sla +
      ind.qq   * RANKING_WEIGHTS.qq +
      ind.tnps * RANKING_WEIGHTS.tnps +
      ind.ura  * RANKING_WEIGHTS.ura +
      consultivoNorm * RANKING_WEIGHTS.consultivo;
    return { tech:t, score };
  });
  rows.sort((a,b) => b.score - a.score);
  return rows;
}

function computeRankingBy(state, key){
  const techs = state.technicians.filter(t => t.situacao !== 'Desligado');
  let rows;
  if(key === 'producao'){
    rows = techs.map(t => ({ tech:t, value: productionTotal(state, t.id) }));
  }else if(key === 'consultivo'){
    rows = techs.map(t => ({ tech:t, value: t.consultivo?.valorRecebido || 0 }));
  }else{
    rows = techs.map(t => ({ tech:t, value: t.indicadores[key] ?? 0 }));
  }
  rows.sort((a,b) => b.value - a.value);
  return rows;
}

const RANKING_TABS = [
  { key:'geral', label:'Geral' },
  { key:'producao', label:'Produção' },
  { key:'tec1', label:'TEC1' },
  { key:'consultivo', label:'Consultivo' },
  { key:'sla', label:'SLA' },
  { key:'qq', label:'Qualidade' },
  { key:'tnps', label:'TNPS' },
  { key:'ura', label:'URA' },
];
let rankingActiveTab = 'geral';

function medalFor(pos){ return ['🥇','🥈','🥉'][pos] || `#${pos+1}`; }

function formatRankValue(key, value){
  if(key === 'consultivo') return fmtMoney(value);
  if(key === 'producao') return value + ' OS';
  if(['tec1','sla','qq','ura'].includes(key)) return fmtPct(value);
  if(key === 'tnps') return Math.round(value*100);
  return value;
}

function renderRankingView(state){
  const root = $('#view-ranking');
  if(!root) return;
  root.innerHTML = `
    <div class="view-head">
      <div><h1>Ranking da Equipe</h1><p class="text-2">Classificação automática — atualizado em tempo real.</p></div>
    </div>
    <div class="tabs" id="ranking-tabs">
      ${RANKING_TABS.map(t => `<button class="tab-btn ${t.key===rankingActiveTab?'active':''}" data-tab="${t.key}">${t.label}</button>`).join('')}
    </div>
    <div class="card" id="ranking-list"></div>
  `;
  $all('#ranking-tabs .tab-btn').forEach(btn => btn.onclick = () => {
    rankingActiveTab = btn.dataset.tab;
    renderRankingView(state);
  });
  renderRankingList(state);
}

function renderRankingList(state){
  const container = $('#ranking-list');
  if(!container) return;
  const key = rankingActiveTab;
  const rows = key === 'geral' ? computeGeneralRanking(state) : computeRankingBy(state, key);
  const maxScore = Math.max(...rows.map(r => r.score ?? r.value), 0.0001);

  container.innerHTML = rows.map((r,i) => {
    const t = r.tech;
    const val = key === 'geral' ? fmtPct(r.score) : formatRankValue(key, r.value);
    const barPct = Math.max(4, Math.round(((r.score ?? r.value) / maxScore) * 100));
    return `
      <div class="rank-row">
        <span class="rank-medal">${medalFor(i)}</span>
        <span class="tech-photo-ph">${escapeHtml(Auth.initials(t.name))}</span>
        <div class="rank-info">
          <b>${escapeHtml(t.name)}</b>
          <span>${escapeHtml(t.matricula)} · ${escapeHtml(t.equipe)}</span>
          <div class="rank-bar"><i style="width:${barPct}%"></i></div>
        </div>
        <span class="rank-score">${val}</span>
      </div>
    `;
  }).join('') || `<div class="empty-state"><span class="material-symbols-rounded icon">emoji_events</span><span>Sem dados suficientes.</span></div>`;
}
