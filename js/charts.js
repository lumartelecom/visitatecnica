/* ══════════════════════════════════════════════════════════════════
   Fábrica de gráficos — Chart.js (line, bar, pie, radar, gauge) +
   heatmap/timeline em HTML/CSS puro (não requerem Chart.js).
   ══════════════════════════════════════════════════════════════════ */

const ChartRegistry = new Map();

function destroyChart(id){
  const existing = ChartRegistry.get(id);
  if(existing){ existing.destroy(); ChartRegistry.delete(id); }
}

function themeColors(){
  const dark = document.documentElement.classList.contains('dark');
  return {
    grid: dark ? 'rgba(255,255,255,.06)' : 'rgba(16,24,40,.06)',
    text: dark ? '#9AA4BD' : '#475467',
  };
}

function buildLineChart(canvasId, labels, datasets){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if(!ctx || typeof Chart === 'undefined') return null;
  const { grid, text } = themeColors();
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: datasets.map(d => ({
      tension: .35, borderWidth: 3, pointRadius: 2, pointHoverRadius: 4, fill: d.fill ?? false, ...d
    })) },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: datasets.length > 1, labels: { color: text, boxWidth: 10, font: {size:11} } } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: text, font:{size:11} } },
        y: { grid: { color: grid }, ticks: { color: text, font:{size:11} } },
      }
    }
  });
  ChartRegistry.set(canvasId, chart);
  return chart;
}

function buildBarChart(canvasId, labels, datasets, horizontal=false){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if(!ctx || typeof Chart === 'undefined') return null;
  const { grid, text } = themeColors();
  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: datasets.map(d => ({ borderRadius: 6, maxBarThickness: 32, ...d })) },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels: { color: text, boxWidth:10, font:{size:11} } } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: text, font:{size:11} } },
        y: { grid: { color: grid }, ticks: { color: text, font:{size:11} } },
      }
    }
  });
  ChartRegistry.set(canvasId, chart);
  return chart;
}

function buildPieChart(canvasId, labels, data, colors){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if(!ctx || typeof Chart === 'undefined') return null;
  const { text } = themeColors();
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: 'transparent' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { color: text, boxWidth:10, font:{size:11} } } }
    }
  });
  ChartRegistry.set(canvasId, chart);
  return chart;
}

function buildRadarChart(canvasId, labels, datasets){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if(!ctx || typeof Chart === 'undefined') return null;
  const { grid, text } = themeColors();
  const chart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets: datasets.map(d => ({ borderWidth:2, pointRadius:2, ...d })) },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels:{color:text} } },
      scales: { r: { grid:{color:grid}, angleLines:{color:grid}, pointLabels:{color:text, font:{size:11}}, ticks:{display:false, backdropColor:'transparent'} } }
    }
  });
  ChartRegistry.set(canvasId, chart);
  return chart;
}

/** Gauge visual = doughnut semicircular */
function buildGaugeChart(canvasId, value01, color){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if(!ctx || typeof Chart === 'undefined') return null;
  const { grid } = themeColors();
  const pct = Math.max(0, Math.min(1, value01));
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [pct, 1-pct], backgroundColor: [color, grid], borderWidth:0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout:'75%',
      rotation: -90, circumference: 180,
      plugins: { legend: { display:false }, tooltip:{ enabled:false } }
    }
  });
  ChartRegistry.set(canvasId, chart);
  return chart;
}

/** Heatmap simples de produção diária (grid CSS, sem lib) */
function renderHeatmap(containerId, values /* array 0..1 por dia */){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  const max = Math.max(1, ...values);
  values.forEach(v => {
    const intensity = v / max;
    const cell = el('div', { className: 'cell' });
    cell.style.background = intensity === 0
      ? 'var(--surface-2)'
      : `color-mix(in srgb, var(--red) ${Math.round(intensity*90)}%, var(--surface-2))`;
    cell.title = v;
    container.appendChild(cell);
  });
}

/** Timeline em HTML/CSS a partir de uma lista de eventos {titulo, data, desc} */
function renderTimeline(containerId, items){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!items.length){
    container.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded icon">history</span><span>Nenhum evento registrado.</span></div>`;
    return;
  }
  container.innerHTML = `<div class="timeline">${items.map(it => `
    <div class="timeline-item">
      <b>${escapeHtml(it.titulo)}</b>
      <span>${escapeHtml(it.data)}${it.desc ? ' · ' + escapeHtml(it.desc) : ''}</span>
    </div>
  `).join('')}</div>`;
}
