/****************************************************
 * DASHBOARD PRINCIPAL · PIB CDB
 * - puxa dados do Google Sheets via JSONP
 * - monta resumo
 * - monta gráficos
 * - monta tabela mensal
 ****************************************************/

const API =
  "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/dev";

/****************************************************
 * JSONP REQUEST
 ****************************************************/
function apiRequest(params, callback) {
  const url =
    API +
    "?" +
    Object.keys(params)
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join("&") +
    "&callback=cb" +
    Date.now();

  const script = document.createElement("script");
  script.src = url;

  window[script.src.split("=")[1]] = function (data) {
    callback(data);
    document.body.removeChild(script);
    delete window[script.src.split("=")[1]];
  };

  document.body.appendChild(script);
}

/****************************************************
 * FUNÇÕES DO DASHBOARD
 ****************************************************/
function loadDashboard() {
  document.getElementById("totalEntradas").textContent = "…";
  document.getElementById("totalSaidas").textContent = "…";
  document.getElementById("saldoFinal").textContent = "…";

  apiRequest({ action: "grafico" }, (data) => {
    montarResumo(data);
    montarTabelaMensal(data);
    montarGraficoBar(data);
    montarGraficoPizza(data);
  });
}

/****************************************************
 * RESUMO (Entradas / Saídas / Saldo)
 ****************************************************/
function montarResumo(data) {
  const meses = data.meses;

  let totalE = 0;
  let totalS = 0;

  Object.keys(meses).forEach((m) => {
    totalE += meses[m].entradas;
    totalS += meses[m].saidas;
  });

  const saldo = totalE - totalS;

  document.getElementById("totalEntradas").textContent =
    "R$ " + totalE.toFixed(2);
  document.getElementById("totalSaidas").textContent =
    "R$ " + totalS.toFixed(2);
  document.getElementById
