// auth.js - proteção simples via localStorage
(function(){
  // páginas que não precisam de autenticação (login.html)
  const publicPages = ['login.html'];
  const path = location.pathname.split('/').pop();
  if(publicPages.includes(path)) return;

  // se não logado, redireciona
  if(localStorage.getItem('logged') !== 'true'){
    window.location.href = 'login.html';
  }

  // logout global
  window.logout = function(){
    localStorage.removeItem('logged');
    // opcional: remover credenciais temporárias
    window.location.href = 'login.html';
  }
})();
