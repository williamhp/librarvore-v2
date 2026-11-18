(function () {
  'use strict';

  var caminho = window.location.pathname.split('/').pop() || '';
  var paginaNova = /^(04-inicio|05-acervo|06-minha-lista|07-continuar-lendo|08-detalhes-livro|09-leitura|10-meu-perfil|11-configuracoes|12-preferencias-leitura)\.html$/.test(caminho);

  async function requisicao(url, opcoes) {
    var config = Object.assign({ credentials: 'same-origin' }, opcoes || {});
    if (config.body && typeof config.body !== 'string') {
      config.headers = Object.assign({}, config.headers, { 'Content-Type': 'application/json' });
      config.body = JSON.stringify(config.body);
    }

    var resposta = await fetch(url, config);
    var dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      var erro = new Error(dados.erro || 'Não foi possível concluir a operação.');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  function exibirStatus(elemento, mensagem, erro) {
    if (!elemento) {
      window.alert(mensagem);
      return;
    }
    elemento.textContent = mensagem;
    elemento.classList.toggle('is-erro', Boolean(erro));
    elemento.style.color = erro ? '#b42318' : '';
  }

  function urlLivro(livro, telaLeitura) {
    var params = new URLSearchParams({
      isbn: livro.isbn || '',
      titulo: livro.titulo || 'Livro',
      autor: livro.autor || 'Autor não informado'
    });
    return (telaLeitura ? '09-leitura.html?' : '08-detalhes-livro.html?') + params.toString();
  }

  // ── Paletas e ilustrações para capas estilo Art Deco ───────────────────────
  var PALETAS = [
    { fundo: '#7b1a1a', destaque: '#e8c97a', claro: '#f5e9c8', escuro: '#4a0f0f' }, // vermelho vinho
    { fundo: '#1a3a4a', destaque: '#d4a94a', claro: '#e8dfc0', escuro: '#0d1f28' }, // azul petróleo
    { fundo: '#2a4a1a', destaque: '#d9c86a', claro: '#eae5c0', escuro: '#152510' }, // verde floresta
    { fundo: '#4a2a0a', destaque: '#e8c87a', claro: '#f5e8c5', escuro: '#2a1505' }, // marrom café
    { fundo: '#1a1a4a', destaque: '#c8a8e8', claro: '#e5daf5', escuro: '#0d0d28' }, // azul noturno
    { fundo: '#3a1a4a', destaque: '#e8c87a', claro: '#f0e5c8', escuro: '#1e0d28' }, // roxo
    { fundo: '#4a3a0a', destaque: '#e0d060', claro: '#f0eab8', escuro: '#281f05' }, // dourado escuro
    { fundo: '#1a3a2a', destaque: '#a8d8b8', claro: '#d8ede0', escuro: '#0d1e16' }, // verde água
  ];

  var ILUSTRACOES = [
    // Olho (1984 / distopia / vigilância)
    function (p, w, h) {
      var cx = w / 2, cy = h * 0.38, rx = w * 0.32, ry = h * 0.14;
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + p.destaque + '" stroke-width="2.5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (ry * 0.55) + '" fill="' + p.destaque + '"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (ry * 0.25) + '" fill="' + p.escuro + '"/>' +
        '<line x1="' + (cx - rx) + '" y1="' + cy + '" x2="' + (cx + rx) + '" y2="' + cy + '" stroke="' + p.destaque + '" stroke-width="1" opacity="0.4"/>';
    },
    // Navio / caravela (aventura / história)
    function (p, w, h) {
      var cx = w / 2, base = h * 0.58;
      return '<path d="M' + (cx - w * 0.3) + ' ' + base + ' Q' + cx + ' ' + (base + h * 0.1) + ' ' + (cx + w * 0.3) + ' ' + base + ' Z" fill="' + p.destaque + '"/>' +
        '<line x1="' + cx + '" y1="' + (base - h * 0.35) + '" x2="' + cx + '" y2="' + base + '" stroke="' + p.claro + '" stroke-width="2"/>' +
        '<path d="M' + cx + ' ' + (base - h * 0.33) + ' L' + (cx + w * 0.22) + ' ' + (base - h * 0.15) + ' L' + cx + ' ' + (base - h * 0.1) + ' Z" fill="' + p.claro + '" opacity="0.9"/>' +
        '<path d="M' + cx + ' ' + (base - h * 0.33) + ' L' + (cx - w * 0.18) + ' ' + (base - h * 0.18) + ' L' + cx + ' ' + (base - h * 0.12) + ' Z" fill="' + p.claro + '" opacity="0.7"/>' +
        '<path d="M' + (w * 0.05) + ' ' + (base + h * 0.04) + ' Q' + (w * 0.25) + ' ' + (base + h * 0.01) + ' ' + (w * 0.5) + ' ' + (base + h * 0.04) + ' Q' + (w * 0.75) + ' ' + (base + h * 0.07) + ' ' + (w * 0.95) + ' ' + (base + h * 0.04) + '" fill="none" stroke="' + p.destaque + '" stroke-width="1.5" opacity="0.5"/>';
    },
    // Megafone / discurso (política / sociedade)
    function (p, w, h) {
      var cx = w / 2, cy = h * 0.38;
      return '<rect x="' + (cx - w * 0.08) + '" y="' + (cy - h * 0.08) + '" width="' + (w * 0.16) + '" height="' + (h * 0.2) + '" rx="3" fill="' + p.destaque + '"/>' +
        '<path d="M' + (cx + w * 0.08) + ' ' + (cy - h * 0.06) + ' L' + (cx + w * 0.28) + ' ' + (cy - h * 0.18) + ' L' + (cx + w * 0.28) + ' ' + (cy + h * 0.14) + ' L' + (cx + w * 0.08) + ' ' + (cy + h * 0.12) + ' Z" fill="' + p.destaque + '"/>' +
        '<path d="M' + (cx + w * 0.28) + ' ' + (cy - h * 0.08) + ' Q' + (cx + w * 0.4) + ' ' + cy + ' ' + (cx + w * 0.28) + ' ' + (cy + h * 0.08) + '" fill="none" stroke="' + p.claro + '" stroke-width="2"/>' +
        '<line x1="' + (cx - w * 0.08) + '" y1="' + (cy + h * 0.12) + '" x2="' + (cx - w * 0.08) + '" y2="' + (cy + h * 0.26) + '" stroke="' + p.destaque + '" stroke-width="4"/>';
    },
    // Colunas gregas (clássico / filosofia / história)
    function (p, w, h) {
      var base = h * 0.62, topo = h * 0.2, col = w / 5;
      var cols = '';
      for (var i = 1; i <= 3; i++) {
        var x = col * i - col * 0.08;
        cols += '<rect x="' + x + '" y="' + topo + '" width="' + (col * 0.16) + '" height="' + (base - topo) + '" fill="' + p.destaque + '" opacity="' + (i === 2 ? '1' : '0.75') + '"/>' +
          '<rect x="' + (x - col * 0.04) + '" y="' + topo + '" width="' + (col * 0.24) + '" height="' + (h * 0.04) + '" fill="' + p.destaque + '" opacity="' + (i === 2 ? '1' : '0.75') + '"/>' +
          '<rect x="' + (x - col * 0.04) + '" y="' + (base - h * 0.04) + '" width="' + (col * 0.24) + '" height="' + (h * 0.04) + '" fill="' + p.destaque + '" opacity="' + (i === 2 ? '1' : '0.75') + '"/>';
      }
      return cols + '<line x1="' + (w * 0.1) + '" y1="' + base + '" x2="' + (w * 0.9) + '" y2="' + base + '" stroke="' + p.destaque + '" stroke-width="2"/>';
    },
    // Montanha / horizonte (aventura / ficção científica)
    function (p, w, h) {
      var base = h * 0.62;
      return '<path d="M0 ' + base + ' L' + (w * 0.3) + ' ' + (h * 0.22) + ' L' + (w * 0.55) + ' ' + (h * 0.42) + ' L' + (w * 0.7) + ' ' + (h * 0.3) + ' L' + w + ' ' + base + ' Z" fill="' + p.destaque + '" opacity="0.85"/>' +
        '<path d="M0 ' + (base + h * 0.04) + ' L' + w + ' ' + (base + h * 0.04) + '" stroke="' + p.destaque + '" stroke-width="1.5" opacity="0.4"/>' +
        '<circle cx="' + (w * 0.75) + '" cy="' + (h * 0.2) + '" r="' + (w * 0.1) + '" fill="' + p.destaque + '" opacity="0.6"/>' +
        '<path d="M' + (w * 0.28) + ' ' + (h * 0.25) + ' L' + (w * 0.32) + ' ' + (h * 0.25) + ' L' + (w * 0.3) + ' ' + (h * 0.21) + ' Z" fill="' + p.claro + '"/>';
    },
    // Livro aberto (literatura / poesia)
    function (p, w, h) {
      var cx = w / 2, cy = h * 0.38;
      return '<path d="M' + (cx - w * 0.3) + ' ' + (cy - h * 0.18) + ' L' + (cx - w * 0.02) + ' ' + (cy - h * 0.1) + ' L' + (cx - w * 0.02) + ' ' + (cy + h * 0.18) + ' L' + (cx - w * 0.3) + ' ' + (cy + h * 0.1) + ' Z" fill="' + p.destaque + '"/>' +
        '<path d="M' + (cx + w * 0.3) + ' ' + (cy - h * 0.18) + ' L' + (cx + w * 0.02) + ' ' + (cy - h * 0.1) + ' L' + (cx + w * 0.02) + ' ' + (cy + h * 0.18) + ' L' + (cx + w * 0.3) + ' ' + (cy + h * 0.1) + ' Z" fill="' + p.destaque + '" opacity="0.8"/>' +
        '<line x1="' + cx + '" y1="' + (cy - h * 0.1) + '" x2="' + cx + '" y2="' + (cy + h * 0.18) + '" stroke="' + p.claro + '" stroke-width="1.5"/>' +
        '<line x1="' + (cx - w * 0.24) + '" y1="' + (cy - h * 0.06) + '" x2="' + (cx - w * 0.06) + '" y2="' + (cy - h * 0.02) + '" stroke="' + p.fundo + '" stroke-width="1" opacity="0.6"/>' +
        '<line x1="' + (cx - w * 0.24) + '" y1="' + (cy + h * 0.02) + '" x2="' + (cx - w * 0.06) + '" y2="' + (cy + h * 0.05) + '" stroke="' + p.fundo + '" stroke-width="1" opacity="0.6"/>';
    },
    // Crânio / ossos (terror / suspense)
    function (p, w, h) {
      var cx = w / 2, cy = h * 0.35;
      return '<ellipse cx="' + cx + '" cy="' + (cy - h * 0.02) + '" rx="' + (w * 0.22) + '" ry="' + (h * 0.2) + '" fill="' + p.destaque + '"/>' +
        '<rect x="' + (cx - w * 0.14) + '" y="' + (cy + h * 0.15) + '" width="' + (w * 0.28) + '" height="' + (h * 0.08) + '" rx="3" fill="' + p.destaque + '"/>' +
        '<rect x="' + (cx - w * 0.09) + '" y="' + (cy + h * 0.15) + '" width="' + (w * 0.06) + '" height="' + (h * 0.1) + '" fill="' + p.fundo + '"/>' +
        '<rect x="' + (cx - w * 0.01) + '" y="' + (cy + h * 0.15) + '" width="' + (w * 0.06) + '" height="' + (h * 0.1) + '" fill="' + p.fundo + '"/>' +
        '<ellipse cx="' + (cx - w * 0.09) + '" cy="' + (cy - h * 0.02) + '" rx="' + (w * 0.07) + '" ry="' + (h * 0.07) + '" fill="' + p.fundo + '"/>' +
        '<ellipse cx="' + (cx + w * 0.09) + '" cy="' + (cy - h * 0.02) + '" rx="' + (w * 0.07) + '" ry="' + (h * 0.07) + '" fill="' + p.fundo + '"/>';
    },
    // Foguete / planeta (ficção científica / fantasia)
    function (p, w, h) {
      var cx = w / 2, cy = h * 0.4;
      return '<ellipse cx="' + (cx + w * 0.2) + '" cy="' + (h * 0.22) + '" rx="' + (w * 0.14) + '" ry="' + (h * 0.07) + '" fill="none" stroke="' + p.destaque + '" stroke-width="1.5" opacity="0.6"/>' +
        '<path d="M' + cx + ' ' + (cy - h * 0.22) + ' Q' + (cx + w * 0.1) + ' ' + (cy - h * 0.1) + ' ' + (cx + w * 0.08) + ' ' + (cy + h * 0.12) + ' L' + (cx - w * 0.08) + ' ' + (cy + h * 0.12) + ' Q' + (cx - w * 0.1) + ' ' + (cy - h * 0.1) + ' ' + cx + ' ' + (cy - h * 0.22) + ' Z" fill="' + p.destaque + '"/>' +
        '<path d="M' + (cx - w * 0.08) + ' ' + (cy + h * 0.08) + ' L' + (cx - w * 0.18) + ' ' + (cy + h * 0.18) + ' L' + (cx - w * 0.02) + ' ' + (cy + h * 0.12) + ' Z" fill="' + p.destaque + '" opacity="0.7"/>' +
        '<path d="M' + (cx + w * 0.08) + ' ' + (cy + h * 0.08) + ' L' + (cx + w * 0.18) + ' ' + (cy + h * 0.18) + ' L' + (cx + w * 0.02) + ' ' + (cy + h * 0.12) + ' Z" fill="' + p.destaque + '" opacity="0.7"/>' +
        '<circle cx="' + cx + '" cy="' + (cy - h * 0.02) + '" r="' + (w * 0.06) + '" fill="' + p.fundo + '" stroke="' + p.claro + '" stroke-width="1.5"/>';
    },
  ];

  function gerarHashTitulo(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function montarCapa(titulo, categoria) {
    var str = (titulo || 'Livro').toLowerCase();
    var hash = gerarHashTitulo(str);
    var paleta = PALETAS[hash % PALETAS.length];

    // escolhe ilustração por palavra-chave do título ou categoria, senão por hash
    var iluIdx = hash % ILUSTRACOES.length;
    var cat = (categoria || '').toLowerCase();
    var t = str;
    if (/1984|distopia|vigil|polit|revol|animal|fahrenheit|laranja|conto da aia/.test(t)) iluIdx = 0;
    else if (/navio|mar|pirat|oceano|explorac|aventur|riqueza|naç/.test(t)) iluIdx = 1;
    else if (/administr|marketing|negoci|gestão|empresa|lider/.test(t)) iluIdx = 2;
    else if (/administr|teoria|direito|filosofi|socrat|plat|arist|classic|greek|roman/.test(t + cat)) iluIdx = 3;
    else if (/dun|fundac|hobbit|senhor|espaç|mochil|galáxia|solaris|neuromancer|odisseia/.test(t)) iluIdx = 7;
    else if (/admiravel|mundo novo|ficção cient|robot|eu rob/.test(t)) iluIdx = 7;
    else if (/ilumina|cemitér|dracul|frankenstein|corali|terror|horror|assombr|monstro/.test(t)) iluIdx = 6;
    else if (/dom casmurro|orgulho|anna|senhora|guarani|iracema|moreninha|primo basíl|cortiç|macunaima|vidas/.test(t)) iluIdx = 5;
    else if (/guerra|tronos|nome do vento|silmarillion|eragon|magia|feitiç|harry|brux/.test(t)) iluIdx = 4;
    else if (/crime|castigo|silencio|codigo|anjos|garota|nome da rosa|poliicial|detetiv|assassin/.test(t)) iluIdx = 0;

    var W = 124, H = 186;
    var linhasDecor = '';
    // linhas Art Deco no fundo
    for (var i = 0; i < 5; i++) {
      var y = H * 0.08 + i * H * 0.025;
      linhasDecor += '<line x1="' + (W * 0.08) + '" y1="' + y + '" x2="' + (W * 0.92) + '" y2="' + y + '" stroke="' + paleta.destaque + '" stroke-width="0.5" opacity="0.2"/>';
    }
    // bordas geométricas
    linhasDecor += '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" rx="2" fill="none" stroke="' + paleta.destaque + '" stroke-width="1" opacity="0.35"/>';
    linhasDecor += '<rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" rx="1" fill="none" stroke="' + paleta.destaque + '" stroke-width="0.5" opacity="0.2"/>';

    // faixa do título
    var tituloExibido = (titulo || 'Livro').length > 22 ? (titulo || 'Livro').slice(0, 20) + '…' : (titulo || 'Livro');
    var faixaTitulo =
      '<rect x="0" y="' + (H * 0.72) + '" width="' + W + '" height="' + (H * 0.28) + '" fill="' + paleta.escuro + '" opacity="0.82"/>' +
      '<foreignObject x="8" y="' + (H * 0.73) + '" width="' + (W - 16) + '" height="' + (H * 0.26) + '">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:\'Hind\',sans-serif;font-size:10px;font-weight:700;color:' + paleta.destaque + ';line-height:1.25;word-break:break-word;text-align:center;padding-top:4px;">' +
          tituloExibido +
        '</div>' +
      '</foreignObject>';

    var svgNS = 'http://www.w3.org/2000/svg';
    var capa = document.createElement('div');
    capa.className = 'us-capa';
    capa.setAttribute('role', 'img');
    capa.setAttribute('aria-label', 'Capa de ' + (titulo || 'livro'));

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('xmlns', svgNS);

    svg.innerHTML =
      '<rect width="' + W + '" height="' + H + '" fill="' + paleta.fundo + '"/>' +
      linhasDecor +
      ILUSTRACOES[iluIdx](paleta, W, H) +
      faixaTitulo;

    capa.appendChild(svg);
    return capa;
  }

  function montarCard(livro, indice, opcoes) {
    var item = document.createElement('li');
    var artigo = document.createElement('article');
    artigo.className = opcoes.classe || 'us-card-livro us-card-livro--verde';
    artigo.dataset.livroId = livro.isbn || '';

    if (opcoes.classe === 'us-card-lista') {
      var capaArea = document.createElement('div');
      capaArea.className = 'us-card-lista__capa-area';
      var capaLink = document.createElement('a');
      capaLink.className = 'us-capa';
      capaLink.href = urlLivro(livro, false);
      capaLink.setAttribute('role', 'img');
      capaLink.setAttribute('aria-label', 'Capa de ' + (livro.titulo || 'livro'));
      capaLink.appendChild(montarCapa(livro.titulo, livro.categoria).querySelector('svg'));
      capaArea.appendChild(capaLink);
      artigo.appendChild(capaArea);

      var tituloLista = document.createElement('h3');
      tituloLista.className = 'us-card-lista__titulo';
      var linkTitulo = document.createElement('a');
      linkTitulo.href = capaLink.href;
      linkTitulo.textContent = livro.titulo || 'Livro sem título';
      tituloLista.appendChild(linkTitulo);
      var autorLista = document.createElement('p');
      autorLista.className = 'us-card-lista__autor';
      autorLista.textContent = livro.autor || 'Autor não informado';
      artigo.append(tituloLista, autorLista);
      if (!opcoes.semDetalhe) {
        var detalheLista = document.createElement('a');
        detalheLista.className = 'us-card-lista__detalhes';
        detalheLista.href = capaLink.href;
        detalheLista.textContent = 'Ver detalhes';
        artigo.appendChild(detalheLista);
      }

      if (opcoes.favorito || opcoes.remover) {
        var botaoLista = document.createElement('button');
        botaoLista.type = 'button';
        botaoLista.className = opcoes.remover ? 'us-card-lista__remover' : 'us-card-lista__salvar';
        botaoLista.setAttribute('aria-pressed', 'false');
        botaoLista.setAttribute('aria-label', opcoes.remover ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista');
        if (!opcoes.remover) {
          var iconeLista = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          var coracaoLista = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          iconeLista.setAttribute('class', 'us-icone');
          iconeLista.setAttribute('aria-hidden', 'true');
          iconeLista.setAttribute('focusable', 'false');
          coracaoLista.setAttribute('href', '#i-coracao');
          iconeLista.appendChild(coracaoLista);
          botaoLista.appendChild(iconeLista);
        } else {
          botaoLista.textContent = 'Remover da lista';
        }
        botaoLista.addEventListener('click', async function () {
          try {
            await requisicao('/api/favoritos' + (opcoes.remover ? '/' + encodeURIComponent(livro.isbn) : ''), {
              method: opcoes.remover ? 'DELETE' : 'POST',
              body: opcoes.remover ? undefined : { isbn: livro.isbn }
            });
            if (opcoes.remover) {
              await carregarFavoritos();
              return;
            }
            else {
              botaoLista.setAttribute('aria-pressed', 'true');
              botaoLista.setAttribute('aria-label', 'Livro adicionado à Minha Lista');
              botaoLista.disabled = true;
            }
            window.dispatchEvent(new CustomEvent('librarvore-refresh', { detail: { tipo: 'favoritos' } }));
          } catch (erro) {
            if (erro.status === 401) window.location.href = '01-login.html';
            else window.alert(erro.message);
          }
        });
        capaArea.appendChild(botaoLista);
      }

      item.appendChild(artigo);
      item.dataset.indice = String(indice);
      return item;
    }

    var link = document.createElement('a');
    link.className = opcoes.linkClasse || 'us-card-livro__link';
    link.href = urlLivro(livro, false);
    link.appendChild(montarCapa(livro.titulo, livro.categoria));

    var titulo = document.createElement('h3');
    titulo.className = opcoes.tituloClasse || 'us-card-livro__titulo';
    titulo.textContent = livro.titulo || 'Livro sem título';
    var autor = document.createElement('p');
    autor.className = opcoes.autorClasse || 'us-card-livro__autor';
    autor.textContent = livro.autor || 'Autor não informado';
    link.appendChild(titulo);
    link.appendChild(autor);
    artigo.appendChild(link);

    if (opcoes.favorito || opcoes.remover) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.className = opcoes.remover ? 'us-card-lista__remover' : 'us-card-lista__salvar';
      botao.textContent = opcoes.remover ? 'Remover da lista' : 'Adicionar à Minha Lista';
      botao.addEventListener('click', async function () {
        try {
          await requisicao('/api/favoritos' + (opcoes.remover ? '/' + encodeURIComponent(livro.isbn) : ''), {
            method: opcoes.remover ? 'DELETE' : 'POST',
            body: opcoes.remover ? undefined : { isbn: livro.isbn }
          });
          if (opcoes.remover) item.remove();
          else {
            botao.textContent = 'Adicionado à Minha Lista';
            botao.disabled = true;
          }
          window.dispatchEvent(new CustomEvent('librarvore-refresh', { detail: { tipo: 'favoritos' } }));
        } catch (erro) {
          if (erro.status === 401) window.location.href = '01-login.html';
          else window.alert(erro.message);
        }
      });
      artigo.appendChild(botao);
    }

    if (!opcoes.semDetalhe) {
      var detalhes = document.createElement('a');
      detalhes.className = 'us-card-lista__detalhes';
      detalhes.href = link.href;
      detalhes.textContent = 'Ver detalhes';
      artigo.appendChild(detalhes);
    }

    item.appendChild(artigo);
    item.dataset.indice = String(indice);
    return item;
  }

  function preencherCards(lista, livros, opcoes) {
    if (!lista) return;
    lista.replaceChildren();
    livros.forEach(function (livro, indice) {
      lista.appendChild(montarCard(livro, indice, opcoes));
    });
  }

  async function carregarIdentidade() {
    var temCabecalho = document.querySelector('[data-perfil-menu]');
    var leitor = document.querySelector('[data-leitura]');
    if (!temCabecalho && !leitor && caminho !== '09-leitor.html') return null;

    try {
      var perfil = await requisicao('/api/perfil');
      var nome = perfil.nome || perfil.login;
      document.querySelectorAll('.us-perfil__nome').forEach(function (el) { el.textContent = nome; });
      document.querySelectorAll('.us-perfil__avatar').forEach(function (el) { el.textContent = nome.slice(0, 1).toLocaleUpperCase('pt-BR'); });
      document.querySelectorAll('.us-identificacao__nome').forEach(function (el) { el.textContent = nome; });
      document.querySelectorAll('#us-nome').forEach(function (el) { el.value = nome; });
      document.querySelectorAll('#us-email').forEach(function (el) { el.value = perfil.login; });
      sessionStorage.setItem('usuarioLogado', perfil.login);
      return perfil;
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else document.querySelectorAll('[data-backend-status]').forEach(function (el) {
        exibirStatus(el, erro.message, true);
      });
      return null;
    }
  }

  function conectarLogout() {
    document.querySelectorAll('[data-acao="sair"]').forEach(function (link) {
      link.addEventListener('click', async function (evento) {
        evento.preventDefault();
        try {
          await requisicao('/api/logout', { method: 'POST' });
          sessionStorage.removeItem('usuarioLogado');
          window.location.href = '01-login.html';
        } catch (erro) {
          window.alert(erro.message);
        }
      });
    });
  }

  function conectarPerfil() {
    var formulario = document.querySelector('[data-perfil-form]');
    if (!formulario) return;

    var nome = formulario.querySelector('[name="nome"]');
    var botaoEditar = formulario.querySelector('[data-acao="editar-perfil"]');
    var status = formulario.querySelector('[data-form-status]');
    if (botaoEditar && nome) {
      botaoEditar.addEventListener('click', function () {
        nome.readOnly = false;
        nome.focus();
        botaoEditar.hidden = true;
        formulario.querySelector('[type="submit"]').hidden = false;
      });
    }

    formulario.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      try {
        var resultado = await requisicao('/api/perfil', { method: 'PUT', body: { nome: nome.value } });
        document.querySelectorAll('.us-identificacao__nome, .us-perfil__nome').forEach(function (el) {
          el.textContent = resultado.nome;
        });
        document.querySelectorAll('.us-perfil__avatar, .us-avatar-grande').forEach(function (el) {
          el.textContent = resultado.nome.slice(0, 1).toLocaleUpperCase('pt-BR');
        });
        nome.readOnly = true;
        if (botaoEditar) botaoEditar.hidden = false;
        formulario.querySelector('[type="submit"]').hidden = true;
        exibirStatus(status, 'Perfil atualizado.', false);
      } catch (erro) {
        if (erro.status === 401) window.location.href = '01-login.html';
        else exibirStatus(status, erro.message, true);
      }
    });

  }

  function conectarSenha() {
    document.querySelectorAll('[data-nova-senha]').forEach(function (formulario) {
      formulario.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        var atual = formulario.elements.senha_atual.value;
        var nova = formulario.elements.nova_senha.value;
        var confirmar = formulario.elements.confirmar_senha.value;
        var status = formulario.querySelector('[data-form-status]');
        if (nova !== confirmar) {
          exibirStatus(status, 'A confirmação não corresponde à nova senha.', true);
          return;
        }
        try {
          await requisicao('/api/senha', { method: 'POST', body: { senha_atual: atual, nova_senha: nova } });
          formulario.reset();
          exibirStatus(status, 'Senha alterada com sucesso.', false);
        } catch (erro) {
          if (erro.status === 401) window.location.href = '01-login.html';
          else exibirStatus(status, erro.message, true);
        }
      });
    });

    document.querySelectorAll('[data-acao="alterar-senha"]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var formulario = document.querySelector('[data-nova-senha]');
        if (formulario) {
          formulario.hidden = false;
          formulario.querySelector('[name="senha_atual"]').focus();
        }
      });
    });
  }

  function conectarConfiguracoes() {
    var formulario = document.querySelector('[data-configuracoes]');
    if (!formulario) return;

    requisicao('/api/preferencias').then(function (prefs) {
      var tamanho = formulario.querySelector('[name="tamanho-texto"]');
      var tema = formulario.querySelector('[name="tema-leitura"]');
      if (tamanho) tamanho.value = prefs.tamanho;
      if (tema) tema.value = prefs.tema;
      var prazo = formulario.querySelector('[name="notif-prazo"]');
      var novidades = formulario.querySelector('[name="notif-novidades"]');
      if (prazo) prazo.checked = Boolean(Number(prefs.notif_prazo));
      if (novidades) novidades.checked = Boolean(Number(prefs.notif_novidades));
      if (window.LibrarvorePreferencias) window.LibrarvorePreferencias.definir(prefs, false);
    }).catch(function (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(formulario.querySelector('[data-form-status]'), erro.message, true);
    });

    formulario.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      var dados = new FormData(formulario);
      try {
        var prefsSalvas = await requisicao('/api/preferencias', {
          method: 'PUT',
          body: {
            tamanho: dados.get('tamanho-texto') || (window.LibrarvorePreferencias && window.LibrarvorePreferencias.obter().tamanho),
            tema: dados.get('tema-leitura') || (window.LibrarvorePreferencias && window.LibrarvorePreferencias.obter().tema),
            notif_prazo: dados.has('notif-prazo'),
            notif_novidades: dados.has('notif-novidades')
          }
        });
        if (window.LibrarvorePreferencias) window.LibrarvorePreferencias.definir(prefsSalvas, false);
        exibirStatus(formulario.querySelector('[data-form-status]'), 'Configurações salvas.', false);
      } catch (erro) {
        if (erro.status === 401) window.location.href = '01-login.html';
        else exibirStatus(formulario.querySelector('[data-form-status]'), erro.message, true);
      }
    });
  }

  async function carregarPreferenciasConta() {
    if (!window.LibrarvorePreferencias || !document.querySelector('[data-perfil-menu]')) return;
    if (document.querySelector('[data-configuracoes]')) return;
    try {
      var preferencias = await requisicao('/api/preferencias');
      window.LibrarvorePreferencias.definir(preferencias, false);
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else document.querySelectorAll('[data-pref-status]').forEach(function (el) {
        exibirStatus(el, erro.message, true);
      });
    }
  }

  async function carregarAcervo() {
    var lista = document.querySelector('.us-grade-livros');
    if (!lista || !paginaNova || caminho !== '05-acervo.html') return;

    var params = new URLSearchParams(window.location.search);
    var query = new URLSearchParams();
    if (params.get('q')) query.set('q', params.get('q'));
    if (params.get('categoria')) query.set('categoria', params.get('categoria'));
    try {
      var dados = await requisicao('/api/livros' + (query.toString() ? '?' + query.toString() : ''));
      var livros = Array.isArray(dados.livros) ? dados.livros : [];
      var estadoLista = document.querySelector('[data-estado="lista"]');
      var estadoVazio = document.querySelector('[data-estado="sem-resultados"]');
      var contagem = document.querySelector('.us-contagem');
      var limite = 12;
      var exibir = function () {
        preencherCards(lista, livros.slice(0, limite), { classe: 'us-card-lista', linkClasse: 'us-card-lista__titulo', tituloClasse: 'us-card-lista__titulo', autorClasse: 'us-card-lista__autor', favorito: true });
        if (contagem) contagem.textContent = livros.length + ' livro' + (livros.length === 1 ? '' : 's') + ' encontrado' + (livros.length === 1 ? '' : 's');
        if (estadoLista) estadoLista.hidden = livros.length === 0;
        if (estadoVazio) estadoVazio.hidden = livros.length !== 0;
        var carregarMais = document.querySelector('[data-acao="carregar-mais"]');
        if (carregarMais) carregarMais.hidden = limite >= livros.length;
      };
      exibir();
      var carregarMais = document.querySelector('[data-acao="carregar-mais"]');
      if (carregarMais) carregarMais.addEventListener('click', function () {
        limite += 12;
        exibir();
      });
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(document.querySelector('[data-backend-status]'), erro.message, true);
    }
  }

  async function carregarFavoritos() {
    if (caminho !== '06-minha-lista.html') return;
    var lista = document.querySelector('.us-grade-livros');
    if (!lista) return;
    try {
      var livros = await requisicao('/api/favoritos');
      preencherCards(lista, livros, { classe: 'us-card-lista', favorito: false, remover: true });
      var contagem = document.querySelector('.us-contagem');
      if (contagem) contagem.textContent = livros.length + ' livro' + (livros.length === 1 ? '' : 's') + ' salvo' + (livros.length === 1 ? '' : 's');
      var estadoLista = document.querySelector('[data-estado="lista"]');
      var estadoVazio = document.querySelector('[data-estado="lista-vazia"]');
      if (estadoLista) estadoLista.hidden = livros.length === 0;
      if (estadoVazio) estadoVazio.hidden = livros.length !== 0;
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(document.querySelector('[data-backend-status]'), erro.message, true);
    }
  }

  async function carregarLeituras() {
    if (caminho !== '07-continuar-lendo.html') return;
    var lista = document.querySelector('.us-continuar-lista');
    if (!lista) return;
    try {
      var livros = await requisicao('/api/progresso');
      lista.replaceChildren();
      var destaque = document.querySelector('.us-card-continuar--destaque');
      if (destaque) {
        if (livros.length) {
          var primeiro = livros[0];
          var pctDestaque = Math.max(0, Math.min(100, Number(primeiro.progresso) || 0));
          destaque.dataset.livroId = primeiro.isbn || '';
          destaque.querySelector('.us-card-continuar__titulo').textContent = primeiro.titulo || 'Livro';
          destaque.querySelector('.us-card-continuar__autor').textContent = primeiro.autor || 'Autor não informado';
          destaque.querySelector('.us-card-continuar__pct').textContent = pctDestaque + '% lido';
          destaque.querySelector('.us-progresso__barra').style.width = pctDestaque + '%';
          destaque.querySelector('.us-progresso').setAttribute('aria-valuenow', String(pctDestaque));
          destaque.querySelector('.us-capa').href = urlLivro(primeiro, true);
          destaque.querySelector('.us-botao').href = urlLivro(primeiro, true);
          destaque.querySelector('.us-capa').replaceChildren(montarCapa(primeiro.titulo, primeiro.categoria));
        } else {
          destaque.closest('section').hidden = true;
        }
      }
      livros.slice(1).forEach(function (livro, indice) {
        var item = document.createElement('li');
        var card = document.createElement('article');
        card.className = 'us-card-continuar';
        card.dataset.livroId = livro.isbn;
        var capaLink = document.createElement('a');
        capaLink.className = 'us-capa';
        capaLink.href = urlLivro(livro, true);
        capaLink.appendChild(montarCapa(livro.titulo, livro.categoria));
        card.appendChild(capaLink);
        var info = document.createElement('div');
        info.className = 'us-card-continuar__info';
        var titulo = document.createElement('h3');
        titulo.className = 'us-card-continuar__titulo';
        titulo.textContent = livro.titulo || 'Livro';
        var autor = document.createElement('p');
        autor.className = 'us-card-continuar__autor';
        autor.textContent = livro.autor || 'Autor não informado';
        var progresso = Math.max(0, Math.min(100, Number(livro.progresso) || 0));
        var barra = document.createElement('div');
        barra.className = 'us-progresso';
        barra.setAttribute('role', 'progressbar');
        barra.setAttribute('aria-valuemin', '0');
        barra.setAttribute('aria-valuemax', '100');
        barra.setAttribute('aria-valuenow', String(progresso));
        var preenchimento = document.createElement('span');
        preenchimento.className = 'us-progresso__barra';
        preenchimento.style.width = progresso + '%';
        barra.appendChild(preenchimento);
        var percentual = document.createElement('p');
        percentual.className = 'us-card-continuar__pct';
        percentual.textContent = progresso + '% lido';
        var continuar = document.createElement('a');
        continuar.className = 'us-botao us-botao--pequeno';
        continuar.href = capaLink.href;
        continuar.textContent = 'Continuar leitura';
        info.append(titulo, autor, barra, percentual, continuar);
        card.appendChild(info);
        item.appendChild(card);
        lista.appendChild(item);
      });
      var estado = document.querySelector('[data-estado="lista"]');
      var vazio = document.querySelector('[data-estado="continuar-vazio"]');
      if (estado) estado.hidden = livros.length === 0;
      if (vazio) vazio.hidden = livros.length !== 0;
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(document.querySelector('[data-backend-status]'), erro.message, true);
    }
  }

  async function carregarInicio() {
    if (caminho !== '04-inicio.html') return;
    try {
      var resultados = await Promise.all([
        requisicao('/api/livros'),
        requisicao('/api/categorias'),
        requisicao('/api/progresso')
      ]);
      var livros = Array.isArray(resultados[0].livros) ? resultados[0].livros : [];
      var listas = document.querySelectorAll('.us-lista-cards');
      if (listas[0]) preencherCards(listas[0], livros.slice(0, 5), { semDetalhe: true });
      if (listas[1]) preencherCards(listas[1], livros.slice(5, 10), { semDetalhe: true, classe: 'us-card-livro us-card-livro--verde' });

      var categorias = document.querySelector('.us-grade-categorias');
      if (categorias) {
        categorias.replaceChildren();
        resultados[1].categorias.forEach(function (categoria, indice) {
          var item = document.createElement('li');
          var link = document.createElement('a');
          link.className = 'us-categoria us-categoria--' + ((indice % 8) + 1);
          link.href = '05-acervo.html?categoria=' + encodeURIComponent(categoria.categoria);
          link.textContent = categoria.categoria + ' (' + categoria.total + ')';
          item.appendChild(link);
          categorias.appendChild(item);
        });
      }

      var prateleira = document.querySelector('#us-prat-continuar');
      if (prateleira) {
        prateleira.replaceChildren();
        resultados[2].slice(0, 5).forEach(function (livro) {
          var item = document.createElement('li');
          item.className = 'us-capa-prat';
          var link = document.createElement('a');
          link.className = 'us-capa-prat__link';
          link.href = urlLivro(livro, true);
          link.appendChild(montarCapa(livro.titulo, livro.categoria));
          var progresso = document.createElement('p');
          progresso.className = 'us-capa-prat__texto';
          progresso.textContent = (Number(livro.progresso) || 0) + '% lido';
          link.appendChild(progresso);
          item.appendChild(link);
          prateleira.appendChild(item);
        });
      }
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(document.querySelector('[data-backend-status]'), erro.message, true);
    }
  }

  async function carregarDetalhes() {
    if (caminho !== '08-detalhes-livro.html') return;
    var isbn = new URLSearchParams(window.location.search).get('isbn');
    if (!isbn) {
      exibirStatus(document.querySelector('[data-backend-status]'), 'Selecione um livro no acervo para ver os detalhes.', true);
      return;
    }
    try {
      var livro = await requisicao('/api/livros/' + encodeURIComponent(isbn));
      document.querySelectorAll('.us-detalhe__titulo').forEach(function (el) { el.textContent = livro.titulo; });
      document.querySelectorAll('.us-detalhe__autor').forEach(function (el) { el.textContent = livro.autor; });
      var capa = document.querySelector('.us-detalhe > .us-capa');
      if (capa) {
        capa.setAttribute('aria-label', 'Capa de ' + (livro.titulo || 'livro'));
        if (!capa.querySelector('img')) capa.textContent = livro.titulo || 'Livro';
      }
      document.querySelectorAll('.us-detalhe__sinopse').forEach(function (el) { el.textContent = livro.sinopse || 'Sinopse não disponível.'; });
      var chip = document.querySelector('.us-chip');
      if (chip) {
        chip.textContent = livro.categoria || 'Acervo';
        chip.href = '05-acervo.html?categoria=' + encodeURIComponent(livro.categoria || '');
      }
      document.querySelectorAll('.us-detalhe__dados dd').forEach(function (el, indice) {
        el.textContent = [livro.editora, livro.copyright, livro.paginas, livro.isbn][indice] || '—';
      });
      document.querySelectorAll('.us-detalhe__acoes a.us-botao').forEach(function (el) {
        el.href = urlLivro(livro, true);
      });
      var botaoFavorito = document.querySelector('[data-acao="salvar-lista"]');
      if (botaoFavorito) {
        var favoritos = await requisicao('/api/favoritos');
        var salvo = favoritos.some(function (item) { return String(item.isbn) === String(livro.isbn); });
        var atualizarBotaoFavorito = function () {
          botaoFavorito.textContent = salvo ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista';
          botaoFavorito.setAttribute('aria-pressed', String(salvo));
        };
        atualizarBotaoFavorito();
        botaoFavorito.addEventListener('click', async function () {
          botaoFavorito.disabled = true;
          try {
            await requisicao('/api/favoritos' + (salvo ? '/' + encodeURIComponent(livro.isbn) : ''), {
              method: salvo ? 'DELETE' : 'POST',
              body: salvo ? undefined : { isbn: livro.isbn }
            });
            salvo = !salvo;
            atualizarBotaoFavorito();
          } catch (erro) {
            if (erro.status === 401) window.location.href = '01-login.html';
            else window.alert(erro.message);
          } finally {
            botaoFavorito.disabled = false;
          }
        });
      }
      var relacionados = document.querySelector('.us-lista-cards');
      if (relacionados) {
        var outros = (await requisicao('/api/livros?categoria=' + encodeURIComponent(livro.categoria || ''))).livros
          .filter(function (item) { return item.isbn !== livro.isbn; })
          .slice(0, 5);
        preencherCards(relacionados, outros, { semDetalhe: true });
      }
    } catch (erro) {
      if (erro.status === 401) window.location.href = '01-login.html';
      else exibirStatus(document.querySelector('[data-backend-status]'), erro.message, true);
    }
  }

  async function iniciarLogin() {
    var formulario = document.getElementById('formLogin');
    if (!formulario) return;
    var enviar = async function (cadastrar) {
      var mensagem = document.getElementById('msgLogin');
      if (mensagem) mensagem.classList.add('escondido');
      if (!formulario.reportValidity()) return;
      try {
        await requisicao('/api/' + (cadastrar ? 'cadastro' : 'login'), {
          method: 'POST',
          body: {
            login: document.getElementById('email').value.trim(),
            senha: document.getElementById('senha').value
          }
        });
        window.location.href = '04-inicio.html';
      } catch (erro) {
        exibirStatus(mensagem, erro.message, true);
        if (mensagem) mensagem.classList.remove('escondido');
      }
    };
    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      enviar(false);
    });
    window.entrar = function () { enviar(false); };
    window.cadastrar = function () { enviar(true); };
  }

  document.addEventListener('DOMContentLoaded', function () {
    iniciarLogin();
    conectarLogout();
    conectarPerfil();
    conectarSenha();
    conectarConfiguracoes();
    carregarIdentidade();
    carregarPreferenciasConta();
    carregarInicio();
    carregarAcervo();
    carregarFavoritos();
    carregarLeituras();
    carregarDetalhes();
  });
})();

