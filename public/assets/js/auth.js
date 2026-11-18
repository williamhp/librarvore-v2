(function () {
  'use strict';

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function exibirStatus(elemento, mensagem, erro) {
    if (!elemento) return;
    elemento.textContent = mensagem;
    elemento.setAttribute('aria-live', 'polite');
    elemento.classList.toggle('lg-erro', Boolean(erro));
  }

  async function solicitarRecuperacao(email) {
    var resposta = await fetch('/api/recuperar-senha', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    var dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível solicitar a recuperação.');
    return dados;
  }

  // ── 02-esqueci-senha: verifica o e-mail e redireciona para 03-nova-senha ─────
  var formularioRecuperacao = document.getElementById('form-esqueci');
  if (formularioRecuperacao) {
    var emailInput   = formularioRecuperacao.querySelector('input[type="email"]');
    var erroEmail    = document.getElementById('lg-erro-email');
    var statusEtapa1 = formularioRecuperacao.querySelector('[data-form-status]');

    function validarEmail() {
      var valido = EMAIL.test(emailInput.value.trim());
      if (erroEmail) erroEmail.hidden = valido;
      emailInput.setAttribute('aria-invalid', valido ? 'false' : 'true');
      return valido;
    }

    emailInput.addEventListener('input', validarEmail);

    formularioRecuperacao.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      if (!validarEmail()) { emailInput.focus(); return; }

      var botao = formularioRecuperacao.querySelector('[type="submit"]');
      botao.disabled = true;
      exibirStatus(statusEtapa1, '', false);

      try {
        await solicitarRecuperacao(emailInput.value.trim());
        sessionStorage.setItem('recuperacao_email', emailInput.value.trim());
        window.location.href = '/03-nova-senha.html';
      } catch (erro) {
        exibirStatus(statusEtapa1, erro.message, true);
      } finally {
        botao.disabled = false;
      }
    });
  }

  // ── 03-nova-senha: lê o e-mail do sessionStorage e redefine a senha ──────────
  var formularioSenha = document.getElementById('form-nova-senha');
  if (formularioSenha) {
    var emailRecuperacao = sessionStorage.getItem('recuperacao_email') || '';
    var erroConfirma     = document.getElementById('lg-erro-confirma');
    var statusSenha      = formularioSenha.querySelector('[data-form-status]');
    var botaoSenha       = formularioSenha.querySelector('[type="submit"]');

    if (!emailRecuperacao) {
      exibirStatus(statusSenha, 'Acesso inválido. Solicite uma nova redefinição de senha.', true);
      botaoSenha.disabled = true;
    }

    formularioSenha.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var nova     = formularioSenha.elements.nova_senha.value;
      var confirma = formularioSenha.elements.confirmar_senha.value;

      if (nova !== confirma) {
        if (erroConfirma) erroConfirma.hidden = false;
        formularioSenha.elements.confirmar_senha.setAttribute('aria-invalid', 'true');
        formularioSenha.elements.confirmar_senha.focus();
        return;
      }
      if (erroConfirma) erroConfirma.hidden = true;
      formularioSenha.elements.confirmar_senha.setAttribute('aria-invalid', 'false');

      botaoSenha.disabled = true;
      exibirStatus(statusSenha, '', false);

      try {
        var resposta = await fetch('/api/redefinir-senha', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailRecuperacao, nova_senha: nova })
        });
        var dados = await resposta.json().catch(function () { return {}; });
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível redefinir a senha.');
        sessionStorage.removeItem('recuperacao_email');
        document.querySelector('[data-estado="nova-senha"]').hidden      = true;
        document.querySelector('[data-estado="senha-redefinida"]').hidden = false;
      } catch (erro) {
        exibirStatus(statusSenha, erro.message, true);
      } finally {
        botaoSenha.disabled = false;
      }
    });
  }
})();
