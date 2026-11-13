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

  var formularioRecuperacao = document.getElementById('form-esqueci');
  if (formularioRecuperacao) {
    var email = formularioRecuperacao.querySelector('input[type="email"]');
    var erroEmail = document.getElementById('lg-erro-email');
    var statusRecuperacao = formularioRecuperacao.querySelector('[data-form-status]');
    var preenchimento = document.querySelector('[data-estado="preenchimento"]');
    var confirmacao = document.querySelector('[data-estado="confirmacao"]');
    var statusReenvio = confirmacao && confirmacao.querySelector('[data-form-status]');

    function validarEmail() {
      var valido = EMAIL.test(email.value.trim());
      if (erroEmail) erroEmail.hidden = valido;
      email.setAttribute('aria-invalid', valido ? 'false' : 'true');
      return valido;
    }

    email.addEventListener('input', validarEmail);

    async function enviarLink(botao) {
      if (!validarEmail()) {
        email.focus();
        return;
      }

      if (botao) botao.disabled = true;
      exibirStatus(statusRecuperacao, '', false);
      try {
        await solicitarRecuperacao(email.value.trim());
        if (preenchimento) preenchimento.hidden = true;
        if (confirmacao) confirmacao.hidden = false;
      } catch (erro) {
        exibirStatus(statusRecuperacao, erro.message, true);
      } finally {
        if (botao) botao.disabled = false;
      }
    }

    formularioRecuperacao.addEventListener('submit', function (evento) {
      evento.preventDefault();
      enviarLink(formularioRecuperacao.querySelector('[type="submit"]'));
    });

    var reenviar = document.querySelector('[data-acao="reenviar"]');
    if (reenviar) {
      reenviar.addEventListener('click', async function () {
        reenviar.disabled = true;
        try {
          await solicitarRecuperacao(email.value.trim());
          exibirStatus(statusReenvio, 'Se o e-mail estiver cadastrado, enviaremos outro link.', false);
        } catch (erro) {
          exibirStatus(statusReenvio, erro.message, true);
        } finally {
          reenviar.disabled = false;
        }
      });
    }
  }

  var formularioSenha = document.getElementById('form-nova-senha');
  if (formularioSenha) {
    var token = new URLSearchParams(window.location.search).get('token') || '';
    formularioSenha.elements.token.value = token;
    var statusSenha = formularioSenha.querySelector('[data-form-status]');
    var botaoSenha = formularioSenha.querySelector('[type="submit"]');
    if (!token) {
      exibirStatus(statusSenha, 'Link inválido. Solicite uma nova redefinição de senha.', true);
      botaoSenha.disabled = true;
    }

    formularioSenha.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      if (formularioSenha.elements.nova_senha.value !== formularioSenha.elements.confirmar_senha.value) {
        exibirStatus(statusSenha, 'A confirmação não corresponde à nova senha.', true);
        return;
      }

      botaoSenha.disabled = true;
      try {
        var resposta = await fetch('/api/redefinir-senha', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token,
            nova_senha: formularioSenha.elements.nova_senha.value
          })
        });
        var dados = await resposta.json().catch(function () { return {}; });
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível redefinir a senha.');
        document.querySelector('[data-estado="nova-senha"]').hidden = true;
        document.querySelector('[data-estado="senha-redefinida"]').hidden = false;
      } catch (erro) {
        exibirStatus(statusSenha, erro.message, true);
      } finally {
        botaoSenha.disabled = false;
      }
    });
  }
})();
