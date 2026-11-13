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
      if (!menu.contains(e.target)) alternar(menu, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-aberto')) { alternar(menu, false); botao.focus(); }
    });
  });
})();
