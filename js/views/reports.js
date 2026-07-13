/* ══════════════════════════════════════════════════════════════════
   Relatórios — CSV, Excel, PDF e Impressão
   ══════════════════════════════════════════════════════════════════ */

const REPORT_TYPES = {
  tecnicos:   { label:'Técnicos', headers:['Nome','Matrícula','Equipe','Supervisor','Situação','TEC1','SLA','QQ'],
    rows: state => state.technicians.map(t=>[t.name, t.matricula, t.equipe, t.supervisor, t.situacao, fmtPct(t.indicadores.tec1), fmtPct(t.indicadores.sla), fmtPct(t.indicadores.qq)]) },
  producao:   { label:'Produção', headers:['Data','Técnico','OS','Instalações','Reparos','Revisitas'],
    rows: state => state.production.slice(0,300).map(p=>{ const t=state.technicians.find(x=>x.id===p.techId); return [fmtDate(p.data), t?.name||'—', p.os, p.instalacoes, p.reparos, p.revisitas]; }) },
  consultivo: { label:'Consultivo', headers:['Técnico','Ofertas','Instaladas','Vendido','Recebido','Comissão'],
    rows: state => state.technicians.map(t=>[t.name, t.consultivo?.ofertas||0, t.consultivo?.instaladas||0, (t.consultivo?.valorVendido||0).toFixed(2), (t.consultivo?.valorRecebido||0).toFixed(2), (t.consultivo?.comissao||0).toFixed(2)]) },
  ranking:    { label:'Ranking Geral', headers:['Posição','Técnico','Matrícula','Pontuação'],
    rows: state => computeGeneralRanking(state).map((r,i)=>[i+1, r.tech.name, r.tech.matricula, (r.score*100).toFixed(1)+'%']) },
  alertas:    { label:'Alertas', headers:['Nível','Título','Descrição'],
    rows: state => computeAlerts(state).map(a=>[a.level.toUpperCase(), a.titulo, a.desc]) },
};

let reportActiveType = 'tecnicos';

function renderReportsView(state){
  const root = $('#view-reports');
  if(!root) return;
  root.innerHTML = `
    <div class="view-head">
      <div><h1>Relatórios Gerenciais</h1><p class="text-2">Gere e compartilhe relatórios em CSV, Excel, PDF ou impressão direta.</p></div>
    </div>
    <div class="filters-bar">
      <label>Relatório</label>
      <select id="rep-type">${Object.entries(REPORT_TYPES).map(([k,v])=>`<option value="${k}" ${reportActiveType===k?'selected':''}>${v.label}</option>`).join('')}</select>
      <div class="view-actions" style="margin-left:auto">
        <button class="btn btn-secondary btn-sm" id="rep-csv"><span class="material-symbols-rounded icon">description</span>CSV</button>
        <button class="btn btn-secondary btn-sm" id="rep-xlsx"><span class="material-symbols-rounded icon">grid_on</span>Excel</button>
        <button class="btn btn-secondary btn-sm" id="rep-pdf"><span class="material-symbols-rounded icon">picture_as_pdf</span>PDF</button>
        <button class="btn btn-secondary btn-sm" id="rep-print"><span class="material-symbols-rounded icon">print</span>Imprimir</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr id="rep-thead"></tr></thead>
        <tbody id="rep-tbody"></tbody>
      </table></div>
    </div>
  `;
  $('#rep-type').onchange = e => { reportActiveType = e.target.value; renderReportTable(state); };
  $('#rep-csv').onclick = () => exportReportCSV(state);
  $('#rep-xlsx').onclick = () => exportReportXLSX(state);
  $('#rep-pdf').onclick = () => exportReportPDF(state);
  $('#rep-print').onclick = () => window.print();
  renderReportTable(state);
}

function renderReportTable(state){
  const def = REPORT_TYPES[reportActiveType];
  const rows = def.rows(state);
  $('#rep-thead').innerHTML = def.headers.map(h=>`<th>${h}</th>`).join('');
  $('#rep-tbody').innerHTML = rows.map(r => `<tr>${r.map(c=>`<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
    || `<tr><td colspan="${def.headers.length}"><div class="empty-state"><span class="material-symbols-rounded icon">summarize</span><span>Sem dados para este relatório.</span></div></td></tr>`;
}

function exportReportCSV(state){
  const def = REPORT_TYPES[reportActiveType];
  downloadBlob(toCSV(def.rows(state), def.headers), `relatorio-${reportActiveType}-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  toast('CSV exportado.', 'success');
}

function exportReportXLSX(state){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca Excel indisponível offline — use CSV ou Impressão.', 'warning'); return; }
  const def = REPORT_TYPES[reportActiveType];
  const aoa = [def.headers, ...def.rows(state)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.label.slice(0,28));
  XLSX.writeFile(wb, `relatorio-${reportActiveType}-${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado.', 'success');
}

function exportReportPDF(state){
  if(!window.jspdf || !window.jspdf.jsPDF){ toast('Biblioteca de PDF indisponível offline — use Imprimir para salvar como PDF.', 'warning'); return; }
  const def = REPORT_TYPES[reportActiveType];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  doc.setFontSize(14); doc.text(`Relatório — ${def.label}`, 14, 16);
  doc.setFontSize(9); doc.text(`Lumar Telecom · Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 22);

  const colW = 180 / def.headers.length;
  let y = 32;
  doc.setFontSize(9); doc.setFont(undefined, 'bold');
  def.headers.forEach((h,i) => doc.text(String(h), 14 + i*colW, y));
  doc.setFont(undefined, 'normal');
  y += 6;
  def.rows(state).forEach(row => {
    if(y > 280){ doc.addPage(); y = 16; }
    row.forEach((c,i) => doc.text(String(c).slice(0,22), 14 + i*colW, y));
    y += 6;
  });
  doc.save(`relatorio-${reportActiveType}-${new Date().toISOString().slice(0,10)}.pdf`);
  toast('PDF exportado.', 'success');
}
