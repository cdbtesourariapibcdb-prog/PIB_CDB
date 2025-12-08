// login.js - inicial, usa credenciais guardadas em localStorage cfg_user/cfg_pass quando existentes
const DEFAULT_USER = localStorage.getItem('cfg_user') || 'adminpib';
const DEFAULT_PASS = localStorage.getItem('cfg_pass') || 'tesourariapib2025';

function login(){
  const user = document.getElementById('user').value.trim();
  const pass = document.getElementById('pass').value.trim();
  if(user === DEFAULT_USER && pass === DEFAULT_PASS){
    localStorage.setItem('logged','true');
    // keep credentials? no: but we can store active user
    window.location.href = 'admin.html';
  } else {
    document.getElementById('msg').innerText = 'Usuário ou senha incorretos.';
  }
}
