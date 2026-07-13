/* ══════════════════════════════════════════════════════════════════
   Bootstrap, roteador e wiring geral da aplicação
   ══════════════════════════════════════════════════════════════════ */

let State = null;
let currentViewKey = 'dashboard';

const Views = {
  dashboard: renderDashboardView,
  technicians: renderTechniciansView,
  'technician-profile': renderTechnicianProfile,
  production: renderProductionView,
  consultivo: renderConsultivoView,
  shifts: renderShiftsView,
  vacations: renderVacationsView,
  ranking: renderRankingView,
  reports: renderReportsView,
  admin: renderAdminView,
};

const NAV_MAP = { dashboard:'dashboard', technicians:'technicians', 'technician-profile':'technicians', production:'production', consultivo:'consultivo', shifts:'shifts', vacations:'vacations', ranking:'ranking', reports:'reports', admin:'admin' };

function switchView(key, args={}){
  if(!Views[key]) return;
  currentViewKey = key;
  $all('.view').forEach(v => v.classList.remove('active'));
  const target = $('#view-' + key);
  if(target) target.classList.add('active');
  $all('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === NAV_MAP[key]));
  Views[key](State, args);
  $('.viewport').scrollTo?.({ top:0, behavior:'instant' });
  history.replaceState(null, '', '#' + key);
}

function refreshGlobalWidgets(state){
  renderAlertsDropdown(state);
  if(Views[currentViewKey]) Views[currentViewKey](state, {});
}

function handleGlobalSearch(value){
  if(currentViewKey === 'technicians'){ techListFilters.termo = value; renderTechListBody(State); }
  else if(currentViewKey === 'dashboard'){ renderDashboardTable(State, filterTechnicians(State), value); }
}

/* ── Tema ─────────────────────────────────────────────────────────── */
function applyTheme(dark){
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('ivt_theme', dark ? 'dark' : 'light');
  if(State) refreshGlobalWidgets(State); // recarrega cores de gráficos
}
function initTheme(){
  const saved = localStorage.getItem('ivt_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : !!prefersDark);
}

/* ── Sidebar / mobile ────────────────────────────────────────────── */
function toggleSidebar(){ $('#sidebar').classList.toggle('collapsed'); }
function toggleMobileSidebar(){ $('#sidebar').classList.toggle('mobile-open'); }

/* ── Login ───────────────────────────────────────────────────────── */
function renderLoginScreen(){
  $('#login-screen').innerHTML = `
    <div class="login-card">
      <div class="login-logo">L</div>
      <h2>Indicadores VT — Lumar Telecom</h2>
      <p>Acesso restrito à operação de campo TSA-Lumar-VT</p>
      <div class="field"><label>Nome Completo</label><input id="login-nome" placeholder="Seu nome"></div>
      <div class="field"><label>E-mail Corporativo</label><input id="login-email" type="email" placeholder="voce@lumartelecom.com"></div>
      <div class="field"><label>Senha (Firebase Authentication — opcional)</label><input id="login-senha" type="password" placeholder="Deixe em branco para modo local"></div>
      <button class="btn btn-primary w-full" id="btn-login" style="justify-content:center">Entrar</button>
      <p class="text-3" style="margin-top:14px; font-size:11px; text-align:center">Seu e-mail precisa estar cadastrado em <b>Administração &gt; Usuários Autorizados</b>. O papel de acesso é definido por esse cadastro, não escolhido aqui.</p>
    </div>
  `;
  $('#btn-login').onclick = doLogin;
}

async function doLogin(){
  const nome = $('#login-nome').value.trim();
  const email = $('#login-email').value.trim();
  const senha = $('#login-senha').value;
  if(!nome || !email){ toast('Informe nome e e-mail.', 'error'); return; }

  let existing = State.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if(!existing){
    if(State.users.length === 0){
      existing = { id:'u'+Date.now().toString(36), nome, email, papel:'Administrador' };
      State.users.push(existing);
      Sync.scheduleSave(State);
      toast('Primeiro acesso: você foi cadastrado automaticamente como Administrador.', 'info');
    }else{
      toast('E-mail não autorizado. Peça a um administrador para cadastrar seu acesso em Administração > Usuários Autorizados.', 'error');
      return;
    }
  }
  const papel = existing.papel;

  if(senha){
    const result = await Auth.tryFirebaseLogin(email, senha);
    if(result.ok){
      Auth.loginFirebase(nome, email, papel);
      toast('Login realizado via Firebase Authentication.', 'success');
      finishLogin();
      return;
    }
    toast(`Autenticação Firebase indisponível (${result.reason}). Prosseguindo em modo local.`, 'warning');
  }
  Auth.loginLocal(nome, email, papel);
  finishLogin();
}

function finishLogin(){
  Auth._onExpire = (expired) => {
    $('#login-screen').style.display = 'flex';
    $('.app-shell').style.display = 'none';
    if(expired) toast('Sessão expirada por inatividade. Faça login novamente.', 'warning');
    renderLoginScreen();
  };
  $('#login-screen').style.display = 'none';
  $('.app-shell').style.display = 'flex';
  renderUserFooter();
  switchView('dashboard');
}

function renderUserFooter(){
  const u = Auth.currentUser;
  $('#sidebar-avatar').textContent = Auth.initials(u.nome);
  $('#sidebar-who-name').textContent = u.nome;
  $('#sidebar-who-role').textContent = u.papel;
}

/* ── Bootstrap ───────────────────────────────────────────────────── */
async function boot(){
  initTheme();

  const remote = await Sync.pull();
  State = remote || Sync.loadLocal() || freshState();
  if(!State.history) State.history = seedIndicatorHistory(State.technicians);
  Sync.saveLocal(State);

  Sync.listenRealtime(remoteState => {
    State = remoteState;
    toast('Dados atualizados em tempo real por outro usuário.', 'info', 3000);
    if(document.querySelector('.app-shell').style.display !== 'none') refreshGlobalWidgets(State);
  });

  $('#toast-container'); // garante existência

  if(Auth.restoreSession()){
    finishLogin();
  }else{
    renderLoginScreen();
  }

  $('#btn-toggle-sidebar').onclick = toggleSidebar;
  $('#btn-mobile-sidebar')?.addEventListener('click', toggleMobileSidebar);
  $('#btn-dark-mode').onclick = () => applyTheme(!document.documentElement.classList.contains('dark'));
  $('#btn-logout').onclick = () => Auth.logout();
  $('#global-search').oninput = debounce(e => handleGlobalSearch(e.target.value), 200);
  $('#btn-alerts').onclick = () => $('#alerts-dropdown').classList.toggle('open');
  document.addEventListener('click', e => {
    if(!e.target.closest('.alerts-wrap')) $('#alerts-dropdown')?.classList.remove('open');
  });
  $all('.nav-item[data-nav]').forEach(btn => btn.onclick = () => switchView(btn.dataset.nav));

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', boot);
