// Credenciais
const VALID_USER = "adminpib";
const VALID_PASS = "tesourariapib2025";

function login() {
    const user = document.getElementById("user").value;
    const pass = document.getElementById("pass").value;

    if (user === VALID_USER && pass === VALID_PASS) {
        localStorage.setItem("logged", "true");
        window.location.href = "admin.html";
    } else {
        document.getElementById("msg").innerText = "Usuário ou senha incorretos.";
    }
}
