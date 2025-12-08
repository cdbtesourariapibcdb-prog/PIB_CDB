/* dashboard.js - painel administrativo completo (client-side)
   Requer PapaParse + Chart.js + SheetJS (CDN incluídas no admin.html)
*/

/* DEFAULTS (use localStorage cfg se existir) */
const DEFAULT_ENTRADAS = localStorage.getItem('cfg_ent') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=0&single=true&output=csv";
const DEFAULT_SAIDAS  = localStorage.getItem('cfg_sai') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=269334175&single=true&output=csv";
const DEFAULT_DIZ     = localStorage.getItem('cfg_diz') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=250812166&single=true&output=csv";

/* state */
let entradas = [], saidas = [], dizimistas = [];
let barChart = null, pieChart = null;

/* helpers */
function parseNumber(v){
  if(v==null) return 0;
  const s = String(v).replace(/\s/g,'').replace(/\u00A0/g,'').replace(/R\$|BRL/g,'');
  if(s==='') return 0;
  if(s.match(/[0-9]+\.[0-9]{3},/)) return parseFloat(s.replace(/\./g,'').replace(',','.'));
  if(s.indexOf(',')>-1 && s.indexOf('.')===-1) return parseFloat(s.replace(',','.'));
  const only = s.replace(/[^0-9\.-]/g,'');
  const n = parseFloat(only);
  return isNaN(n)?0:n;
}
function parseDateSmart(str){
  if(!str) return null;
  str = String(str).trim();
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(dmy){ let y=+dmy[3]; if(y<100) y+=2000; return new Date(y, +dmy[2]-1, +dmy[1]); }
  const iso = Date.parse(str); if(!isNaN(iso)) return new Date(iso);
  return null;
}
function fmtBRL(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

/* CSV loader (PapaParse) */
async function loadCsv(url){
  const txt = await fetch(url).then(r=>r.text());
  return new Promise((res,rej)=>{
    Papa.parse(txt, { header:true, skipEmptyLines:true, complete: r=>res(r.data), error: e=>rej(e) });
  });
}

/* render helpers */
function renderTable(containerId, data){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!data || data.length===0){ container.innerHTML = '<p class="small">Nenhum dado disponível.</p>'; return; }
  const cols = Object.keys(data[0]);
  let html = '<table><thead><tr>';
  cols.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';
  data.forEach(row=>{
    html += '<tr>';
    cols.forEach(c => html += `<td>${(row[c]??'')}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/* totals */
function sumCol(data,col){ if(!data) return 0; return data.reduce((a,b)=>a+parseNumber(b[col]),0); }

/* monthly aggregation */
function monthlyAgg(data,dateCol,valCol){
  const map = {};
  data.forEach(it=>{
    const dt = parseDateSmart(it[dateCol]||it['Data']||it['data']);
    if(!dt) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    map[key] = (map[key]||0) + parseNumber(it[valCol]);
  });
  return Object.keys(map).sort().map(k=>({month:k,total:map[k]}));
}

/* build charts */
function buildCharts(){
  const barCtx = document.getElementById('chartBar').getContext('2d');
  if(barChart) barChart.destroy();
  barChart = new Chart(barCtx, { type:'bar', data:{labels:[],datasets:[]}, options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{ticks:{callback:v=>fmtBRL(v)}}} } });

  const pieCtx = document.getElementById('chartPie').getContext('2d');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, { type:'pie', data:{labels:[],datasets:[{data:[]}]}, options:{responsive:true} });

  updateCharts();
}

function updateCharts(filteredEntradas, filteredSaidas){
  const ent = filteredEntradas || entradas;
  const sai = filteredSaidas || saidas;

  const aE = monthlyAgg(ent,'Data','Valor');
  const aS = monthlyAgg(sai,'Data','Valor');
  const labels = Array.from(new Set([...aE.map(x=>x.month),...aS.map(x=>x.month)])).sort();
  const labelsFmt = labels.map(l=>{ const [y,m]=l.split('-'); return new Date(+y,+m-1,1).toLocaleString('pt-BR',{month:'short',year:'numeric'}); });

  const mapE = Object.fromEntries(aE.map(x=>[x.month,x.total]));
  const mapS = Object.fromEntries(aS.map(x=>[x.month,x.total]));
  const dataE = labels.map(l=>mapE[l]||0);
  const dataS = labels.map(l=>mapS[l]||0);

  if(barChart){
    barChart.data.labels = labelsFmt;
    barChart.data.datasets = [{label:'Entradas',data:dataE,backgroundColor:'#1366d6'},{label:'Saídas',data:dataS,backgroundColor:'#d23b3b'}];
    barChart.update();
  }

  // pie: entradas by descrição/nome
  const byType = {};
  ent.forEach(it=>{
    const key = it['Descrição']||it['Descricao']||it['Nome']||'Outros';
    byType[key] = (byType[key]||0) + parseNumber(it['Valor']);
  });
  const pLabels = Object.keys(byType).slice(0,12);
  const pData = pLabels.map(k=>byType[k]);
  if(pieChart){ pieChart.data.labels = pLabels; pieChart.data.datasets[0].data = pData; pieChart.update(); }
}

/* render dizimistas cards */
function renderDizimistas(){
  const container = document.getElementById('dizimistasCards');
  container.innerHTML = '';
  const map = {};
  entradas.forEach(it=>{
    const nome = (it['Nome']||it['nome']||'').trim();
    if(!nome) return;
    map[nome] = (map[nome]||0) + parseNumber(it['Valor']);
  });
  dizimistas.forEach(d=>{
    const nome = (d['Nome']||d['nome']||'').trim();
    if(!nome) return;
    const tel = d['Telefone']||d['telefone']||'';
    const total = map[nome]||0;
    const el = document.createElement('div');
    el.className = 'dcard';
    el.style.minWidth='180px';
    el.innerHTML = `<strong>${nome}</strong><div class="small">${tel}</div><div style="margin-top:8px">${fmtBRL(total)}</div>`;
    container.appendChild(el);
  });
}

/* monthly table render */
function renderMonthlyTable(){
  const e = monthlyAgg(entradas,'Data','Valor');
  const s = monthlyAgg(saidas,'Data','Valor');
  const mapE = Object.fromEntries(e.map(x=>[x.month,x.total]));
  const mapS = Object.fromEntries(s.map(x=>[x.month,x.total]));
  const months = Array.from(new Set([...Object.keys(mapE),...Object.keys(mapS)])).sort();
  let html = '<table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>';
  months.forEach(m=>{
    const eV = mapE[m]||0; const sV = mapS[m]||0; const saldo=eV-sV;
    const [y,mm] = m.split('-'); const dt = new Date(+y,+mm-1,1);
    html += `<tr><td>${dt.toLocaleString('pt-BR',{month:'long',year:'numeric'})}</td><td>${fmtBRL(eV)}</td><td>${fmtBRL(sV)}</td><td>${fmtBRL(saldo)}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('monthlyTable').innerHTML = html;
}

/* apply filters for entries/saidas simple search */
function applySearch(){
  const qE = document.getElementById('searchEntradas').value.toLowerCase().trim();
  const qS = document.getElementById('searchSaidas').value.toLowerCase().trim();
  const filteredE = entradas.filter(r=> Object.values(r).some(v=>String(v).toLowerCase().includes(qE)));
  const filteredS = saidas.filter(r=> Object.values(r).some(v=>String(v).toLowerCase().includes(qS)));
  renderTable('tableEntradas', filteredE);
  renderTable('tableSaidas', filteredS);
  updateCharts(filteredE, filteredS);
}

/* export helpers */
function exportToExcel(name, arr){
  if(!arr || arr.length===0){ alert('Nenhum dado para exportar.'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(arr);
  XLSX.utils.book_append_sheet(wb, ws, name);
  XLSX.writeFile(wb, `${name}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* load everything */
async function refreshAll(){
  try{
    document.getElementById('lastUpdate').textContent = 'Carregando...';
    const eUrl = localStorage.getItem('cfg_ent') || DEFAULT_ENTRADAS;
    const sUrl = localStorage.getItem('cfg_sai') || DEFAULT_SAIDAS;
    const dUrl = localStorage.getItem('cfg_diz') || DEFAULT_DIZ;
    document.getElementById('cfgEntradas').value = eUrl;
    document.getElementById('cfgSaidas').value = sUrl;
    document.getElementById('cfgDizimistas').value = dUrl;
    // load in parallel
    const [e,s,d] = await Promise.all([loadCsv(eUrl), loadCsv(sUrl), loadCsv(dUrl)]);
    entradas = e; saidas = s; dizimistas = d;
    // render summary
    document.getElementById('totalEntradas').textContent = fmtBRL(sumCol(entradas,'Valor'));
    document.getElementById('totalSaidas').textContent = fmtBRL(sumCol(saidas,'Valor'));
    const saldo = sumCol(entradas,'Valor') - sumCol(saidas,'Valor');
    const sf = document.getElementById('saldoFinal'); sf.textContent = fmtBRL(saldo); sf.style.color = saldo>=0?'#0b9b3a':'#d23b3b';
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('pt-BR');
    // render tables and charts
    renderTable('tableEntradas', entradas);
    renderTable('tableSaidas', saidas);
    renderTable('tableDizimistas', dizimistas);
    renderDizimistas();
    renderMonthlyTable();
    buildCharts();
  }catch(err){
    console.error('Erro ao carregar CSV:', err);
    alert('Erro ao carregar dados. Verifique links CSV (devtools -> console para detalhes).');
    document.getElementById('lastUpdate').textContent = 'Erro';
  }
}

/* events */
document.getElementById('refreshEntradas')?.addEventListener('click', refreshAll);
document.getElementById('refreshSaidas')?.addEventListener('click', refreshAll);
document.getElementById('refreshDizimistas')?.addEventListener('click', refreshAll);
document.getElementById('searchEntradas')?.addEventListener('input', applySearch);
document.getElementById('searchSaidas')?.addEventListener('input', applySearch);
document.getElementById('exportEntradasExcel')?.addEventListener('click', ()=>exportToExcel('Entradas', entradas));
document.getElementById('exportSaidasExcel')?.addEventListener('click', ()=>exportToExcel('Saidas', saidas));
document.getElementById('exportDizimistasExcel')?.addEventListener('click', ()=>exportToExcel('Dizimistas', dizimistas));

/* init */
refreshAll();
