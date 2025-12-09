/****************************************************
 * dashboard.js — Gráficos e Resumo · PIB CDB
 * Requer Chart.js carregado no HTML
 ****************************************************/

const API = "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/dev";

/* -----------------------
   JSONP helper
   ----------------------- */
function jsonp(params = {}) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    params.callback = cb;
    const url = API + "?" + Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    window[cb] = function (data) {
      resolve(data);
      cleanup();
    };
    script.onerror = function (err) {
      cleanup();
      reject(new Error("JSONP load error"));
    };

    function cleanup() {
      try { delete window[cb]; } catch(e){}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }

    document.body.appendChild(script);

    // timeout safety
    setTimeout(() => {
      if (window[cb]) {
        cleanup();
        reject(new Error("JSONP timeout"));
      }
    }, 20000);
  });
}

/* -----------------------
   Helpers: números / datas
   ----------------------- */
function parseNumber(v) {
  if (v == null) return 0;
  // if already number
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (s === "") return 0;
  // remove currency symbols and non-number except . and ,
  s = s.replace(/\s/g, "").replace(/R\$|BRL/g, "");
  // if contains dot thousands and comma decimal (e.g. 1.234,56)
  if (s.match(/^[0-9]{1,3}(\.[0-9]{3})+,[0-9]+$/)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
    s = s.replace(",", ".");
  } else {
    // remove non-numeric except dot and minus
    s = s.replace(/[^0-9\.\-]/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v) {
  try {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch (e) {
    return "R$ " + Number(v).toFixed(2);
  }
}

function parseDateSmart(str) {
  if (!str) return null;
  if (str instanceof Date) return str;
  str = String(str).trim();
  // dd/mm/yyyy or d/m/yy
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10) - 1;
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  // try Date.parse (ISO)
  const t = Date.parse(str);
  if (!isNaN(t)) return new Date(t);
  return null;
}

/* -----------------------
   Chart instances (keep references)
   ----------------------- */
let barChart = null;
let pieEntradas = null;
let pieSaidas = null;

/* -----------------------
   Build charts
   ----------------------- */
function buildBarChart(ctxEl, labels, dataEntradas, dataSaidas) {
  if (!ctxEl) return;
  const ctx = ctxEl.getContext("2d");
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Entradas", data: dataEntradas },
        { label: "Saídas", data: dataSaidas }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => fmtBRL(v) }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${fmtBRL(context.parsed.y)}`
          }
        }
      }
    }
  });
}

function buildPie(ctxEl, labels, data) {
  if (!ctxEl) return;
  const ctx = ctxEl.getContext("2d");
  // reuse logic: if it's entradas or saidas we destroy appropriately outside
  return new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ data }] },
    options: { responsive: true }
  });
}

/* -----------------------
   Render UI: totals, monthly table, charts
   ----------------------- */
function renderFromGraficoData(res) {
  // res structure: { meses: {...}, categorias_entrada: {...}, categorias_saida: {...} }
  const mesesObj = res.meses || {};
  const catE = res.categorias_entrada || {};
  const catS = res.categorias_saida || {};

  // sort months ascending
  const months = Object.keys(mesesObj).sort();
  // labels formatted
  const labels = months.map(k => {
    const parts = k.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    return new Date(y, m, 1).toLocaleString("pt-BR", { month: "short", year: "numeric" });
  });

  const dataEntr = months.map(k => mesesObj[k].entradas || 0);
  const dataSaid = months.map(k => mesesObj[k].saidas || 0);

  // totals
  const totalEntradas = dataEntr.reduce((a,b)=>a+b,0);
  const totalSaidas = dataSaid.reduce((a,b)=>a+b,0);
  const saldo = totalEntradas - totalSaidas;

  const totalEntrElem = document.getElementById("totalEntradas");
  const totalSaiElem = document.getElementById("totalSaidas");
  const saldoElem = document.getElementById("saldoFinal");
  const lastUpElem = document.getElementById("lastUpdate");

  if (totalEntrElem) totalEntrElem.textContent = fmtBRL(totalEntradas);
  if (totalSaiElem) totalSaiElem.textContent = fmtBRL(totalSaidas);
  if (saldoElem) {
    saldoElem.textContent = fmtBRL(saldo);
    saldoElem.style.color = saldo >= 0 ? "#0b9b3a" : "#d23b3b";
  }
  if (lastUpElem) lastUpElem.textContent = new Date().toLocaleString("pt-BR");

  // monthly table
  const tableWrap = document.getElementById("monthlyTable");
  if (tableWrap) {
    let html = '<table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>';
    months.forEach((k, i) => {
      const e = dataEntr[i] || 0;
      const s = dataSaid[i] || 0;
      const sal = e - s;
      html += `<tr>
        <td>${labels[i]}</td>
        <td>${fmtBRL(e)}</td>
        <td>${fmtBRL(s)}</td>
        <td style="font-weight:700;color:${sal>=0? '#0b9b3a':'#d23b3b'}">${fmtBRL(sal)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  // find canvas elements (support multiple possible IDs)
  const barCanvas = document.getElementById("chartBar") || document.getElementById("chartEntradasSaidas") || document.getElementById("chartEntradas");
  const pieCanvas = document.getElementById("chartPie") || document.getElementById("chartPieEntradas");
  const pieCanvas2 = document.getElementById("chartPieSaidas") || document.getElementById("chartPie2") || document.getElementById("chartPieOut");

  // build bar
  buildBarChart(barCanvas, labels, dataEntr, dataSaid);

  // build pie entradas
  const labelsE = Object.keys(catE);
  const valuesE = labelsE.map(k => catE[k]);
  if (pieEntradas) try { pieEntradas.destroy(); } catch(e){}
  if (pieCanvas) pieEntradas = buildPie(pieCanvas, labelsE, valuesE);

  // build pie saidas
  const labelsS = Object.keys(catS);
  const valuesS = labelsS.map(k => catS[k]);
  if (pieSaidas) try { pieSaidas.destroy(); } catch(e){}
  if (pieCanvas2) pieSaidas = buildPie(pieCanvas2, labelsS, valuesS);
}

/* -----------------------
   Load grafico data from API
   ----------------------- */
async function loadGrafico() {
  try {
    // Use JSONP to avoid CORS; our Apps Script supports callback param
    const res = await jsonp({ action: "grafico" });
    // If API returned error structure, handle
    if (!res) {
      console.warn("grafico: resposta vazia");
      return;
    }
    renderFromGraficoData(res);
  } catch (err) {
    console.error("Erro ao carregar dados do gráfico:", err);
    // show message
    const tableWrap = document.getElementById("monthlyTable");
    if (tableWrap) tableWrap.innerHTML = '<p class="small">Erro ao carregar gráficos. Verifique a API.</p>';
  }
}

/* -----------------------
   Init
   ----------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // small loading UI
  const te = document.getElementById("totalEntradas");
  if (te) te.textContent = "Carregando...";
  const ts = document.getElementById("totalSaidas");
  if (ts) ts.textContent = "Carregando...";
  const sf = document.getElementById("saldoFinal");
  if (sf) sf.textContent = "Carregando...";
  const lu = document.getElementById("lastUpdate");
  if (lu) lu.textContent = "Carregando...";

  loadGrafico();
});
