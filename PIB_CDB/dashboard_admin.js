const API_URL = "https://script.google.com/macros/s/AKfycbzdeHEsqNvldjx-38-W3ynWyC_pLi5OvH2VCCxmNyg/dev";

// ------- Função de envio para API ---------
async function sendToAPI(data) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("Erro na resposta da API");
        }

        return await response.json();
    } catch (error) {
        console.error("Erro ao enviar:", error);
        alert("Erro ao conectar com o servidor. Verifique a publicação do WebApp!");
    }
}

// ------- Funções de Adicionar Itens ---------
async function addEntrada() {
    const descricao = document.getElementById("entrada-desc").value;
    const valor = document.getElementById("entrada-valor").value;

    if (!descricao || !valor) return alert("Preencha os campos!");

    await sendToAPI({
        type: "entrada",
        descricao,
        valor
    });

    alert("Entrada adicionada!");
}

async function addSaida() {
    const descricao = document.getElementById("saida-desc").value;
    const valor = document.getElementById("saida-valor").value;

    if (!descricao || !valor) return alert("Preencha os campos!");

    await sendToAPI({
        type: "saida",
        descricao,
        valor
    });

    alert("Saída adicionada!");
}

async function addDizimista() {
    const nome = document.getElementById("diz-nome").value;
    const valor = document.getElementById("diz-valor").value;

    if (!nome || !valor) return alert("Preencha os campos!");

    await sendToAPI({
        type: "dizimista",
        nome,
        valor
    });

    alert("Dizimista adicionado!");
}

async function addDespesaFixa() {
    const nome = document.getElementById("fixa-nome").value;
    const valor = document.getElementById("fixa-valor").value;

    if (!nome || !valor) return alert("Preencha os campos!");

    await sendToAPI({
        type: "despesafixa",
        nome,
        valor
    });

    alert("Despesa fixa adicionada!");
}

// ------- Liga botões ao JS ---------
document.getElementById("btnAddEntrada").onclick = addEntrada;
document.getElementById("btnAddSaida").onclick = addSaida;
document.getElementById("btnAddDiz").onclick = addDizimista;
document.getElementById("btnAddFixa").onclick = addDespesaFixa;
