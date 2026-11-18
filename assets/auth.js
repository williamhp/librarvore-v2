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

  // ── Recuperação de senha: passo 1 (e-mail) ──────────────────────────────────
  var formularioRecuperacao = document.getElementById('form-esqueci');
  if (formularioRecuperacao) {
    var emailInput   = formularioRecuperacao.querySelector('input[type="email"]');
    var erroEmail    = document.getElementById('lg-erro-email');
    var statusEtapa1 = formularioRecuperacao.querySelector('[data-form-status]');
    var estadoEmail  = document.querySelector('[data-estado="preenchimento"]');
    var estadoCodigo = document.querySelector('[data-estado="verificacao"]');

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
        var destino = estadoCodigo && estadoCodigo.querySelector('[data-email-destino]');
        if (destino) destino.textContent = emailInput.value.trim();
        if (estadoEmail)  estadoEmail.hidden  = true;
        if (estadoCodigo) estadoCodigo.hidden = false;
        var codigoInput = document.getElementById('lg-codigo');
        if (codigoInput) codigoInput.focus();
      } catch (erro) {
        exibirStatus(statusEtapa1, erro.message, true);
      } finally {
        botao.disabled = false;
      }
    });
  }

  // ── Recuperação de senha: passo 2 (código) ──────────────────────────────────
  var formularioVerificacao = document.getElementById('form-verificacao');
  if (formularioVerificacao) {
    var codigoInput  = document.getElementById('lg-codigo');
    var erroCodigo   = document.getElementById('lg-erro-codigo');
    var statusEtapa2 = formularioVerificacao.querySelector('[data-form-status]');

    codigoInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 6);
      var valido = /^\d{6}$/.test(this.value);
      if (erroCodigo) erroCodigo.hidden = valido || this.value.length === 0;
      this.setAttribute('aria-invalid', valido ? 'false' : 'true');
    });

    formularioVerificacao.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var codigo = codigoInput.value.trim();
      if (!/^\d{6}$/.test(codigo)) {
        if (erroCodigo) erroCodigo.hidden = false;
        codigoInput.setAttribute('aria-invalid', 'true');
        codigoInput.focus();
        return;
      }

      var botao = formularioVerificacao.querySelector('[type="submit"]');
      botao.disabled = true;
      exibirStatus(statusEtapa2, '', false);

      var emailEl  = document.getElementById('lg-email');
      var emailVal = emailEl ? emailEl.value.trim() : '';

      try {
        var resposta = await fetch('/api/verificar-codigo', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, codigo: codigo })
        });
        var dados = await resposta.json().catch(function () { return {}; });
        if (!resposta.ok) throw new Error(dados.erro || 'Código inválido ou expirado.');
        // Avança para o passo 3 na mesma página
        document.querySelector('[data-estado="verificacao"]').hidden = true;
        document.querySelector('[data-estado="nova-senha"]').hidden  = false;
        document.getElementById('lg-nova').focus();
      } catch (erro) {
        exibirStatus(statusEtapa2, erro.message, true);
      } finally {
        botao.disabled = false;
      }
    });

    var reenviar = document.querySelector('[data-acao="reenviar"]');
    if (reenviar) {
      reenviar.addEventListener('click', async function () {
        reenviar.disabled = true;
        exibirStatus(statusEtapa2, '', false);
        var emailEl  = document.getElementById('lg-email');
        var emailVal = emailEl ? emailEl.value.trim() : '';
        try {
          await solicitarRecuperacao(emailVal);
          exibirStatus(statusEtapa2, 'Código reenviado! Confira também a caixa de spam.', false);
        } catch (erro) {
          exibirStatus(statusEtapa2, erro.message, true);
        } finally {
          reenviar.disabled = false;
        }
      });
    }
  }

  // ── Recuperação de senha: passo 3 (nova senha) ──────────────────────────────
  var formularioSenha = document.getElementById('form-nova-senha');
  if (formularioSenha) {
    var erroConfirma = document.getElementById('lg-erro-confirma');
    var statusEtapa3 = formularioSenha.querySelector('[data-form-status]');
    var botaoSenha   = formularioSenha.querySelector('[type="submit"]');

    formularioSenha.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var nova      = formularioSenha.elements.nova_senha.value;
      var confirma  = formularioSenha.elements.confirmar_senha.value;

      if (nova !== confirma) {
        if (erroConfirma) erroConfirma.hidden = false;
        formularioSenha.elements.confirmar_senha.setAttribute('aria-invalid', 'true');
        formularioSenha.elements.confirmar_senha.focus();
        return;
      }
      if (erroConfirma) erroConfirma.hidden = true;
      formularioSenha.elements.confirmar_senha.setAttribute('aria-invalid', 'false');

      var emailEl  = document.getElementById('lg-email');
      var emailVal = emailEl ? emailEl.value.trim() : '';

      botaoSenha.disabled = true;
      exibirStatus(statusEtapa3, '', false);

      try {
        var resposta = await fetch('/api/redefinir-senha', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, nova_senha: nova })
        });
        var dados = await resposta.json().catch(function () { return {}; });
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível redefinir a senha.');
        document.querySelector('[data-estado="nova-senha"]').hidden      = true;
        document.querySelector('[data-estado="senha-redefinida"]').hidden = false;
      } catch (erro) {
        exibirStatus(statusEtapa3, erro.message, true);
      } finally {
        botaoSenha.disabled = false;
      }
    });
  }
})();
