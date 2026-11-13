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

