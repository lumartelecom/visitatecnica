/* ══════════════════════════════════════════════════════════════════
   Camada de dados — abstrai localStorage + Firebase Firestore.
   Reaproveita o MESMO projeto Firebase já usado em ferramental.html,
   mas grava em um documento próprio ("indicadores_vt/estado") para
   não conflitar com os dados de inventário/ferramental.
   ══════════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCTaH9u-yy17w16vWDqOb4Z5xL6MAXwMhk",
  authDomain: "inventario-7e3e2.firebaseapp.com",
  projectId: "inventario-7e3e2",
  storageBucket: "inventario-7e3e2.firebasestorage.app",
  messagingSenderId: "309813669254",
  appId: "1:309813669254:web:fe624e072404ce5f405007"
};

const LOCAL_KEY = 'ivt_state_v1';
const DOC_PATH = ['indicadores_vt', 'estado'];

class SyncEngine {
  constructor(){
    this.db = null;
    this.saveTimer = null;
    this.unsub = null;
    this.onRemoteUpdate = null;
    this.lastLocalSaveTs = 0;
  }

  loadLocal(){
    try{
      const raw = localStorage.getItem(LOCAL_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ console.warn('Falha ao ler cache local', e); }
    return null;
  }

  saveLocal(state){
    try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); }catch(e){ console.warn('Falha ao salvar cache local', e); }
  }

  async initFirebase(){
    if(this.db) return this.db;
    try{
      let attempts = 0;
      while(typeof firebase === 'undefined' && attempts < 20){
        await new Promise(r => setTimeout(r, 250));
        attempts++;
      }
      if(typeof firebase === 'undefined'){
        console.warn('Firebase SDK não carregado — operando 100% offline (localStorage).');
        return null;
      }
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      this.db = firebase.firestore();
      try{ await this.db.enablePersistence({synchronizeTabs:true}); }
      catch(pe){ if(pe.code !== 'failed-precondition' && pe.code !== 'unimplemented') console.warn('Persistência offline:', pe.code); }
      return this.db;
    }catch(e){
      console.warn('Falha ao iniciar Firebase:', e);
      return null;
    }
  }

  async pull(){
    const db = await this.initFirebase();
    if(!db) return null;
    try{
      const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
      if(snap.exists) return snap.data();
      return null;
    }catch(e){
      console.warn('Falha ao buscar dados remotos:', e);
      return null;
    }
  }

  listenRealtime(cb){
    if(!this.db) return;
    this.unsub = this.db.collection(DOC_PATH[0]).doc(DOC_PATH[1])
      .onSnapshot(snap => {
        if(!snap.exists) return;
        const data = snap.data();
        if(data && data._ts && data._ts !== this.lastLocalSaveTs) cb(data);
      }, err => console.warn('Listener em tempo real falhou:', err));
  }

  scheduleSave(state){
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(state), 900);
  }

  async persist(state){
    state._ts = Date.now();
    this.lastLocalSaveTs = state._ts;
    this.saveLocal(state);
    const db = await this.initFirebase();
    if(!db) return;
    try{
      await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).set(state);
    }catch(e){
      console.warn('Falha ao sincronizar com a nuvem (dados mantidos localmente):', e);
    }
  }
}

const Sync = new SyncEngine();
