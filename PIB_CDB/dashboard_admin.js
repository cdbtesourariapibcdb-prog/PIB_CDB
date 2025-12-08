/****************************************************
 * dashboard_admin.js
 ****************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbzV1eTn_eoldgPtfOlAZRAlJGQoK2WU1BG-cixCKEzv_nn_IxYOSEaCpyOLWWG57JLv/exec";

/****************************************************
 * ENVIAR DADOS PARA A API
 ****************************************************/
async function sendToAPI(action, sheet, data = null, row = null) {
  const form = new FormData();
  form.append("action", action);
  form.append("sheet", sheet);

  if (data) form.append("data", JSON.stringify(data));
  if (row) form.append("row", row);

  const res = await fetch(API_URL, { method: "POST", body: form });
  return await res.text();
}

/****************************************************
 * ADICIONAR ITEM
 ****************************************************/
async function addItem(sheet) {
  const inputs = document.querySelectorAll(`#form_${sheet} input`);
  const values = [];

  inputs.forEach(inp => values.push(inp.value.trim()));

  const r = await sendToAPI("add", sheet, values);

  if (r === "added") {
    alert("Registro adicionado com sucesso!");
    location.reload();
  } else {
    alert("Erro ao adicionar: " + r);
  }
}

/****************************************************
 * DELETAR ITEM
 ****************************************************/
async function deleteItem(sheet, row) {
  if (!confirm("Tem certeza que deseja excluir esta linha?")) return;

  const r = await sendToAPI("delete", sheet, null, row);

  if (r === "deleted") {
    alert("Registro removido!");
    location.reload();
  } else {
    alert("Erro ao excluir: " + r);
  }
}

/****************************************************
 * GERAR DESPESAS FIXAS
 ****************************************************/
async function gerarDespesasFixas() {
  const r = await sendToAPI("generate_fixed", "Despesas Fixas");

  if (r === "generated_fixed") {
    alert("Despesas fixas geradas com sucesso!");
    location.reload();
  } else {
    alert("Erro ao gerar despesas fixas: " + r);
  }
}

/****************************************************
 * CONECTAR BOTÕES
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  // Entradas
  const btnAddEntrada = document.getElementById("btnAddEntrada");
  if (btnAddEntrada) btnAddEntrada.onclick = () => addItem("Entradas");

  // Saídas
  const btnAddSaida = document.getElementById("btnAddSaida");
  if (btnAddSaida) btnAddSaida.onclick = () => addItem("Saídas");

  // Dizimistas
  const btnAddDiz = document.getElementById("btnAddDizimista");
  if (btnAddDiz) btnAddDiz.onclick = () => addItem("Dizimistas");

  // Despesas Fixas – botão "Adicionar"
  const btnAddFix = document.getElementById("btnAddFixa");
  if (btnAddFix) btnAddFix.onclick = () => addItem("Despesas Fixas");

  // Despesas Fixas – botão "Gerar (Todos)"
  const btnGerarFixUI = document.getElementById("btnGenerateFixedUI");
  if (btnGerarFixUI) btnGerarFixUI.onclick = gerarDespesasFixas;

  // Despesas Fixas – botão do topo ("Gerar Despesas Fixas")
  const btnGerarTop = document.getElementById("btnGenFixVisible");
  if (btnGerarTop) btnGerarTop.onclick = gerarDespesasFixas;

});
