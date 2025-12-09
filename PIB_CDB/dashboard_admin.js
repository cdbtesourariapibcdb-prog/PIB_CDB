/****************************************************
 * dashboard_admin.js (COM AUDITORIA)
 ****************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/dev";

/* ---------- helpers API ---------- */
async function apiGet(action){
  const url = `${API_URL}?action=${action}`;
  const res = await fetch(url);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch(e){ console.error('apiGet parse error', txt); throw e; }
}

async function apiPost(action, sheetName, payload = {}){
  const form = new URLSearchParams();
  form.append('action', action);
  form.append('sheet', sheetName);
  if (payload.data !== undefined) form.append('data', JSON.stringify(payload.data));
  if (payload.row !== undefined) form.append('row', String(payload.row));
  const resp = await fetch(API_URL, { method: 'POST', body: form });
  const text = await resp.text();
  return { ok: resp.ok, text, status: resp.status };
}

/* ---------- modal helpers (reaproveitado) ---------- */
const modalBack = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalSaveBtn = document.getElementById('modalSave');
const modalCancelBtn = document.getElementById('modalCancel');

let currentForm = null;

function openModal(title, headers, rowData=null){
  modalTitle.innerText = title;
  modalBody.innerHTML = "";
  headers.forEach(h=>{
    const wrap = document.createElement('div');
    wrap.style.display='flex'; wrap.style.flexDirection='column';
    const label = document.createElement('label'); label.className='small'; label.innerText = h;
    const input = document.createElement('input'); input.name = h; input.value = (rowData && rowData[h])? rowData[h] : '';
    wrap.appendChild(label); wrap.appendChild(input); modalBody.appendChild(wrap);
  });
  currentForm = { headers, rowData };
  modalBack.style.display = 'flex';
}
function closeModal(){ modalBack.style.display = 'none'; currentForm = null; }
modalCancelBtn?.addEventListener('click', ()=> closeModal());

modalSaveBtn?.addEventListener('click', async ()=>{
  if(!currentForm) return;
  const values = currentForm.headers.map(h => {
    const inp = modalBody.querySelector(`[name="${h}"]`);
    return inp ? inp.value : "";
  });
  // determine sheet from title
  const title = modalTitle.innerText.toLowerCase();
  let sheet = null;
  if (title.includes('entradas')) sheet = 'Entradas';
  else if (title.includes('saídas') || title.includes('saidas')) sheet = 'Saídas';
  else if (title.includes('dizimistas')) sheet = 'Dizimistas';
  else if (title.includes('despesas')) sheet = 'Despesas Fixas';

  if (!sheet) { alert('Sheet indefinido'); return; }

  const res = await apiPost('add', sheet, { data: values });
  if(res.ok || res.text === 'added'){
    alert('Salvo');
    closeModal();
    refreshAll();
  } else {
    alert('Erro: ' + res.text);
  }
});

/* ---------- render tables with actions ---------- */
function renderTableWithActions(containerId, headers, rows){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if(!rows || rows.length === 0){ container.innerHTML = '<p class="small">Nenhum dado disponível.</p>'; return; }
  let html = '<table><thead><tr>';
  headers.forEach(h=> html += `<th>${h}</th>`);
  html += '<th>Ações</th></tr></thead><tbody>';
  rows.forEach((r, idx)=>{
    html += '<tr>';
    headers.forEach((h,i)=> html += `<td>${r[i] ?? ""}</td>`);
    const sheetRow = idx + 2;
    // create rowObj used for edit
    const rowObj = {};
    headers.forEach((h,i)=> rowObj[h] = r[i] ?? "");
    html += `<td>
      <button class="btn ghost" onclick='window.__edit(${JSON.stringify(headers)}, ${JSON.stringify(rowObj)}, "${containerId}")'>Editar</button>
      <button class="btn danger" onclick='window.__del("${containerId}", ${sheetRow})'>Excluir</button>
    </td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}
window.__edit = function(headers, rowObj, containerId){
  // infer sheet from containerId
  let sheet = 'Entradas';
  if(containerId.includes('Entradas') || containerId.toLowerCase().includes('entradas')) sheet = 'Entradas';
  if(containerId.includes('Saidas') || containerId.toLowerCase().includes('saidas')) sheet = 'Saídas';
  if(containerId.includes('Dizimistas')) sheet = 'Dizimistas';
  if(containerId.includes('Fixas')) sheet = 'Despesas Fixas';
  openModal(`Editar ${sheet}`, headers, rowObj);
};
window.__del = async function(containerId, row){
  if(!confirm('Confirma exclusão?')) return;
  let sheet = 'Entradas';
  if(containerId.includes('Entradas') || containerId.toLowerCase().includes('entradas')) sheet = 'Entradas';
  if(containerId.includes('Saidas') || containerId.toLowerCase().includes('saidas')) sheet = 'Saídas';
  if(containerId.includes('Dizimistas')) sheet = 'Dizimistas';
  if(containerId.includes('Fixas')) sheet = 'Despesas Fixas';
  const res = await apiPost('delete', sheet, { row });
  if(res.ok || res.text === 'deleted'){ alert('Removido'); refreshAll(); } else alert('Erro: '+res.text);
};

/* ---------- state + refresh ---------- */
let state = { entradas:[], saidas:[], dizimistas:[], fixas:[] };

async function refreshAll(){
  try{
    document.getElementById('lastUpdate').textContent = 'Carregando...';
    const [e,s,d,f] = await Promise.all([
      apiGet('entradas'),
      apiGet('saidas'),
      apiGet('dizimistas'),
      apiGet('fixas')
    ]);
    state.entradas = e || [];
    state.saidas = s || [];
    state.dizimistas = d || [];
    state.fixas = f || [];

    // totals
    const entValIdx = 2; // Entradas: Data(0), Descrição(1), Valor(2), Categoria(3)
    const saiValIdx = 2; // Saídas: Data(0), Despesa(1), Valor(2), Observação(3)
    const totalEntr = (state.entradas || []).reduce((acc,r)=>acc + parseNumber(r[entValIdx]), 0);
    const totalSai = (state.saidas || []).reduce((acc,r)=>acc + parseNumber(r[saiValIdx]), 0);
    const saldo = totalEntr - totalSai;
    document.getElementById('totalEntradas').textContent = fmtBRL(totalEntr);
    document.getElementById('totalSaidas').textContent = fmtBRL(totalSai);
    const sf = document.getElementById('saldoFinal'); sf.textContent = fmtBRL(saldo); sf.style.color = saldo>=0 ? '#0b9b3a' : '#d23b3b';
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('pt-BR');

    // render tables for admin
    renderTableWithActions('tableEntradas', ['Data','Descrição','Valor','Categoria'], state.entradas);
    renderTableWithActions('tableSaidas', ['Data','Despesa','Valor','Observação'], state.saidas);
    renderTableWithActions('tableDizimistas', ['Nome','Telefone','Dizimo Mensal'], state.dizimistas);
    renderTableWithActions('tableFixas', ['Despesa','Valor','Dia','Categoria'], state.fixas);

    // rebuild audit month select
    buildAuditMonthSelect();

    // charts
    buildCharts(state.entradas, state.saidas);

  } catch(err){
    console.error('refreshAll', err);
    document.getElementById('lastUpdate').textContent = 'Erro';
  }
}

/* ---------- number/date helpers ---------- */
function parseNumber(v){ if(v==null) return 0; const s=String(v).replace(/\s/g,'').replace(/\u00A0/g,'').replace(/R\$|BRL/g,''); if(s==='') return 0; if(s.match(/[0-9]+\.[0-9]{3},/)) return parseFloat(s.replace(/\./g,'').replace(',','.')); if(s.indexOf(',')>-1 && s.indexOf('.')===-1) return parseFloat(s.replace(',','.')); const only=s.replace(/[^0-9\.-]/g,''); const n=parseFloat(only); return isNaN(n)?0:n; }
function fmtBRL(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function parseDateSmart(str){ if(!str) return null; str=String(str).trim(); const dmy=str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if(dmy){ let y=+dmy[3]; if(y<100) y+=2000; return new Date(y,+dmy[2]-1,+dmy[1]); } const iso=Date.parse(str); if(!isNaN(iso)) return new Date(iso); return null; }

/* ---------- Charts ---------- */
let chartBar = null;
function buildCharts(entradas, saidas){
  try{
    function aggMonthly(rows, dateIdx, valIdx){
      const map={};
      rows.forEach(r=>{
        const dt = parseDateSmart(r[dateIdx]);
        if(!dt) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        map[key] = (map[key] || 0) + parseNumber(r[valIdx]);
      });
      return Object.keys(map).sort().map(k=>({month:k,total:map[k]}));
    }
    const aE = aggMonthly(entradas, 0, 2);
    const aS = aggMonthly(saidas, 0, 2);
    const labels = Array.from(new Set([...aE.map(x=>x.month), ...aS.map(x=>x.month)])).sort();
    const labelsFmt = labels.map(l=>{ const [y,m]=l.split('-'); return new Date(+y,+m-1,1).toLocaleString('pt-BR',{month:'short',year:'numeric'}); });
    const mapE = Object.fromEntries(aE.map(x=>[x.month,x.total]));
    const mapS = Object.fromEntries(aS.map(x=>[x.month,x.total]));
    const dataE = labels.map(l => mapE[l] || 0);
    const dataS = labels.map(l => mapS[l] || 0);

    const ctx = document.getElementById('auditChart')?.getContext('2d');
    if(!ctx) return;
    if(chartBar) chartBar.destroy();
    chartBar = new Chart(ctx, {
      type: 'bar',
      data: { labels: labelsFmt, datasets: [
        { label: 'Entradas', data: dataE },
        { label: 'Saídas', data: dataS }
      ]},
      options: { responsive:true, scales:{ y:{ ticks:{ callback: v=> fmtBRL(v) } } } }
    });
  }catch(e){ console.warn('buildCharts error', e); }
}

/* ---------- Auditoria: build month select + render ---------- */
function buildAuditMonthSelect(){
  const sel = document.getElementById('auditMonth');
  if(!sel) return;
  // months available from entradas + saidas
  const all = [];
  state.entradas.forEach(r=>{
    const dt = parseDateSmart(r[0]);
    if(dt) all.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);
  });
  state.saidas.forEach(r=>{
    const dt = parseDateSmart(r[0]);
    if(dt) all.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);
  });
  const uniq = Array.from(new Set(all)).sort().reverse();
  sel.innerHTML = '';
  uniq.forEach(m => {
    const [y,mm] = m.split('-');
    const dt = new Date(+y, +mm-1, 1);
    const opt = document.createElement('option');
    opt.value = m;
    opt.innerText = dt.toLocaleString('pt-BR',{month:'long',year:'numeric'});
    sel.appendChild(opt);
  });
  // default to current month if available
  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  if([...sel.options].some(o=>o.value===nowKey)) sel.value = nowKey;
}

document.getElementById('btnRefreshAudit')?.addEventListener('click', ()=> renderAuditoria());
document.getElementById('auditMonth')?.addEventListener('change', ()=> renderAuditoria());

async function renderAuditoria(){
  const sel = document.getElementById('auditMonth');
  const key = sel ? sel.value : `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const [year, month] = key.split('-').map(n=>parseInt(n,10));
  // filter entries for that month
  const entradas = (state.entradas || []).filter(r=>{
    const dt = parseDateSmart(r[0]);
    return dt && dt.getFullYear()===year && (dt.getMonth()+1)===month;
  });
  const saidas = (state.saidas || []).filter(r=>{
    const dt = parseDateSmart(r[0]);
    return dt && dt.getFullYear()===year && (dt.getMonth()+1)===month;
  });

  // build table HTML
  let html = '<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>';
  entradas.forEach(r=>{
    html += `<tr><td>${r[0] || ''}</td><td>Entrada</td><td>${r[1] || ''}</td><td>${fmtBRL(parseNumber(r[2]))}</td></tr>`;
  });
  saidas.forEach(r=>{
    html += `<tr><td>${r[0] || ''}</td><td>Saída</td><td>${r[1] || ''}</td><td>${fmtBRL(parseNumber(r[2]))}</td></tr>`;
  });
  html += '</tbody></table>';

  document.getElementById('auditoriaTable').innerHTML = html;

  // also update monthly comparative chart (already built from state)
  buildCharts(state.entradas, state.saidas);
}

/* ---------- init mapping of UI buttons ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // add buttons existing in your admin.html
  document.getElementById('btnAddEntrada')?.addEventListener('click', ()=> openModal('Entradas', ['Data','Descrição','Valor','Categoria']));
  document.getElementById('btnAddSaida')?.addEventListener('click', ()=> openModal('Saídas', ['Data','Despesa','Valor','Observação']));
  document.getElementById('btnAddDizimista')?.addEventListener('click', ()=> openModal('Dizimistas', ['Nome','Telefone','Dizimo Mensal']));
  document.getElementById('btnAddFixa')?.addEventListener('click', ()=> openModal('Despesas Fixas', ['Despesa','Valor','Dia','Categoria']));

  document.getElementById('refreshEntradas')?.addEventListener('click', ()=> refreshAll());
  document.getElementById('refreshSaidas')?.addEventListener('click', ()=> refreshAll());
  document.getElementById('refreshDizimistas')?.addEventListener('click', ()=> refreshAll());
  document.getElementById('refreshFixas')?.addEventListener('click', ()=> refreshAll());

  document.getElementById('btnGenerateFixedUI')?.addEventListener('click', async ()=> {
    if(!confirm('Gerar despesas fixas agora?')) return;
    const res = await apiPost('generate_fixed','Despesas Fixas',{});
    if(res.ok || res.text === 'generated_fixed'){ alert('Despesas fixas geradas'); refreshAll(); } else alert('Erro: '+res.text);
  });

  document.getElementById('btnGenFixVisible')?.addEventListener('click', async ()=> {
    if(!confirm('Gerar despesas fixas agora?')) return;
    const res = await apiPost('generate_fixed','Despesas Fixas',{});
    if(res.ok || res.text === 'generated_fixed'){ alert('Despesas fixas geradas'); refreshAll(); } else alert('Erro: '+res.text);
  });

  // audit controls
  document.getElementById('btnRefreshAudit')?.addEventListener('click', ()=> renderAuditoria());

  // menu show/hide view handling (if not already present)
  document.querySelectorAll('#menu button').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('#menu button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('main section').forEach(s=> s.style.display = 'none');
      const el = document.getElementById('view-'+view);
      if(el) el.style.display = 'block';
      // if auditoria selected, render it
      if(view === 'auditoria') setTimeout(()=> renderAuditoria(), 120);
    });
  });

  // initial load
  refreshAll();
});
