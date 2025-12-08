/****************************************************
 * dashboard_admin.js
 * Controla o painel administrativo:
 * - Adicionar / editar / deletar entradas
 * - Idem para saídas, dizimistas e despesas fixas
 * - Gera despesas fixas automaticamente
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

  try {
    const res = await fetch(API_URL, { method: "POST", body: form });
    return await res.text();
  } catch (err) {
    console.error("Erro ao conectar API:", err);
    return "fetch_error";
  }
}

/****************************************************
 * ABRIR FORMULÁRIO (MODAL)
 ****************************************************/
function openModal(title, fields, callback) {
  document.getElementById("modalTitle").innerText = title;

  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  fields.forEach(field => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>${field}</label>
      <input data-field="${field}" />
    `;
    body.appendChild(div);
  });

  document.getElementById("modalSave").onclick = () => {
    const inputs = [...document.querySelectorAll("#modalBody input")];
    const values = inputs.map(i => i.value.trim());
    callback(values);
    closeModal();
  };

  document.getElementById("modal").style.display = "flex";
}

/****************************************************
 * FECHAR MODAL
 ****************************************************/
function closeModal() {
  document.getElementById("modal").style.display = "none";
}

/****************************************************
 * ADICIONAR ITEM
 ****************************************************/
async function addItem(sheet, fields) {
  openModal(`Adicionar em ${sheet}`, fields, async (result) => {
    const r = await sendToAPI("add", sheet, result);

    if (r === "added") {
      alert("Registro adicionado com sucesso!");
      location.reload();
    } else {
      alert("Erro ao adicionar: " + r);
    }
  });
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
 * GERAR DESPESAS FIXAS AUTOMATICAMENTE
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
 * CONECTAR BOTÕES DO HTML
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  // ------------ ENTRADAS ------------
  const btnAddEntrada = document.getElementById("btnAddEntrada");
  if (btnAddEntrada)
    btnAddEntrada.onclick = () => addItem("Entradas",
      ["Data", "Descrição", "Valor", "Categoria"]
    );

  // ------------ SAÍDAS ------------
  const btnAddSaida = document.getElementById("btnAddSaida");
  if (btnAddSaida)
    btnAddSaida.onclick = () => addItem("Saídas",
      ["Data", "Descrição", "Valor", "Categoria"]
    );

  // ------------ DIZIMISTAS ------------
  const btnAddDiz = document.getElementById("btnAddDizimista");
  if (btnAddDiz)
    btnAddDiz.onclick = () => addItem("Dizimistas",
      ["Nome", "Telefone", "Endereço"]
    );

  // ------------ DESPESAS FIXAS ------------
  const btnAddFix = document.getElementById("btnAddFixa");
  if (btnAddFix)
    btnAddFix.onclick = () => addItem("Despesas Fixas",
      ["Descrição", "Valor", "Dia do vencimento"]
    );

  // Botão GERAR despesas fixas
  const btnGerarFixas = document.getElementById("btnGenerateFixedUI");
  if (btnGerarFixas)
    btnGerarFixas.onclick = gerarDespesasFixas;
});
