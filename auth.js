// Bloqueia acesso caso não esteja logado
if (localStorage.getItem("logged") !== "true") {
    window.location.href = "login.html";
}

// Função de logout
function logout() {
    localStorage.removeItem("logged");
    window.location.href = "login.html";
}
