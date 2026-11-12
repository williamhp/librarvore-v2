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

  function montarCapa(titulo) {
    var capa = document.createElement('div');
    capa.className = 'us-capa';
    capa.setAttribute('role', 'img');
    capa.setAttribute('aria-label', 'Capa de ' + (titulo || 'livro'));
    capa.textContent = titulo || 'Livro';
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
      capaLink.textContent = livro.titulo || 'Livro';
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
    link.appendChild(montarCapa(livro.titulo));

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
          destaque.querySelector('.us-capa').replaceChildren(montarCapa(primeiro.titulo));
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
        capaLink.appendChild(montarCapa(livro.titulo));
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
          link.appendChild(montarCapa(livro.titulo));
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
