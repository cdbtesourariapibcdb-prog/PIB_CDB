/****************************************************
 * dashboard_admin.js — COMPLETO
 * Compatível com Google Sheets + JSONP
 * Adiciona, edita, remove e gera despesas fixas
 * Converte valores monetários automaticamente
 ****************************************************/

// URL da API (JSONP)
const API_URL =
  "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/exec";

/****************************************************
 * ENVIO PARA API (GET + JSONP)
 ****************************************************/
function apiRequest(params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = "cb_" + Math.random().toString(36).substring(2);

    params.callback = callbackName;

    const query = new URLSearchParams(params).toString();
    const script = document.createElement("script");
    script.src = `${API_URL}?${query}`;

    window[callbackName] = (data) => {
      resolve(data);
      document.body.removeChild(script);
      delete window[callbackName];
    };

    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/****************************************************
 * NORMALIZAÇÃO DE VALORES (Moedas → Número puro)
 ****************************************************/
function normalizeValue(v) {
  if (v === null || v === undefined) return "";

  v = v.toString().trim();

  // Se é moeda: remove "R$" " " "." e troca "," por "."
  if (v.includes("R$") || v.includes(",") || v.includes(".")) {
    v = v
      .replace(/[R$\s]/g, "") // remove R$ e espaços
      .replace(/\./g, "")     // remove pontos
      .replace(",", ".");     // vírgula vira ponto
  }
  return v;
}

/****************************************************
 * ADICIONAR ITEM
 ****************************************************/
async function addItem(sheet) {
  const inputs = document.querySelectorAll(`#form_${sheet} input`);
  const values = [];

  inputs.forEach((inp) => {
    values.push(normalizeValue(inp.value));
  });

  const res = await apiRequest({
    action: "add",
    sheet,
    data: JSON.stringify(values),
  });

  if (res === "added") {
    alert("Registro adicionado com sucesso!");
    location.reload();
  } else {
    alert("Erro: " + JSON.stringify(res));
  }
}

/****************************************************
 * DELETAR ITEM
 ****************************************************/
async function deleteItem(sheet, row) {
  if (!confirm("Deseja realmente excluir este registro?")) return;

  const res = await apiRequest({
    action: "delete",
    sheet,
    row,
  });

  if (res === "deleted") {
    alert("Registro excluído!");
    location.reload();
  } else {
    alert("Erro: " + JSON.stringify(res));
  }
}

/****************************************************
 * ATUALIZAR ITEM
 ****************************************************/
async function updateItem(sheet, row) {
  const inputs = document.querySelectorAll(`#form_${sheet} input`);
  const values = [];

  inputs.forEach((inp) => {
    values.push(normalizeValue(inp.value));
  });

  const res = await apiRequest({
    action: "update",
    sheet,
    row,
    data: JSON.stringify(values),
  });

  if (res === "updated") {
    alert("Registro atualizado!");
    location.reload();
  } else {
    alert("Erro: " + JSON.stringify(res));
  }
}

/****************************************************
 * GERAR DESPESAS FIXAS AUTOMATICAMENTE
 ****************************************************/
async function gerarDespesasFixas() {
  const res = await apiRequest({
    action: "generate_fixed",
    sheet: "Despesas Fixas",
  });

  if (res === "generated_fixed") {
    alert("Despesas fixas geradas!");
    location.reload();
  } else {
    alert("Erro: " + JSON.stringify(res));
  }
}

/****************************************************
 * CONECTA BOTÕES DO HTML
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Entradas
  const btnAddEntrada = document.getElementById("btnAddEntrada");
  if (btnAddEntrada)
    btnAddEntrada.onclick = () => addItem("Entradas");

  // Saídas
  const btnAddSaida = document.getElementById("btnAddSaida");
  if (btnAddSaida)
    btnAddSaida.onclick = () => addItem("Saídas");

  // Dizimistas
  const btnAddDiz = document.getElementById("btnAddDizimista");
  if (btnAddDiz)
    btnAddDiz.onclick = () => addItem("Dizimistas");

  // Despesas Fixas
  const btnAddFix = document.getElementById("btnAddFixa");
  if (btnAddFix)
    btnAddFix.onclick = () => addItem("Despesas Fixas");

  // Gerar fixas
  const btnGenFix = document.getElementById("btnGenerateFixedUI");
  if (btnGenFix)
    btnGenFix.onclick = gerarDespesasFixas;

  // Botão visível no topo
  const btnGenFixTop = document.getElementById("btnGenFixVisible");
  if (btnGenFixTop)
    btnGenFixTop.onclick = gerarDespesasFixas;
});
