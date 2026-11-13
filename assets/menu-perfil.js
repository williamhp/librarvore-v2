/* Librárvore - Menu do perfil do usuário
   Abre/fecha o painel ao clicar na foto, fora do painel ou com a tecla Esc.
   A animação (opacidade + deslize) é feita no CSS (.us-perfil-menu.is-aberto).
   Markup esperado: veja partials/cabecalho.html (data-perfil-menu / data-perfil-botao). */
(function () {
  'use strict';

  var menus = document.querySelectorAll('[data-perfil-menu]');
  if (!menus.length) return;

  function alternar(menu, abrir) {
    var botao = menu.querySelector('[data-perfil-botao]');
    menu.classList.toggle('is-aberto', abrir);
    botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }

  menus.forEach(function (menu) {
    var botao = menu.querySelector('[data-perfil-botao]');
    botao.addEventListener('click', function (e) {
      e.stopPropagation();
      alternar(menu, !menu.classList.contains('is-aberto'));
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) alternar(menu, false);   // clique fora fecha
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-aberto')) { alternar(menu, false); botao.focus(); }
    });
  });
})();


############################################################################
# ARQUIVO: assets/js/carrossel.js
############################################################################

/* Librárvore - Tela do Usuário
   Único uso de JavaScript: setas dos carrosséis (rolagem horizontal das prateleiras).
   O menu lateral em telas pequenas funciona só com CSS. */
(function () {
  'use strict';

  var botoes = document.querySelectorAll('[data-carrossel]');
  if (!botoes.length) return;

  function atualizar(lista) {
    document.querySelectorAll('[data-carrossel="#' + lista.id + '"]').forEach(function (b) {
      var dir = Number(b.getAttribute('data-direcao'));
      var max = lista.scrollWidth - lista.clientWidth;
      b.disabled = dir < 0 ? lista.scrollLeft <= 1 : lista.scrollLeft >= max - 1;
    });
  }

  botoes.forEach(function (botao) {
    var lista = document.querySelector(botao.getAttribute('data-carrossel'));
    if (!lista) return;
    botao.addEventListener('click', function () {
      var passo = Number(botao.getAttribute('data-direcao')) * lista.clientWidth * 0.8;
      lista.scrollBy({ left: passo, behavior: 'smooth' });
    });
    lista.addEventListener('scroll', function () { atualizar(lista); }, { passive: true });
    window.addEventListener('resize', function () { atualizar(lista); });
    atualizar(lista);
  });
})();
