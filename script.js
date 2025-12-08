// 🔗 LINKS CSV DAS ABAS DO GOOGLE SHEETS
const URL_ENTRADAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=0&single=true&output=csv";
const URL_SAIDAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=269334175&single=true&output=csv";
const URL_DIZIMISTAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh0vNTCXhhO5EzswiYLCgKAyqEqUv3WeOUJh60qBmLeCaAK-rUhAp4dvZMxTT9dsPO2mTYYPThlGQD/pub?gid=250812166&single=true&output=csv";

// ----------------------
// Função que carrega CSV
// ----------------------
async function fetchCsv(url) {
  const res = await fetch(url);
  const text = await res.text();
  
  const rows = text.trim().split("\n").map(l => l.split(","));
  const headers = rows.shift();

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (row[i] || "").trim());
    return obj;
  });
}

// ----------------------
// Renderiza tabela HTML
// ----------------------
function renderTable(title, data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<h2>${title}</h2>`;

  if (!data || data.length === 0) {
    container.innerHTML += "<p>Nenhum dado disponível.</p>";
    return;
  }

  let html = "<table><tr>";
  Object.keys(data[0]).forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += "</tr>";

  data.forEach(row => {
    html += "<tr>";
    Object.values(row).forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  container.innerHTML += html;
}

// ----------------------
// Carrega tudo
// ----------------------
async function loadDashboard() {
  try {
    const entradas = await fetchCsv(URL_ENTRADAS);
    const saidas = await fetchCsv(URL_SAIDAS);
    const dizimistas = await fetchCsv(URL_DIZIMISTAS);

    renderTable("Entradas", entradas, "entradas");
    renderTable("Saídas", saidas, "saidas");
    renderTable("Dizimistas", dizimistas, "dizimistas");

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar dados do Google Sheets.");
  }
}

loadDashboard();

