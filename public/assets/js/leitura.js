/* Librárvore - Tela de leitura (09-leitura.html)
   - passa entre as páginas do livro (botões Anterior/Próximo e setas do teclado)
   - atualiza indicador de página/capítulo e barra de progresso
   - botão "Baixar livro (.txt)"

   BACK-END: cada página do livro é uma <section class="us-pagina-livro"> com
   data-capitulo, data-numero (nº da página) e data-pct (% lido). Os valores atuais são EXEMPLOS.
   Download: se o botão tiver data-download-url="..." o arquivo vem do servidor;
   sem esse atributo, este script gera um .txt de demonstração com o texto da tela. */
(function () {
  'use strict';

  var raiz = document.querySelector('[data-leitura]');
  if (!raiz) return;

  var paginas = Array.prototype.slice.call(raiz.querySelectorAll('.us-pagina-livro'));
  var anterior = document.querySelector('[data-leitura-anterior]');
  var proximo = document.querySelector('[data-leitura-proximo]');
  var texto = document.querySelector('[data-leitura-texto]');
  var barra = document.querySelector('[data-leitura-barra]');
  var numero = document.querySelector('[data-leitura-numero]');
  var status = document.querySelector('[data-leitura-status]');
  var isbn = new URLSearchParams(window.location.search).get('isbn') || '';
  var linkDetalhes = document.querySelector('.us-leitura-voltar');
  var timerSalvar;
  var total = Number(raiz.getAttribute('data-total-paginas')) || 240;
  var totalCap = Number(raiz.getAttribute('data-total-capitulos')) || 12;
  var atual = 0;

  if (linkDetalhes) {
    linkDetalhes.href = isbn
      ? '08-detalhes-livro.html?' + new URLSearchParams({ isbn: isbn }).toString()
      : '05-acervo.html';
  }

  function salvarProgresso(pct, keepalive) {
    if (!isbn) return Promise.resolve();
    return fetch('/api/progresso', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: Boolean(keepalive),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isbn: isbn,
        titulo: raiz.getAttribute('data-titulo') || '',
        autor: raiz.getAttribute('data-autor') || '',
        progresso: pct
      })
    }).then(function (resposta) {
      return resposta.json().then(function (dados) {
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar seu progresso.');
      });
    }).catch(function (erro) {
      if (status) status.textContent = erro.message;
      else console.error('Falha ao salvar o progresso de leitura:', erro);
    });
  }

  function mostrar(i, salvar) {
    if (i < 0 || i >= paginas.length) return;
    atual = i;
    paginas.forEach(function (p, k) { p.hidden = k !== i; });
    var p = paginas[i];
    var pct = Number(p.getAttribute('data-pct')) || 0;
    var n = p.getAttribute('data-numero');
    texto.textContent = 'Capítulo ' + p.getAttribute('data-capitulo') + ' de ' + totalCap + '  ·  Página ' + n + ' de ' + total + '  ·  ' + pct + '% lido';
    numero.textContent = 'Página ' + n + ' de ' + total;
    barra.style.width = pct + '%';
    barra.parentNode.setAttribute('aria-valuenow', pct);
    anterior.disabled = i === 0;
    proximo.disabled = i === paginas.length - 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (salvar !== false) {
      clearTimeout(timerSalvar);
      timerSalvar = setTimeout(function () { salvarProgresso(pct, false); }, 250);
    }
  }

  anterior.addEventListener('click', function () { mostrar(atual - 1); });
  proximo.addEventListener('click', function () { mostrar(atual + 1); });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') mostrar(atual - 1);
    if (e.key === 'ArrowRight') mostrar(atual + 1);
  });

  // ----- download -----
  var aviso = document.querySelector('[data-aviso-download]');
  var avisoTimer;
  function avisar(nome) {
    if (!aviso) return;
    aviso.querySelector('[data-aviso-texto]').textContent = 'Download iniciado: ' + nome;
    aviso.classList.add('is-visivel');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { aviso.classList.remove('is-visivel'); }, 2500);
  }
  document.querySelectorAll('[data-acao="baixar-livro"]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-download-url');
      var nome = (b.getAttribute('data-download-nome') || 'nome-do-livro') + '.txt';
      var a = document.createElement('a');
      if (url) { a.href = url; }
      else {
        var linhas = [raiz.getAttribute('data-titulo') || 'Nome do Livro', raiz.getAttribute('data-autor') || 'Escritor do livro', 'ISBN ' + (raiz.getAttribute('data-isbn') || ''), '', '(texto de demonstração)', ''];
        paginas.forEach(function (p) { linhas.push(p.innerText.trim(), ''); });
        a.href = URL.createObjectURL(new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' }));
      }
      a.download = nome;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      avisar(nome);
    });
  });

  mostrar(0, false);

  async function carregarDadosDoLivro() {
    if (!isbn) {
      if (status) status.textContent = 'Livro não informado. Volte ao acervo e selecione uma obra.';
      return;
    }

    try {
      var respostaLivro = await fetch('/api/livros/' + encodeURIComponent(isbn), { credentials: 'same-origin' });
      var dadosLivro = await respostaLivro.json().catch(function () { return {}; });
      if (!respostaLivro.ok) throw new Error(dadosLivro.erro || 'Não foi possível carregar o livro.');

      raiz.setAttribute('data-isbn', dadosLivro.isbn);
      raiz.setAttribute('data-titulo', dadosLivro.titulo || 'Livro');
      raiz.setAttribute('data-autor', dadosLivro.autor || 'Autor não informado');
      if (Number(dadosLivro.paginas) > 0) total = Number(dadosLivro.paginas);
      var tituloEl = raiz.querySelector('.us-leitura-info h1');
      var infoEl = raiz.querySelector('.us-leitura-info p');
      if (tituloEl) tituloEl.textContent = dadosLivro.titulo || 'Livro';
      if (infoEl) infoEl.textContent = (dadosLivro.autor || 'Autor não informado') + ' · ISBN ' + dadosLivro.isbn;
      document.title = (dadosLivro.titulo || 'Livro') + ' — Librárvore';

      var respostaProgresso = await fetch('/api/progresso', { credentials: 'same-origin' });
      var progressoSalvo = await respostaProgresso.json().catch(function () { return []; });
      if (!respostaProgresso.ok) throw new Error(progressoSalvo.erro || 'Não foi possível carregar seu progresso.');
      var registro = progressoSalvo.find(function (item) { return item.isbn === dadosLivro.isbn; });
      if (registro) {
        var alvo = Math.max(0, Math.min(100, Number(registro.progresso) || 0));
        var melhorIndice = paginas.reduce(function (melhor, pagina, indice) {
          var distancia = Math.abs((Number(pagina.getAttribute('data-pct')) || 0) - alvo);
          return distancia < melhor.distancia ? { indice: indice, distancia: distancia } : melhor;
        }, { indice: 0, distancia: Infinity });
        mostrar(melhorIndice.indice, false);
      } else {
        await salvarProgresso(Number(paginas[0].getAttribute('data-pct')) || 0, false);
      }
    } catch (erro) {
      if (status) status.textContent = erro.message;
      else console.error('Falha ao carregar o leitor:', erro);
    }
  }

  carregarDadosDoLivro();
  window.addEventListener('beforeunload', function () {
    salvarProgresso(Number(paginas[atual].getAttribute('data-pct')) || 0, true);
  });
})();
