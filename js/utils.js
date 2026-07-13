/* ══════════════════════════════════════════════════════════════════
   Utilitários: toast, modal, formatação, exportação, auditoria
   ══════════════════════════════════════════════════════════════════ */

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function el(tag, opts={}){
  const e = document.createElement(tag);
  if(opts.className) e.className = opts.className;
  if(opts.html !== undefined) e.innerHTML = opts.html;
  if(opts.text !== undefined) e.textContent = opts.text;
  if(opts.attrs) Object.entries(opts.attrs).forEach(([k,v]) => e.setAttribute(k,v));
  return e;
}

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function fmtPct(v, digits=1){ return (v*100).toFixed(digits) + '%'; }
function fmtMoney(v){ return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtDate(d){
  if(!d) return '—';
  const dt = typeof d === 'string' ? new Date(d+'T00:00:00') : d;
  if(isNaN(dt)) return '—';
  return dt.toLocaleDateString('pt-BR');
}
function fmtDateTime(ts){
  const dt = new Date(ts);
  return dt.toLocaleString('pt-BR');
}
function daysBetween(a,b){
  const d1 = new Date(a+'T00:00:00'), d2 = new Date(b+'T00:00:00');
  return Math.round((d2-d1)/86400000);
}
function statusLabel(s){ return {green:'Dentro da meta', amber:'Atenção', red:'Crítico'}[s] || s; }

function toast(msg, type='info', ms=4500){
  const container = $('#toast-container');
  if(!container) return;
  const icons = { info:'info', success:'check_circle', error:'error', warning:'warning' };
  const t = el('div', { className: `toast ${type}`, html: `
    <span class="material-symbols-rounded" style="font-size:19px">${icons[type]||'info'}</span>
    <span>${msg}</span>
  `});
  container.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),200); }, ms);
}

function openModal(title, bodyHtml, footButtons=[]){
  const overlay = $('#modal-overlay');
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  const foot = $('#modal-foot');
  foot.innerHTML = '';
  footButtons.forEach(b => {
    const btn = el('button', { className: `btn ${b.className||'btn-secondary'}`, text: b.label });
    btn.onclick = b.onClick;
    foot.appendChild(btn);
  });
  overlay.classList.add('open');
  return overlay;
}
function closeModal(){ $('#modal-overlay').classList.remove('open'); }

function logAudit(state, { entidade, entidadeId, campo, antes, depois, motivo }){
  state.audit.unshift({
    id: 'a' + Date.now() + Math.random().toString(36).slice(2,6),
    ts: Date.now(),
    usuario: (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.nome : 'Sistema',
    entidade, entidadeId, campo,
    valorAnterior: antes, valorNovo: depois,
    motivo: motivo || '',
  });
  if(state.audit.length > 500) state.audit.length = 500;
}

function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { attrs: { href: url, download: filename } });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows, headers){
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const lines = [headers.map(esc).join(';')];
  rows.forEach(r => lines.push(r.map(esc).join(';')));
  return '﻿' + lines.join('\r\n');
}

function debounce(fn, ms){
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

/** Regressão linear simples p/ previsão de tendência (heurística, não IA real) */
function linearTrend(values){
  const n = values.length;
  if(n < 2) return { slope:0, intercept: values[0]||0 };
  const xs = values.map((_,i)=>i);
  const xMean = avg(xs), yMean = avg(values);
  let num=0, den=0;
  for(let i=0;i<n;i++){ num += (xs[i]-xMean)*(values[i]-yMean); den += (xs[i]-xMean)**2; }
  const slope = den ? num/den : 0;
  return { slope, intercept: yMean - slope*xMean };
}
function predictNext(values, stepsAhead=1){
  const { slope, intercept } = linearTrend(values);
  return intercept + slope*(values.length - 1 + stepsAhead);
}
