/* ══════════════════════════════════════════════════════════════════
   Administração — usuários, papéis, metas configuráveis, auditoria
   ══════════════════════════════════════════════════════════════════ */

function renderAdminView(state){
  const root = $('#view-admin');
  if(!root) return;
  if(!Auth.can('admin')){
    root.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded icon">lock</span><span>Acesso restrito ao papel Administrador.</span></div>`;
    return;
  }
  root.innerHTML = `
    <div class="view-head"><div><h1>Administração</h1><p class="text-2">Usuários, permissões, metas e auditoria do sistema.</p></div></div>

    <div class="grid" style="grid-template-columns:1.3fr 1fr; align-items:start">
      <div class="card">
        <div class="flex justify-between items-center" style="margin-bottom:4px">
          <h4 class="card-title" style="margin:0">Usuários Autorizados</h4>
          <button class="btn btn-primary btn-sm" id="btn-new-user"><span class="material-symbols-rounded icon">person_add</span>Adicionar Acesso</button>
        </div>
        <p class="card-sub" style="margin-bottom:12px">Somente e-mails cadastrados aqui conseguem fazer login no sistema. O papel definido abaixo é o que vale no login, independente do que a pessoa selecionar na tela de entrada.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th class="text-right">Ações</th></tr></thead>
          <tbody>${state.users.map(u => `
            <tr><td><b>${escapeHtml(u.nome)}</b>${Auth.currentUser?.email?.toLowerCase()===u.email.toLowerCase() ? ' <span class="text-3" style="font-size:11px">(você)</span>' : ''}</td><td class="text-2">${escapeHtml(u.email)}</td>
              <td><span class="chip status-blue" style="background:var(--indigo-soft); color:var(--indigo)">${escapeHtml(u.papel)}</span></td>
              <td class="text-right">
                <button class="btn btn-sm btn-ghost" onclick="editUserPapel(State,'${u.id}')">Alterar Papel</button>
                <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="removeUserAccess(State,'${u.id}')">Remover Acesso</button>
              </td>
            </tr>`).join('') || `<tr><td colspan="4"><div class="empty-state"><span class="material-symbols-rounded icon">person_off</span><span>Nenhum usuário autorizado ainda.</span></div></td></tr>`}</tbody>
        </table></div>
      </div>

      <div class="card">
        <h4 class="card-title" style="margin-bottom:12px">Metas por Indicador</h4>
        ${Object.entries(METAS).filter(([k])=>k!=='nr35').map(([k,m]) => `
          <div class="field-row" style="align-items:end">
            <div class="field"><label>${k.toUpperCase()} — Verde ≥</label><input type="number" step="0.01" min="0" max="1" id="meta-${k}-verde" value="${m.verde}"></div>
            <div class="field"><label>Amarelo ≥</label><input type="number" step="0.01" min="0" max="1" id="meta-${k}-amarelo" value="${m.amarelo}"></div>
          </div>
        `).join('')}
        <button class="btn btn-primary btn-sm w-full" id="btn-save-metas">Salvar Metas</button>
      </div>
    </div>

    <div class="card mt-4">
      <h4 class="card-title" style="margin-bottom:12px">Log de Auditoria</h4>
      <div class="table-wrap"><table>
        <thead><tr><th>Quando</th><th>Usuário</th><th>Entidade</th><th>Campo</th><th>Anterior</th><th>Novo</th><th>Motivo</th></tr></thead>
        <tbody>${state.audit.slice(0,100).map(a => `
          <tr><td class="text-2">${fmtDateTime(a.ts)}</td><td>${escapeHtml(a.usuario)}</td><td class="text-2">${escapeHtml(a.entidade)}</td>
            <td class="text-2">${escapeHtml(a.campo)}</td>
            <td class="text-2" style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(JSON.stringify(a.valorAnterior))}</td>
            <td class="text-2" style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(JSON.stringify(a.valorNovo))}</td>
            <td class="text-2">${escapeHtml(a.motivo)}</td>
          </tr>`).join('') || `<tr><td colspan="7"><div class="empty-state"><span class="material-symbols-rounded icon">history</span><span>Nenhuma alteração registrada ainda.</span></div></td></tr>`}</tbody>
      </table></div>
    </div>
  `;

  $('#btn-new-user').onclick = () => openUserModal(state);
  $('#btn-save-metas').onclick = () => saveMetas(state);
}

function openUserModal(state){
  const body = `
    <div class="field"><label>Nome</label><input id="u-nome"></div>
    <div class="field"><label>E-mail</label><input type="email" id="u-email"></div>
    <div class="field"><label>Papel</label><select id="u-papel">${PAPEIS.map(p=>`<option>${p}</option>`).join('')}</select></div>
  `;
  openModal('Novo Usuário', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Criar', className:'btn-primary', onClick: () => {
      const nome = $('#u-nome').value.trim(), email = $('#u-email').value.trim();
      if(!nome || !email){ toast('Preencha nome e e-mail.', 'error'); return; }
      if(state.users.some(u => u.email.toLowerCase() === email.toLowerCase())){ toast('Já existe um acesso cadastrado para esse e-mail.', 'error'); return; }
      state.users.push({ id:'u'+Date.now().toString(36), nome, email, papel:$('#u-papel').value });
      logAudit(state, { entidade:'usuario', entidadeId:email, campo:'cadastro', antes:null, depois:nome, motivo:'Novo acesso autorizado' });
      closeModal(); Sync.scheduleSave(state); renderAdminView(state);
      toast(`Acesso liberado para ${nome}.`, 'success');
    }},
  ]);
}

function editUserPapel(state, userId){
  const u = state.users.find(x=>x.id===userId);
  if(!u) return;
  const body = `<div class="field"><label>Papel de ${escapeHtml(u.nome)}</label><select id="u-papel-edit">${PAPEIS.map(p=>`<option ${u.papel===p?'selected':''}>${p}</option>`).join('')}</select></div>`;
  openModal('Alterar Papel', body, [
    { label:'Cancelar', className:'btn-secondary', onClick: closeModal },
    { label:'Salvar', className:'btn-primary', onClick: () => {
      const novoPapel = $('#u-papel-edit').value;
      const outrosAdmins = state.users.filter(x => x.id !== u.id && x.papel === 'Administrador').length;
      if(u.papel === 'Administrador' && novoPapel !== 'Administrador' && outrosAdmins === 0){
        toast('Não é possível remover o último Administrador do sistema.', 'error'); return;
      }
      const before = u.papel;
      u.papel = novoPapel;
      logAudit(state, { entidade:'usuario', entidadeId:u.id, campo:'papel', antes:before, depois:u.papel, motivo:'Alteração de permissão' });
      closeModal(); Sync.scheduleSave(state); renderAdminView(state);
      toast(`Papel de ${u.nome} atualizado.`, 'success');
    }},
  ]);
}

function removeUserAccess(state, userId){
  const u = state.users.find(x=>x.id===userId);
  if(!u) return;
  const outrosAdmins = state.users.filter(x => x.id !== u.id && x.papel === 'Administrador').length;
  if(u.papel === 'Administrador' && outrosAdmins === 0){
    toast('Não é possível remover o último Administrador do sistema.', 'error'); return;
  }
  if(!confirm(`Remover o acesso de ${u.nome} (${u.email})? A pessoa não conseguirá mais fazer login.`)) return;
  logAudit(state, { entidade:'usuario', entidadeId:u.id, campo:'remocao_acesso', antes:u.email, depois:null, motivo:'Acesso revogado' });
  state.users = state.users.filter(x => x.id !== userId);
  Sync.scheduleSave(state);
  renderAdminView(state);
  toast(`Acesso de ${u.nome} removido.`, 'success');
}

function saveMetas(state){
  Object.keys(METAS).filter(k=>k!=='nr35').forEach(k => {
    const verde = +$('#meta-'+k+'-verde').value;
    const amarelo = +$('#meta-'+k+'-amarelo').value;
    if(!isNaN(verde)) state.metas[k].verde = METAS[k].verde = verde;
    if(!isNaN(amarelo)) state.metas[k].amarelo = METAS[k].amarelo = amarelo;
  });
  logAudit(state, { entidade:'metas', entidadeId:'global', campo:'metas', antes:null, depois:JSON.stringify(state.metas), motivo:'Ajuste de metas' });
  Sync.scheduleSave(state);
  refreshGlobalWidgets(state);
  toast('Metas atualizadas.', 'success');
}
