/* ══════════════════════════════════════════════════════════════════
   Autenticação, papéis e permissões
   Tenta Firebase Authentication (e-mail/senha) no mesmo projeto já
   usado pelo sistema; caso o provedor não esteja habilitado no
   console do Firebase, cai para "modo local" (identificação de
   sessão sem validação criptográfica — deixado explícito na UI).
   ══════════════════════════════════════════════════════════════════ */

const PERMISSIONS = {
  Administrador: new Set(['view','edit','delete','admin','reports','settings']),
  Supervisor:    new Set(['view','edit','reports']),
  Coordenador:   new Set(['view','edit_producao','reports']),
  Visualizador:  new Set(['view']),
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min de inatividade

const Auth = {
  currentUser: null,
  _timer: null,
  _onExpire: null,

  can(perm){
    if(!this.currentUser) return false;
    const set = PERMISSIONS[this.currentUser.papel] || PERMISSIONS.Visualizador;
    return set.has(perm);
  },

  isReadOnly(){ return !this.can('edit') && !this.can('edit_producao'); },

  async tryFirebaseLogin(email, senha){
    if(typeof firebase === 'undefined' || !firebase.auth){
      return { ok:false, reason:'sdk-indisponivel' };
    }
    try{
      const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
      return { ok:true, uid: cred.user.uid };
    }catch(e){
      return { ok:false, reason: e.code || 'erro-desconhecido' };
    }
  },

  loginLocal(nome, email, papel){
    this.currentUser = { nome, email, papel, via:'local' };
    this._afterLogin();
  },

  async loginFirebase(nome, email, papel){
    this.currentUser = { nome, email, papel, via:'firebase' };
    this._afterLogin();
  },

  _afterLogin(){
    sessionStorage.setItem('ivt_session', JSON.stringify(this.currentUser));
    this.startSessionTimer(() => this.expireSession());
  },

  restoreSession(){
    try{
      const raw = sessionStorage.getItem('ivt_session');
      if(raw){
        this.currentUser = JSON.parse(raw);
        this.startSessionTimer(() => this.expireSession());
        return true;
      }
    }catch(e){}
    return false;
  },

  logout(){
    this.currentUser = null;
    sessionStorage.removeItem('ivt_session');
    clearTimeout(this._timer);
    if(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser){
      firebase.auth().signOut().catch(()=>{});
    }
    if(this._onExpire) this._onExpire(false);
  },

  expireSession(){
    this.currentUser = null;
    sessionStorage.removeItem('ivt_session');
    if(this._onExpire) this._onExpire(true);
  },

  startSessionTimer(cb){
    this._onExpire = cb;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.expireSession(), SESSION_TIMEOUT_MS);
    ['click','keydown','mousemove','touchstart'].forEach(ev => {
      window.addEventListener(ev, () => this.resetSessionTimer(), { passive:true });
    });
  },

  resetSessionTimer(){
    if(!this.currentUser) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.expireSession(), SESSION_TIMEOUT_MS);
  },

  initials(nome){
    return (nome||'').split(' ').filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join('');
  },
};
