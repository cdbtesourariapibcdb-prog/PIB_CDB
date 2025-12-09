/****************************************************
 * dashboard_admin.js – versão final 100% compatível
 * Funciona com JSONP (sem CORS) + Apps Script
 ****************************************************/

// === CONFIGURAÇÃO ===
const API_URL =
  "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/dev";

/****************************************************
 * FUNÇÃO GLOBAL PARA CHAMAR A API (JSONP)
 ****************************************************/
async function callAPI(params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_callback_" + Math.floor(Math.random() * 999999);

    window[callbackName] = function (data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    const query = new URLSearchParams({
      ...params,
      callback: callbackName
    }).toString();

    const script = document.createElement("script");
    script.src = `${API_URL}?${query}`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/****************************************************
 * ABRE MODAL
 ****************************************************/
function openModal(title, fields, sheet, editingRow = null) {
  document.getElementById("modalTitle").innerText = title;

  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  fields.forEach(f => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label class="small">${f.label}</label>
      <input id="field_${f.id}" value="${f.value ?? ""}">
    `;
    body.appendChild(div);
  });

  document.getElementById("modalSave").onclick = async () => {
    const values = fields.map(f => {
      const inp = document.getElementById(`field_${f.id}`);
      return inp.value;
    });

    if (editingRow) {
      const r = await callAPI({
        action: "update",
        sheet,
        row: editingRow,
        data: JSON.stringify(values)
      });

      alert(r === "updated" ? "Atualizado!" : "Erro: " + r);
    } else {
      const r = await callAPI({
        action: "add",
        sheet,
        data: JSON.stringify(values)
      });

      alert(r === "added" ? "Adicionado!" : "Erro: " + r);
    }

    closeModal();
    loadTables();
  };

  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

/****************************************************
 * DELETAR REGISTRO
 ****************************************************/
async function deleteItem(sheet, row) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  const r = await callAPI({
    action: "delete",
    sheet,
    row
  });

  alert(r === "deleted" ? "Excluído!" : "Erro: " + r);

  loadTables();
}

/****************************************************
 * CARREGAR TABELAS
 ****************************************************/
async function loadTables() {
  loadEntradas();
  loadSaidas();
  loadDizimistas();
  loadFixas();
}

/****************************************************
 * ENTRADAS
 ****************************************************/
async function loadEntradas() {
  const data = await callAPI({ action: "entradas", sheet: "Entradas" });

  const div = document.getElementById("tableEntradas");
  if (!div) return;

  let html = `
    <table><tr>
      <th>#</th><th>Data</th><th>Descrição</th>
      <th>Valor</th><th>Categoria</th><th>Ações</th>
    </tr>
  `;

  data.forEach((row, i) => {
    html += `
      <tr>
        <td>${i + 2}</td>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>
          <button onclick="editEntrada(${i + 2}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">✏️</button>
          <button onclick="deleteItem('Entradas', ${i + 2})">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  div.innerHTML = html;
}

function editEntrada(row, item) {
  openModal(
    "Editar Entrada",
    [
      { id: "data", label: "Data", value: item[0] },
      { id: "desc", label: "Descrição", value: item[1] },
      { id: "valor", label: "Valor", value: item[2] },
      { id: "cat", label: "Categoria", value: item[3] }
    ],
    "Entradas",
    row
  );
}

document.getElementById("btnAddEntrada").onclick = () =>
  openModal(
    "Adicionar Entrada",
    [
      { id: "data", label: "Data" },
      { id: "desc", label: "Descrição" },
      { id: "valor", label: "Valor" },
      { id: "cat", label: "Categoria" }
    ],
    "Entradas"
  );

/****************************************************
 * SAÍDAS
 ****************************************************/
async function loadSaidas() {
  const data = await callAPI({ action: "saidas", sheet: "Saídas" });

  const div = document.getElementById("tableSaidas");
  if (!div) return;

  let html = `
    <table><tr>
      <th>#</th><th>Data</th><th>Despesa</th>
      <th>Valor</th><th>Observação</th><th>Ações</th>
    </tr>
  `;

  data.forEach((row, i) => {
    html += `
      <tr>
        <td>${i + 2}</td>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>
          <button onclick="editSaida(${i + 2}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">✏️</button>
          <button onclick="deleteItem('Saídas', ${i + 2})">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  div.innerHTML = html;
}

function editSaida(row, item) {
  openModal(
    "Editar Saída",
    [
      { id: "data", label: "Data", value: item[0] },
      { id: "desp", label: "Despesa", value: item[1] },
      { id: "valor", label: "Valor", value: item[2] },
      { id: "obs", label: "Observação", value: item[3] }
    ],
    "Saídas",
    row
  );
}

document.getElementById("btnAddSaida").onclick = () =>
  openModal(
    "Adicionar Saída",
    [
      { id: "data", label: "Data" },
      { id: "desp", label: "Despesa" },
      { id: "valor", label: "Valor" },
      { id: "obs", label: "Observação" }
    ],
    "Saídas"
  );

/****************************************************
 * DIZIMISTAS
 ****************************************************/
async function loadDizimistas() {
  const data = await callAPI({ action: "dizimistas", sheet: "Dizimistas" });

  const div = document.getElementById("tableDizimistas");
  if (!div) return;

  let html = `
    <table><tr>
      <th>#</th><th>Nome</th><th>Telefone</th>
      <th>Dízimo Mensal</th><th>Ações</th>
    </tr>
  `;

  data.forEach((row, i) => {
    html += `
      <tr>
        <td>${i + 2}</td>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>
          <button onclick="editDiz(${i + 2}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">✏️</button>
          <button onclick="deleteItem('Dizimistas', ${i + 2})">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  div.innerHTML = html;
}

function editDiz(row, item) {
  openModal(
    "Editar Dizimista",
    [
      { id: "nome", label: "Nome", value: item[0] },
      { id: "tel", label: "Telefone", value: item[1] },
      { id: "valor", label: "Dízimo Mensal", value: item[2] }
    ],
    "Dizimistas",
    row
  );
}

document.getElementById("btnAddDizimista").onclick = () =>
  openModal(
    "Adicionar Dizimista",
    [
      { id: "nome", label: "Nome" },
      { id: "tel", label: "Telefone" },
      { id: "valor", label: "Dízimo Mensal" }
    ],
    "Dizimistas"
  );

/****************************************************
 * DESPESAS FIXAS
 ****************************************************/
async function loadFixas() {
  const data = await callAPI({ action: "fixas", sheet: "Despesas Fixas" });

  const div = document.getElementById("tableFixas");
  if (!div) return;

  let html = `
    <table><tr>
      <th>#</th><th>Despesa</th><th>Valor</th>
      <th>Dia</th><th>Categoria</th><th>Ações</th>
    </tr>
  `;

  data.forEach((row, i) => {
    html += `
      <tr>
        <td>${i + 2}</td>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>
          <button onclick="editFixa(${i + 2}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">✏️</button>
          <button onclick="deleteItem('Despesas Fixas', ${i + 2})">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  div.innerHTML = html;
}

function editFixa(row, item) {
  openModal(
    "Editar Despesa Fixa",
    [
      { id: "nome", label: "Despesa", value: item[0] },
      { id: "valor", label: "Valor", value: item[1] },
      { id: "dia", label: "Dia", value: item[2] },
      { id: "cat", label: "Categoria", value: item[3] }
    ],
    "Despesas Fixas",
    row
  );
}

document.getElementById("btnAddFixa").onclick = () =>
  openModal(
    "Adicionar Despesa Fixa",
    [
      { id: "nome", label: "Despesa" },
      { id: "valor", label: "Valor" },
      { id: "dia", label: "Dia" },
      { id: "cat", label: "Categoria" }
    ],
    "Despesas Fixas"
  );

/****************************************************
 * GERAR DESPESAS FIXAS
 ****************************************************/
document.getElementById("btnGenerateFixedUI").onclick = async () => {
  const r = await callAPI({ action: "generate_fixed" });
  alert(r === "generated_fixed" ? "Despesas fixas geradas!" : "Erro: " + r);
  loadTables();
};

/****************************************************
 * INICIAR
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  loadTables();
});
