/* Librárvore - Preferências de leitura (tamanho do texto e tema)
   -----------------------------------------------------------------
   Carregar no <head> de TODAS as páginas (antes do CSS terminar de carregar),
   para o tema/tamanho salvos serem aplicados sem "piscar".

   O que faz:
   - lê as preferências salvas (localStorage) e define no <html>:
       data-tema="claro|escuro"   data-tamanho="pequeno|medio|grande"
   - liga os controles da página (botões e opções) a essas preferências.
   - Padrão: tema claro e tamanho médio.

   As preferências são aplicadas imediatamente e sincronizadas com a conta logada. */
(function () {
  'use strict';

  var CHAVE = 'librarvore:preferencias';
  var PADRAO = { tamanho: 'medio', tema: 'claro' };
  var TAMANHOS = ['pequeno', 'medio', 'grande'];
  var TEMAS = ['claro', 'escuro'];
  var ROTULO_TAMANHO = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
  var ROTULO_TEMA = { claro: 'Claro', escuro: 'Escuro' };

  function ler() {
    var p = { tamanho: PADRAO.tamanho, tema: PADRAO.tema };
    try {
      var v = JSON.parse(localStorage.getItem(CHAVE));
      if (v && TAMANHOS.indexOf(v.tamanho) > -1) p.tamanho = v.tamanho;
      if (v && TEMAS.indexOf(v.tema) > -1) p.tema = v.tema;
    } catch (e) { /* sem storage: usa o padrão */ }
    return p;
  }

  function aplicar(p) {
    var r = document.documentElement;
    r.setAttribute('data-tamanho', p.tamanho);
    r.setAttribute('data-tema', p.tema);
  }

  var prefs = ler();
  aplicar(prefs);                       // imediato

  function sincronizar() {
    document.querySelectorAll('[data-pref-tamanho]').forEach(function (el) {
      var ativo = el.getAttribute('data-pref-tamanho') === prefs.tamanho;
      if (el.type === 'radio') el.checked = ativo; else el.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });
    document.querySelectorAll('[data-pref-tema]').forEach(function (el) {
      var ativo = el.getAttribute('data-pref-tema') === prefs.tema;
      if (el.type === 'radio') el.checked = ativo; else el.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });
    document.querySelectorAll('[data-pref-resumo]').forEach(function (el) {
      el.textContent = 'Tamanho do texto: ' + ROTULO_TAMANHO[prefs.tamanho] + '  ·  Tema: ' + ROTULO_TEMA[prefs.tema];
    });
  }

  function definir(parcial, persistir) {
    if (parcial.tamanho && TAMANHOS.indexOf(parcial.tamanho) > -1) prefs.tamanho = parcial.tamanho;
    if (parcial.tema && TEMAS.indexOf(parcial.tema) > -1) prefs.tema = parcial.tema;
    try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch (e) { /* ignora */ }
    aplicar(prefs);
    sincronizar();
    window.dispatchEvent(new CustomEvent('librarvore:preferencias', { detail: { tamanho: prefs.tamanho, tema: prefs.tema } }));
    if (persistir === false) return;

    fetch('/api/preferencias', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    }).then(function (resposta) {
      return resposta.json().then(function (dados) {
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar as preferências.');
      });
    }).then(function () {
      status('Preferências salvas na sua conta.');
    }).catch(function (erro) {
      if (erro.message === 'Não autorizado') {
        window.location.href = '01-login.html';
        return;
      }
      status('Aplicadas neste dispositivo, mas não salvas na conta: ' + erro.message, true);
    });
  }

  function status(msg, erro) {
    document.querySelectorAll('[data-pref-status]').forEach(function (el) {
      el.textContent = msg;
      el.classList.toggle('is-erro', Boolean(erro));
      el.style.color = erro ? '#b42318' : '';
    });
  }

  async function salvarPreferencias() {
    var botoes = document.querySelectorAll('[data-acao="salvar-preferencias"]');
    botoes.forEach(function (botao) { botao.disabled = true; });
    status('Salvando preferências...');

    try {
      var resposta = await fetch('/api/preferencias', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      var dados = await resposta.json().catch(function () { return {}; });
      if (!resposta.ok) {
        var erro = new Error(dados.erro || 'Não foi possível salvar as preferências.');
        erro.status = resposta.status;
        throw erro;
      }

      status('Preferências salvas na sua conta.');
    } catch (erro) {
      if (erro.status === 401) {
        window.location.href = '01-login.html';
        return;
      }
      status('Aplicadas neste dispositivo, mas não salvas na conta: ' + erro.message, true);
    } finally {
      botoes.forEach(function (botao) { botao.disabled = false; });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    sincronizar();
    var salvarExplicitamente = Boolean(document.querySelector('[data-acao="salvar-preferencias"]'));

    document.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pref-tamanho], button[data-pref-tema]');
      if (b) {
        definir({ tamanho: b.getAttribute('data-pref-tamanho'), tema: b.getAttribute('data-pref-tema') }, !salvarExplicitamente);
        return;
      }
      var a = e.target.closest('[data-acao]');
      if (!a) return;
      var acao = a.getAttribute('data-acao');
      if (acao === 'restaurar-preferencias') {
        definir(PADRAO, !salvarExplicitamente);
        status('Preferências restauradas para o padrão (texto médio e tema claro).');
      }
      if (acao === 'salvar-preferencias') salvarPreferencias();
    });

    document.addEventListener('change', function (e) {
      var r = e.target;
      if (!r.matches || !r.matches('input[type="radio"][data-pref-tamanho], input[type="radio"][data-pref-tema]')) return;
      definir({ tamanho: r.getAttribute('data-pref-tamanho'), tema: r.getAttribute('data-pref-tema') }, !salvarExplicitamente);
      if (salvarExplicitamente) status('Alteração aplicada neste dispositivo. Selecione “Salvar preferências” para atualizar sua conta.');
      else status('');
    });
  });

  window.LibrarvorePreferencias = { obter: function () { return { tamanho: prefs.tamanho, tema: prefs.tema }; }, definir: definir };
})();

