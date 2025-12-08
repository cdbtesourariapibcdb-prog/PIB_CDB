/* dashboard_admin.js - Admin com formulários (modal) para CRUD
   Requisitos: auth.js presente, Chart.js, PapaParse (CDN no admin.html)
*/

/* ============ CONFIG ============ */
const API_URL = "https://script.google.com/macros/s/AKfycbzV1eTn_eoldgPtfOlAZRAlJGQoK2WU1BG-cixCKEzv_nn_IxYOSEaCpyOLWWG57JLv/exec";

/* abas / nomes exatos */
const SHEETS = {
  entradas: "Entradas",
  saidas: "Saídas",
  dizimistas: "Dizimistas",
  fixas: "Despesas  Fixas"
};

/* cabeçalhos esperados - ordem usada ao enviar via appendRow / setValues */
const HEADERS = {
  "Entradas": ["Data","Valor","Nome","Descrição"],
  "Saídas": ["Data","Valor","Descrição","Responsável"],
  "Dizimistas": ["Nome","Telefone","Observações"],
  "Despesas  Fixas": ["Nome da Despesa","Valor","Dia do Vencimento","Observação"]
};

/* ============ HELPERS ============ */
function apiGet(action){
  return fetch(`${API_URL}?action=${action}`).then(r=>r.text()).then(txt=>{
    try { return JSON.parse(txt); } catch(e){ console.error('API GET parse', e, txt); throw e; }
  });
}

async function apiPost(action, sheetName, payload = {}) {
  const form = new URLSearchParams();
  form.append('action', action);
  form.append('sheet', sheetName);
  if (payload.data !== undefined) form.append('data', JSON.stringify(payload.data));
  if (payload.row !== undefined) form.append('row', String(payload.row));
  const resp = await fetch(API_URL, { method: 'POST', body: form });
  const text = await resp.text();
  return { ok: resp.ok, text, status: resp.status };
}

/* modal utilities */
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');

let currentForm = null; // {sheet, row, headers, mode:'add'|'edit', data}

function openModal(mode, sheetKey, row = null, rowData = null){
  const sheetName = SHEETS[sheetKey];
  const headers = HEADERS[sheetName];
  currentForm = { mode, sheetKey, sheetName, row, headers, rowData };
  modalTitle.innerText = (mode === 'add' ? `Adicionar em ${sheetName}` : `Editar linha ${row}`);
  modalBody.innerHTML = '';
  // build inputs
  headers.forEach(h=>{
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    const label = document.createElement('label');
    label.className = 'small';
    label.innerText = h;
    const input = document.createElement('input');
    input.name = h;
    input.value = rowData && rowData[h] ? rowData[h] : '';
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    modalBody.appendChild(wrapper);
  });
  modal.style.display = 'flex';
}

function closeModal(){
  modal.style.display = 'none';
  currentForm = null;
}

/* collect values from modal form as array in header order */
function collectModalValues(){
  if(!currentForm) return null;
  const values = [];
  currentForm.headers.forEach(h=>{
    const input = modalBody.querySelector(`[name="${h}"]`);
    values.push(input ? input.value : "");
  });
  return values;
}

/* ============ CRUD UI actions ============ */
async function addRecord(sheetKey){
  openModal('add', sheetKey);
}

async function editRecord(sheetKey, sheetRow, rowObj){
  // sheetRow = row number in sheet
  // rowObj = object with header->value
  openModal('edit', sheetKey, sheetRow, rowObj);
}

async function deleteRecord(sheetKey, sheetRow){
  if(!confirm('Confirma exclusão desta linha? A operação não pode ser desfeita.')) return;
  const res = await apiPost('delete', SHEETS[sheetKey], { row: sheetRow });
  if(res.ok) { alert('Registro excluído'); refreshAll(); } else { alert('Erro: ' + res.text); }
}

/* modal save handler */
modalSave.addEventListener('click', async ()=>{
  if(!currentForm) return;
  const values = collectModalValues();
  if(currentForm.mode === 'add'){
    const r = await apiPost('add', currentForm.sheetName, { data: values });
    if(r.ok) { alert('Adicionado'); closeModal(); refreshAll(); } else { alert('Erro: ' + r.text); }
  } else {
    const r = await apiPost('update', currentForm.sheetName, { row: currentForm.row, data: values });
    if(r.ok) { alert('Atualizado'); closeModal(); refreshAll(); } else { alert('Erro: ' + r.text); }
  }
});

/* ============ render tables with action buttons ============ */
function renderTableWithActions(containerId, sheetKey, rows){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if(!rows || rows.length === 0){ container.innerHTML = '<p class="small">Nenhum dado disponível.</p>'; return; }
  const headers = HEADERS[SHEETS[sheetKey]];
  // header row
  let html = '<table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  html += '<th>Ações</th></tr></thead><tbody>';
  rows.forEach((r, idx) => {
    // r is array-of-values
    html += '<tr>';
    headers.forEach((h,i)=> html += `<td>${r[i] ?? ""}</td>`);
    const sheetRow = idx + 2; // assumes header at row 1
    // build rowObj for edit prefill
    const rowObj = {};
    headers.forEach((h,i)=> rowObj[h] = r[i] ?? "");
    html += `<td>
      <button class="btn ghost" onclick='editRecord("${sheetKey}", ${sheetRow}, ${JSON.stringify(rowObj)})'>Editar</button>
      <button class="btn danger" onclick='deleteRecord("${sheetKey}", ${sheetRow})'>Excluir</button>
    </td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/* ============ charts & helpers (reuse) ============ */
function parseNumber(v){ if(v==null) return 0; const s=String(v).replace(/\s/g,'').replace(/\u00A0/g,'').replace(/R\$|BRL/g,''); if(s==='') return 0; if(s.match(/[0-9]+\.[0-9]{3},/)) return parseFloat(s.replace(/\./g,'').replace(',','.')); if(s.indexOf(',')>-1 && s.indexOf('.')===-1) return parseFloat(s.replace(',','.')); const only=s.replace(/[^0-9\.-]/g,''); const n=parseFloat(only); return isNaN(n)?0:n; }
function fmtBRL(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function parseDateSmart(str){ if(!str) return null; str=String(str).trim(); const dmy=str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if(dmy){ let y=+dmy[3]; if(y<100) y+=2000; return new Date(y,+dmy[2]-1,+dmy[1]); } const iso=Date.parse(str); if(!isNaN(iso)) return new Date(iso); return null; }
function monthlyAgg(rows, dateIdx, valIdx){
  const map={};
  rows.forEach(r=>{
    const dt = parseDateSmart(r[dateIdx]);
    if(!dt) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    map[key] = (map[key]||0) + parseNumber(r[valIdx]);
  });
  return Object.keys(map).sort().map(k=>({month:k,total:map[k]}));
}

let chartBar=null, chartPie=null;
function buildCharts(rowsEntr, rowsSai){
  // index of Date and Valor in headers
  const entDateIdx = HEADERS["Entradas"].indexOf("Data");
  const entValIdx  = HEADERS["Entradas"].indexOf("Valor");
  const saiDateIdx = HEADERS["Saídas"].indexOf("Data");
  const saiValIdx  = HEADERS["Saídas"].indexOf("Valor");

  const aE = monthlyAgg(rowsEntr, entDateIdx, entValIdx);
  const aS = monthlyAgg(rowsSai, saiDateIdx, saiValIdx);
  const labels = Array.from(new Set([...aE.map(x=>x.month), ...aS.map(x=>x.month)])).sort();
  const labelsFmt = labels.map(l=>{ const [y,m]=l.split('-'); return new Date(+y,+m-1,1).toLocaleString('pt-BR',{month:'short',year:'numeric'}); });
  const mapE = Object.fromEntries(aE.map(x=>[x.month,x.total]));
  const mapS = Object.fromEntries(aS.map(x=>[x.month,x.total]));
  const dataE = labels.map(l=>mapE[l]||0);
  const dataS = labels.map(l=>mapS[l]||0);

  const ctxBar = document.getElementById('chartBar').getContext('2d');
  if(chartBar) chartBar.destroy();
  chartBar = new Chart(ctxBar, { type:'bar', data:{ labels: labelsFmt, datasets:[
    {label:'Entradas', data: dataE, backgroundColor: '#1366d6'},
    {label:'Saídas', data: dataS, backgroundColor: '#d23b3b'}
  ]}, options:{ responsive:true, scales:{ y:{ ticks:{ callback: v => fmtBRL(v) } } } }});

  // pie: entradas distribution by description
  const byType={};
  const descIdx = HEADERS["Entradas"].indexOf("Descrição");
  const nameIdx = HEADERS["Entradas"].indexOf("Nome");
  rowsEntr.forEach(r=>{
    const key = (r[descIdx] || r[nameIdx] || 'Outros');
    byType[key] = (byType[key] || 0) + parseNumber(r[entValIdx]);
  });
  const pLabels = Object.keys(byType).slice(0,12);
  const pData = pLabels.map(k=>byType[k]);
  const ctxPie = document.getElementById('chartPie').getContext('2d');
  if(chartPie) chartPie.destroy();
  chartPie = new Chart(ctxPie, { type:'pie', data:{ labels: pLabels, datasets:[{ data: pData }] }, options:{ responsive:true }});
}

/* ============ refresh / load all ============ */
let state = { entradas: [], saidas: [], dizimistas: [], fixas: [] };

async function refreshAll(){
  try{
    document.getElementById('lastUpdate').textContent = 'Carregando...';
    const [e,s,d,f] = await Promise.all([ apiGet('entradas'), apiGet('saidas'), apiGet('dizimistas'), apiGet('fixas') ]);
    state.entradas = e || [];
    state.saidas   = s || [];
    state.dizimistas = d || [];
    state.fixas = f || [];

    // totals
    const entValIdx = HEADERS["Entradas"].indexOf("Valor");
    const saiValIdx = HEADERS["Saídas"].indexOf("Valor");
    const totalEntr = state.entradas.reduce((acc,r)=>acc + parseNumber(r[entValIdx]), 0);
    const totalSai = state.saidas.reduce((acc,r)=>acc + parseNumber(r[saiValIdx]), 0);
    const saldo = totalEntr - totalSai;
    document.getElementById('totalEntradas').textContent = fmtBRL(totalEntr);
    document.getElementById('totalSaidas').textContent = fmtBRL(totalSai);
    const sf = document.getElementById('saldoFinal'); sf.textContent = fmtBRL(saldo); sf.style.color = saldo>=0 ? '#0b9b3a' : '#d23b3b';
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('pt-BR');

    // render tables with actions
    renderTableWithActions('tableEntradas','entradas', state.entradas);
    renderTableWithActions('tableSaidas','saidas', state.saidas);
    renderTableWithActions('tableDizimistas','dizimistas', state.dizimistas);
    renderTableWithActions('tableFixas','fixas', state.fixas);

    renderDizimistasCards(); // small cards
    renderMonthlyTable(); // using state arrays
    buildCharts(state.entradas, state.saidas);
  }catch(err){
    console.error('Erro refreshAll:', err);
    alert('Erro ao carregar dados. Veja console.');
    document.getElementById('lastUpdate').textContent = 'Erro';
  }
}

/* render dizimistas cards (summation) */
function renderDizimistasCards(){
  const container = document.getElementById('dizimistasCards');
  container.innerHTML = '';
  const nameIdx = HEADERS["Dizimistas"].indexOf("Nome");
  const phoneIdx = HEADERS["Dizimistas"].indexOf("Telefone");
  const map = {};
  const entrNameIdx = HEADERS["Entradas"].indexOf("Nome");
  const entrValIdx = HEADERS["Entradas"].indexOf("Valor");
  state.entradas.forEach(r=>{
    const n = r[entrNameIdx] || "";
    map[n] = (map[n]||0) + parseNumber(r[entrValIdx]);
  });
  state.dizimistas.forEach(d=>{
    const n = d[nameIdx] || "";
    const t = d[phoneIdx] || "";
    if(!n) return;
    const el = document.createElement('div');
    el.className = 'dcard';
    el.style.minWidth = '180px';
    el.innerHTML = `<strong>${n}</strong><div class="small">${t}</div><div style="margin-top:8px">${fmtBRL(map[n]||0)}</div>`;
    container.appendChild(el);
  });
}

/* render monthly table */
function renderMonthlyTable(){
  // reuse monthlyAgg (but uses indexes)
  const entDateIdx = HEADERS["Entradas"].indexOf("Data");
  const entValIdx  = HEADERS["Entradas"].indexOf("Valor");
  const saiDateIdx = HEADERS["Saídas"].indexOf("Data");
  const saiValIdx  = HEADERS["Saídas"].indexOf("Valor");
  const aE = monthlyAgg(state.entradas, entDateIdx, entValIdx);
  const aS = monthlyAgg(state.saidas, saiDateIdx, saiValIdx);
  const mapE = Object.fromEntries(aE.map(x=>[x.month,x.total]));
  const mapS = Object.fromEntries(aS.map(x=>[x.month,x.total]));
  const months = Array.from(new Set([...Object.keys(mapE), ...Object.keys(mapS)])).sort();
  let html = '<table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>';
  months.forEach(m=>{ const e = mapE[m]||0; const s = mapS[m]||0; const saldo = e - s; const [y,mm] = m.split('-'); const dt = new Date(+y,+mm-1,1); html += `<tr><td>${dt.toLocaleString('pt-BR',{month:'long',year:'numeric'})}</td><td>${fmtBRL(e)}</td><td>${fmtBRL(s)}</td><td>${fmtBRL(saldo)}</td></tr>`; });
  html += '</tbody></table>';
  document.getElementById('monthlyTable').innerHTML = html;
}

/* ============ generate fixed via API (visible button) ============ */
async function generateFixedAll(){
  if(!confirm('Gerar despesas fixas do mês na aba Saídas agora?')) return;
  const res = await apiPost('generate_fixed', 'Saídas', {});
  if(res.ok) { alert('Despesas fixas geradas'); refreshAll(); } else { alert('Erro: ' + res.text); }
}

/* ============ events bind ============ */
document.getElementById('btnAddEntrada')?.addEventListener('click', ()=>addRecord('entradas'));
document.getElementById('btnAddSaida')?.addEventListener('click', ()=>addRecord('saidas'));
document.getElementById('btnAddDizimista')?.addEventListener('click', ()=>addRecord('dizimistas'));
document.getElementById('btnAddFixa')?.addEventListener('click', ()=>addRecord('fixas'));

document.getElementById('refreshEntradas')?.addEventListener('click', refreshAll);
document.getElementById('refreshSaidas')?.addEventListener('click', refreshAll);
document.getElementById('refreshDizimistas')?.addEventListener('click', refreshAll);
document.getElementById('refreshFixas')?.addEventListener('click', refreshAll);

document.getElementById('btnGenerateFixedUI')?.addEventListener('click', generateFixedAll);
document.getElementById('btnGenFixVisible')?.addEventListener('click', generateFixedAll);

/* save cfg */
document.getElementById('saveCfg')?.addEventListener('click', ()=> {
  const cE = document.getElementById('cfgEntradas').value.trim();
  const cS = document.getElementById('cfgSaidas').value.trim();
  const cD = document.getElementById('cfgDizimistas').value.trim();
  const cDF = document.getElementById('cfgDF').value.trim();
  const u = document.getElementById('cfgUser').value.trim();
  const p = document.getElementById('cfgPass').value.trim();
  if(cE) localStorage.setItem('cfg_ent', cE);
  if(cS) localStorage.setItem('cfg_sai', cS);
  if(cD) localStorage.setItem('cfg_diz', cD);
  if(cDF) localStorage.setItem('cfg_df', cDF);
  if(u) localStorage.setItem('cfg_user', u);
  if(p) localStorage.setItem('cfg_pass', p);
  alert('Configurações salvas. Se mudou usuário/senha, recarregue a página de login.');
});

/* init */
refreshAll();
