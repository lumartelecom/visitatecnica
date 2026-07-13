/* ══════════════════════════════════════════════════════════════════
   Modelo de dados + seed inicial + metas configuráveis
   ══════════════════════════════════════════════════════════════════ */

const METAS = {
  tec1:   { verde: 0.95, amarelo: 0.90 },
  sla:    { verde: 0.98, amarelo: 0.96 },
  qq:     { verde: 0.95, amarelo: 0.90 },
  ura:    { verde: 0.85, amarelo: 0.75 },
  tnps:   { verde: 0.80, amarelo: 0.65 },
  nr35:   { verde: 1.00, amarelo: 1.00 }, // válido / vencendo / vencido (tratado à parte)
  geo:    { verde: 0.95, amarelo: 0.90 },
  revisita:{ verde: 0.05, amarelo: 0.08, invertido: true }, // quanto menor, melhor
};

function statusFor(indicador, valor){
  const m = METAS[indicador];
  if(!m) return 'green';
  if(m.invertido){
    if(valor <= m.verde) return 'green';
    if(valor <= m.amarelo) return 'amber';
    return 'red';
  }
  if(valor >= m.verde) return 'green';
  if(valor >= m.amarelo) return 'amber';
  return 'red';
}

const SITUACOES = ['Ativo','Férias','Afastado','Plantão','Desligado'];
const EQUIPES = ['Equipe A','Equipe B','Equipe C'];
const PAPEIS = ['Administrador','Supervisor','Coordenador','Visualizador'];

function seedTechnicians(){
  const base = [
    { name:'Carlos Eduardo Silva', reg:'203948A', badge:'🥇' },
    { name:'Marcos Vinícius Souza', reg:'119823B', badge:'🥈' },
    { name:'João Pedro Santos', reg:'776611G', badge:'🥉' },
    { name:'Fernanda Costa', reg:'332177F', badge:'🎖️' },
    { name:'Lucas Ferreira', reg:'554211D', badge:'🎖️' },
    { name:'Ana Paula Lima', reg:'887321C', badge:'🎖️' },
    { name:'Roberto Alves', reg:'441299E', badge:'⚠️' },
  ];
  const today = new Date();
  return base.map((b, i) => {
    const tec1 = [0.965,0.952,0.950,0.941,0.938,0.912,0.895][i];
    const sla  = [0.985,0.981,0.978,0.965,0.962,0.951,0.942][i];
    const qq   = [0.97,0.96,0.95,0.94,0.93,0.90,0.88][i];
    const ura  = [0.90,0.88,0.86,0.84,0.82,0.80,0.76][i];
    const tnps = [88,85,85,80,78,75,68][i];
    const consultivo = [2450,3100,2900,1850,950,4150,400][i];
    return {
      id: 'T0' + (i+1),
      name: b.name,
      matricula: b.reg,
      foto: null,
      equipe: EQUIPES[i % EQUIPES.length],
      supervisor: 'Gestor Lumar',
      admissao: new Date(today.getFullYear() - (2 + i%3), (i*2)%12, 10).toISOString().slice(0,10),
      situacao: i === 6 ? 'Ativo' : 'Ativo',
      contato: `(11) 9${(8000+i*111)}-${(1000+i*222)}`,
      cnh: ['A','AB','B','AB','A','B','AB'][i],
      veiculo: `Moto Honda CG - PLC-${1000+i}`,
      equipamentos: ['Furadeira','Alicate crimpador','OTDR','Escada 5m'],
      badge: b.badge,
      indicadores: { tec1, sla, qq, ura, tnps: tnps/100, nr35: i===6?'vencendo':'válido', geo: 0.9+i*0.005, revisita: 0.03+i*0.01, retrabalho: 0.02+i*0.005 },
      consultivo: { ofertas: 40+i*3, aceitas: 30+i*2, instaladas: 25+i*2, canceladas: 2+i, valorVendido: consultivo*1.3, valorRecebido: consultivo, meta: 3000, comissao: consultivo*0.08 },
      producaoMensal: consultivo, // placeholder ligado a produção
    };
  });
}

function seedIndicatorHistory(technicians, days=14){
  const out = {};
  const today = new Date();
  technicians.forEach(t => {
    const keys = ['tec1','sla','qq','ura','tnps','geo'];
    const series = { };
    keys.forEach(k => {
      const target = k === 'tnps' ? t.indicadores.tnps : t.indicadores[k];
      const walk = [target];
      for(let i=1;i<days;i++){
        const prev = walk[i-1];
        const noise = (Math.random()-0.55) * 0.02;
        walk.push(Math.max(0, Math.min(1, prev - noise)));
      }
      series[k] = walk.reverse(); // ordem cronológica crescente
    });
    out[t.id] = [];
    for(let i=0;i<days;i++){
      const date = new Date(today); date.setDate(today.getDate() - (days-1-i));
      out[t.id].push({
        data: date.toISOString().slice(0,10),
        tec1: series.tec1[i], sla: series.sla[i], qq: series.qq[i],
        ura: series.ura[i], tnps: series.tnps[i], geo: series.geo[i],
      });
    }
  });
  return out;
}

function seedProduction(technicians){
  const days = 30;
  const out = [];
  const today = new Date();
  technicians.forEach(t => {
    for(let d=0; d<days; d++){
      const date = new Date(today); date.setDate(today.getDate() - d);
      const base = 4 + Math.round(Math.random()*4);
      out.push({
        id: `${t.id}-${date.toISOString().slice(0,10)}`,
        techId: t.id,
        data: date.toISOString().slice(0,10),
        os: base,
        instalacoes: Math.round(base*0.4),
        reparos: Math.round(base*0.35),
        mudancas: Math.round(base*0.1),
        retiradas: Math.round(base*0.15),
        revisitas: Math.random() < 0.15 ? 1 : 0,
        consultivos: Math.round(Math.random()*2),
        tempoMedioMin: 55 + Math.round(Math.random()*20),
        deslocamentoMin: 20 + Math.round(Math.random()*15),
        observacoes: '',
      });
    }
  });
  return out;
}

/** Data da Páscoa (algoritmo de Meeus/Jones/Butcher) — base p/ feriados móveis */
function easterDate(year){
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4, l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31), day = ((h+l-7*m+114)%31)+1;
  return new Date(year, month-1, day);
}

function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function toISODate(date){ return date.toISOString().slice(0,10); }

/** Feriados nacionais fixos + móveis (Carnaval, Sexta-feira Santa, Corpus Christi) */
function isNationalHoliday(date){
  const y = date.getFullYear();
  const md = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const fixos = new Set(['01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25']);
  if(fixos.has(md)) return true;
  const easter = easterDate(y);
  const moveis = [toISODate(addDays(easter,-47)), toISODate(addDays(easter,-2)), toISODate(addDays(easter,60))];
  return moveis.includes(toISODate(date));
}

function isPlantaoDay(date){ return date.getDay() === 0 || isNationalHoliday(date); }

/**
 * Gera escala de plantão: só ocorre aos domingos e feriados, com 2 técnicos
 * escalados por dia (rodízio round-robin entre a equipe ativa), e cada um
 * recebe uma folga compensatória no dia seguinte.
 */
function generateShiftsSchedule(technicians, startDate, days, rotationOffset=0){
  const ativos = technicians.filter(t => t.situacao !== 'Desligado');
  if(!ativos.length) return [];
  const out = [];
  let pointer = rotationOffset;
  for(let d=0; d<days; d++){
    const date = addDays(startDate, d);
    if(!isPlantaoDay(date)) continue;
    const dataStr = toISODate(date);
    const folgaStr = toISODate(addDays(date, 1));
    for(let k=0; k<Math.min(2, ativos.length); k++){
      const tech = ativos[(pointer+k) % ativos.length];
      out.push({ id:`${tech.id}-shift-${dataStr}`, techId:tech.id, data:dataStr, escala:'Plantão', troca:null, cobertura:null });
      out.push({ id:`${tech.id}-shift-${folgaStr}-folga`, techId:tech.id, data:folgaStr, escala:'Folga', troca:null, cobertura:'Compensação de plantão' });
    }
    pointer = (pointer + 2) % ativos.length;
  }
  return out;
}

function seedShifts(technicians){
  const today = new Date(); today.setHours(0,0,0,0);
  return generateShiftsSchedule(technicians, today, 90);
}

function seedVacations(technicians){
  const today = new Date();
  return technicians.slice(0,3).map((t,i) => ({
    id: t.id+'-ferias',
    techId: t.id,
    inicio: new Date(today.getFullYear(), today.getMonth()+1+i, 1).toISOString().slice(0,10),
    fim: new Date(today.getFullYear(), today.getMonth()+1+i, 30).toISOString().slice(0,10),
    tipo: 'Férias',
    status: 'Aprovado',
  }));
}

function defaultUsers(){
  return [
    { id:'u1', nome:'Gestor Lumar', email:'gestor@lumartelecom.com', papel:'Administrador' },
    { id:'u2', nome:'Supervisor Campo', email:'supervisor@lumartelecom.com', papel:'Supervisor' },
  ];
}

function freshState(){
  const technicians = seedTechnicians();
  return {
    technicians,
    production: seedProduction(technicians),
    shifts: seedShifts(technicians),
    vacations: seedVacations(technicians),
    history: seedIndicatorHistory(technicians),
    users: defaultUsers(),
    audit: [],
    metas: METAS,
    _ts: Date.now(),
  };
}
