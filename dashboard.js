/* dashboard.js - versão CRUD + generate_fixed usando sua API Google Apps Script */

/* ============ CONFIG ============ */
const API_URL = "https://script.google.com/macros/s/AKfycbzV1eTn_eoldgPtfOlAZRAlJGQoK2WU1BG-cixCKEzv_nn_IxYOSEaCpyOLWWG57JLv/exec";

const DEFAULT_ENTRADAS = localStorage.getItem('cfg_ent') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCX.../pub?gid=0&single=true&output=csv";
const DEFAULT_SAIDAS  = localStorage.getItem('cfg_sai') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTC.../pub?gid=269334175&single=true&output=csv";
const DEFAULT_DIZ     = localStorage.getItem('cfg_diz') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTC.../pub?gid=250812166&single=true&output=csv";

/* ============ HELPERS ============ */
function parseNumber(v){ if(v==null) return 0; const s=String(v).replace(/\s/g,'').replace(/\u00A0/g,'').replace(/R\$|BRL/g,''); if(s==='') return 0; if(s.match(/[0-9]+\.[0-9]{3},/)) return parseFloat(s.replace(/\./g,'').replace(',','.')); if(s.indexOf(',')>-1 && s.indexOf('.')===-1) return parseFloat(s.replace(',','.')); const only=s.replace(/[^0-9\.-]/g,''); const n=parseFloat(only); return isNaN(n)?0:n; }
function parseDateSmart(str){ if(!str) return null; str=String(str).trim(); const dmy=str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if(dmy){ let y=+dmy[3]; if(y<100) y+=2000; return new Date(y,+dmy[2]-1,+dmy[1]); } const iso=Date.parse(str); if(!isNaN(iso)) return new Date(iso); return null; }
function fmtBRL(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

/* ============ CSV LOADER (PapaParse) ============ */
async function loadCsv(url){ const txt = await fetch(url).then(r=>r.text()); return new Promise((res,rej)=>{ Papa.parse(txt, { header:true, skipEmptyLines:true, complete: r=>res(r.data), error: e=>rej(e) }); }); }

/* ============ API POST HELPER ============ */
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

/* ============ RENDER TABELAS (com botões CRUD) ============ */
function renderTableWithActions(containerId, sheetName, data) {
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!data || data.length===0){ container.innerHTML = '<p class="small">Nenhum dado disponível.</p>'; return; }

  // headers order from first object
  const cols = Object.keys(data[0]);
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += `<div class="small">Colunas: ${cols.join(', ')}</div>`;
  html += `<div><button class="btn" onclick="addRecordPrompt('${sheetName}')">Adicionar</button></div>`;
  html += '</div>';

  html += '<table><thead><tr>';
  cols.forEach(c => html += `<th>${c}</th>`);
  html += '<th>Ações</th></tr></thead><tbody>';

  // Rows: note row index in sheet = index + 2 (header row is 1)
  data.forEach((rowObj, idx) => {
    html += '<tr>';
    cols.forEach(c => html += `<td>${(rowObj[c] ?? "")}</td>`);
    const sheetRow = idx + 2; // assuming we loaded full sheet without missing header rows
    html += `<td>
      <button class="btn ghost" onclick="editRecordPrompt('${sheetName}', ${sheetRow})">Editar</button>
      <button class="btn danger" onclick="deleteRecordConfirm('${sheetName}', ${sheetRow})">Excluir</button>
    </td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/* ============ CRUD ACTIONS (UI prompts simples) ============ */
window.addRecordPrompt = async function(sheetName){
  // determine which container to read headers from (we use loaded arrays)
  const data = sheetName === 'Entradas' ? entradas : sheetName === 'Saídas' ? saidas : sheetName === 'Dizimistas' ? dizimistas : sheetName === 'Despesas Fixas' ? despesasFixas : null;
  if(!data) return alert('Dados não carregados ainda.');
  const headers = Object.keys(data[0]);
  const values = [];
  for(const h of headers){
    const v = prompt(`Novo registro - ${h}:`, "");
    if(v === null){ return; } // cancel
    values.push(v);
  }
  // call API
  try{
    const r = await apiPost('add', sheetName, { data: values });
    if(r.ok){ alert('Registro adicionado. Aguarde atualização.'); refreshAll(); } else alert('Erro: ' + r.text);
  }catch(err){ console.error(err); alert('Erro ao adicionar. Veja console.'); }
};

window.editRecordPrompt = async function(sheetName, sheetRow){
  // find local array and relative index (sheetRow - 2)
  const arr = sheetName === 'Entradas' ? entradas : sheetName === 'Saídas' ? saidas : sheetName === 'Dizimistas' ? dizimistas : sheetName === 'Despesas Fixas' ? despesasFixas : null;
  if(!arr) return alert('Dados não carregados.');
  const localIndex = sheetRow - 2;
  const rowObj = arr[localIndex];
  if(!rowObj) return alert('Linha local não encontrada. Recarregue antes de editar.');
  const headers = Object.keys(rowObj);
  const newValues = [];
  for(const h of headers){
    const cur = rowObj[h] ?? "";
    const v = prompt(`Editar ${h}:`, cur);
    if(v === null) return; // cancel
    newValues.push(v);
  }
  // call update
  try{
    const r = await apiPost('update', sheetName, { row: sheetRow, data: newValues });
    if(r.ok){ alert('Registro atualizado.'); refreshAll(); } else alert('Erro: ' + r.text);
  }catch(err){ console.error(err); alert('Erro ao atualizar. Veja console.'); }
};

window.deleteRecordConfirm = async function(sheetName, sheetRow){
  if(!confirm('Confirma exclusão desta linha? Esta ação NÃO pode ser desfeita.')) return;
  try{
    const r = await apiPost('delete', sheetName, { row: sheetRow });
    if(r.ok){ alert('Registro excluído.'); refreshAll(); } else alert('Erro: ' + r.text);
  }catch(err){ console.error(err); alert('Erro ao excluir. Veja console.'); }
};

/* ============ generate fixed (call API) ============ */
async function generateFixedNow(){
  if(!confirm('Gerar despesas fixas do mês na aba "Saídas" agora?')) return;
  try{
    const r = await apiPost('generate_fixed', 'Saídas', {});
    if(r.ok){ alert('Despesas fixas geradas com sucesso.'); refreshAll(); } else alert('Erro: ' + r.text);
  }catch(err){ console.error(err); alert('Erro ao gerar despesas fixas. Veja console.'); }
}

/* ============ existing renderers ============ */
function renderSimpleTable(containerId, data){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!data || data.length===0){ container.innerHTML = '<p class="small">Nenhum dado disponível.</p>'; return; }
  const cols = Object.keys(data[0]);
  let html = '<table><thead><tr>';
  cols.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';
  data.forEach(row=>{
    html += '<tr>'; cols.forEach(c=> html += `<td>${(row[c]??'')}</td>`); html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/* ============ charts, monthly table, dizimistas cards (reuse previous logic) ============ */
function monthlyAgg(data,dateCol,valCol){
  const map={};
  data.forEach(it=>{
    const dt = parseDateSmart(it[dateCol]||it['Data']);
    if(!dt) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    map[key] = (map[key]||0)+parseNumber(it[valCol]);
  });
  return Object.keys(map).sort().map(k=>({month:k,total:map[k]}));
}

let barChart=null, pieChart=null;
function buildChartsInternal(){
  // build or update charts using entradas and saidas
  const barCtx = document.getElementById('chartBar')?.getContext('2d');
  const pieCtx = document.getElementById('chartPie')?.getContext('2d');
  if(barCtx){
    if(barChart) barChart.destroy();
    barChart = new Chart(barCtx, { type:'bar', data:{labels:[],datasets:[]}, options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{ticks:{callback:v=>fmtBRL(v)}}}}});
  }
  if(pieCtx){
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, { type:'pie', data:{labels:[],datasets:[{data:[]}]}, options:{responsive:true} });
  }
  updateChartsInternal();
}

function updateChartsInternal(filteredEntradas, filteredSaidas){
  const ent = filteredEntradas || entradas;
  const sai = filteredSaidas || saidas;
  const aE = monthlyAgg(ent,'Data','Valor'); const aS = monthlyAgg(sai,'Data','Valor');
  const labels = Array.from(new Set([...aE.map(x=>x.month), ...aS.map(x=>x.month)])).sort();
  const labelsFmt = labels.map(l=>{ const [y,m]=l.split('-'); return new Date(+y,+m-1,1).toLocaleString('pt-BR',{month:'short',year:'numeric'}); });
  const mapE = Object.fromEntries(aE.map(x=>[x.month,x.total])); const mapS = Object.fromEntries(aS.map(x=>[x.month,x.total]));
  const dataE = labels.map(l=>mapE[l]||0); const dataS = labels.map(l=>mapS[l]||0);
  if(barChart){ barChart.data.labels = labelsFmt; barChart.data.datasets = [{label:'Entradas',data:dataE,backgroundColor:'#1366d6'},{label:'Saídas',data:dataS,backgroundColor:'#d23b3b'}]; barChart.update(); }
  const byType={}; ent.forEach(it=>{ const key = it['Descrição']||it['Descricao']||it['Nome']||'Outros'; byType[key] = (byType[key]||0)+parseNumber(it['Valor']); });
  const pLabels = Object.keys(byType).slice(0,12); const pData = pLabels.map(k=>byType[k]);
  if(pieChart){ pieChart.data.labels = pLabels; pieChart.data.datasets[0].data = pData; pieChart.update(); }
}

/* ============ render dizimistas cards ============ */
function renderDizimistasCards(){
  const container = document.getElementById('dizimistasCards');
  if(!container) return;
  container.innerHTML = '';
  const map = {};
  entradas.forEach(it=>{ const nome=(it['Nome']||it['nome']||'').trim(); if(!nome) return; map[nome] = (map[nome]||0)+parseNumber(it['Valor']); });
  dizimistas.forEach(d=>{ const nome=(d['Nome']||d['nome']||'').trim(); if(!nome) return; const tel = d['Telefone']||d['telefone']||''; const total = map[nome]||0; const el = document.createElement('div'); el.className='dcard'; el.style.minWidth='180px'; el.innerHTML = `<strong>${nome}</strong><div class="small">${tel}</div><div style="margin-top:8px">${fmtBRL(total)}</div>`; container.appendChild(el); });
}

/* ============ render monthly table ============ */
function renderMonthlyTable(){
  const e = monthlyAgg(entradas,'Data','Valor'); const s = monthlyAgg(saidas,'Data','Valor');
  const mapE = Object.fromEntries(e.map(x=>[x.month,x.total])); const mapS = Object.fromEntries(s.map(x=>[x.month,x.total]));
  const months = Array.from(new Set([...Object.keys(mapE), ...Object.keys(mapS)])).sort();
  let html = '<table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>';
  months.forEach(m=>{ const eV = mapE[m]||0; const sV = mapS[m]||0; const saldo=eV-sV; const [y,mm] = m.split('-'); const dt = new Date(+y,+mm-1,1); html += `<tr><td>${dt.toLocaleString('pt-BR',{month:'long',year:'numeric'})}</td><td>${fmtBRL(eV)}</td><td>${fmtBRL(sV)}</td><td>${fmtBRL(saldo)}</td></tr>`; });
  html += '</tbody></table>'; document.getElementById('monthlyTable').innerHTML = html;
}

/* ============ export to excel helper ============ */
function exportToExcel(name, arr){ if(!arr || arr.length===0){ alert('Nenhum dado para exportar.'); return; } const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(arr); XLSX.utils.book_append_sheet(wb, ws, name); XLSX.writeFile(wb, `${name}_${new Date().toISOString().slice(0,10)}.xlsx`); }

/* ============ STATE ============ */
let entradas = [], saidas = [], dizimistas = [], despesasFixas = [];

/* ============ REFRESH ALL ============ */
async function refreshAll(){
  try{
    document.getElementById('lastUpdate').textContent = 'Carregando...';
    const eUrl = localStorage.getItem('cfg_ent') || DEFAULT_ENTRADAS;
    const sUrl = localStorage.getItem('cfg_sai') || DEFAULT_SAIDAS;
    const dUrl = localStorage.getItem('cfg_diz') || DEFAULT_DIZ;
    const dfUrl = localStorage.getItem('cfg_df') || (dUrl.replace('pub?','pub?') /* optional default - user can update in config */);

    document.getElementById('cfgEntradas').value = eUrl;
    document.getElementById('cfgSaidas').value = sUrl;
    document.getElementById('cfgDizimistas').value = dUrl;

    const [e,s,d] = await Promise.all([loadCsv(eUrl), loadCsv(sUrl), loadCsv(dUrl)]);
    entradas = e; saidas = s; dizimistas = d;

    // despesas fixas read from "Despesas Fixas" sheet - we assume user published this as CSV and put link in cfg_diz or cfg_df
    // If user saved cfg_df, use it, else try default by constructing from same spreadsheet (not always possible). For now we attempt cfg_df:
    const dfCfg = localStorage.getItem('cfg_df');
    if(dfCfg){
      despesasFixas = await loadCsv(dfCfg);
    } else {
      // try to fetch Despesas Fixas sheet by constructing similar URL (best-effort). If fails, despesasFixas = []
      despesasFixas = [];
    }

    // fill dashboard
    document.getElementById('totalEntradas').textContent = fmtBRL(sumCol(entradas,'Valor'));
    document.getElementById('totalSaidas').textContent = fmtBRL(sumCol(saidas,'Valor'));
    const saldo = sumCol(entradas,'Valor') - sumCol(saidas,'Valor');
    const sf = document.getElementById('saldoFinal'); sf.textContent = fmtBRL(saldo); sf.style.color = saldo>=0?'#0b9b3a':'#d23b3b';
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('pt-BR');

    // render
    renderTableWithActions('tableEntradas','Entradas', entradas);
    renderTableWithActions('tableSaidas','Saídas', saidas);
    renderTableWithActions('tableDizimistas','Dizimistas', dizimistas);
    renderTableWithActions('tableDizimistas','Despesas Fixas', despesasFixas); // if empty will show none
    renderDizimistasCards();
    renderMonthlyTable();
    buildChartsInternal();
  }catch(err){
    console.error('Erro ao carregar CSV:', err);
    alert('Erro ao carregar dados. Verifique links CSV (veja console).');
    document.getElementById('lastUpdate').textContent = 'Erro';
  }
}

/* helper sum */
function sumCol(data, col){ if(!data) return 0; return data.reduce((acc,it)=>acc+parseNumber(it[col]),0); }

/* attach some UI buttons (generate fixed) */
document.getElementById('saveCfg')?.addEventListener('click', ()=>{ const cE=document.getElementById('cfgEntradas').value.trim(); const cS=document.getElementById('cfgSaidas').value.trim(); const cD=document.getElementById('cfgDizimistas').value.trim(); const cDF = document.getElementById('cfgDF') ? document.getElementById('cfgDF').value.trim() : null; if(cE) localStorage.setItem('cfg_ent', cE); if(cS) localStorage.setItem('cfg_sai', cS); if(cD) localStorage.setItem('cfg_diz', cD); if(cDF) localStorage.setItem('cfg_df', cDF); alert('Configurações salvas.'); });

/* expose generate button globally */
window.generateFixedNow = generateFixedNow;

/* init */
refreshAll();
