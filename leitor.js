// Lê os parâmetros da URL (?isbn=...&titulo=...&autor=...&usuario=...)
const params = new URLSearchParams(location.search);

const isbn    = params.get('isbn')    || '—';
const titulo  = params.get('titulo')  || 'Livro';
const autor   = params.get('autor')   || 'Autor Desconhecido';
const usuario = params.get('usuario') || '—';
const LIBRARVORE_REFRESH_KEY = 'librarvore:atualizacao';

function notificarAtualizacao(tipo = 'leitura') {
    const payload = { tipo, timestamp: Date.now() };
    try {
        localStorage.setItem(LIBRARVORE_REFRESH_KEY, JSON.stringify(payload));
    } catch (erro) {
        console.warn('Não foi possível notificar a atualização de leitura:', erro);
    }

    try {
        window.dispatchEvent(new CustomEvent('librarvore-refresh', { detail: payload }));
    } catch (erro) {
        console.warn('Não foi possível disparar o evento de atualização:', erro);
    }
}

function calcularProgressoLeitura() {
    const alturaTotal = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percentual = Math.round((window.scrollY / alturaTotal) * 100);
    return Math.max(0, Math.min(100, percentual));
}

async function salvarProgresso(progressoOverride) {
    if (!isbn || isbn === '—') return;

    const progresso = Math.max(0, Math.min(100, Number(progressoOverride ?? calcularProgressoLeitura()) || 0));

    try {
        const resposta = await fetch('/api/progresso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbn, titulo, autor, progresso })
        });

        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar o progresso.');
        notificarAtualizacao('leitura');
    } catch (erro) {
        console.warn('Não foi possível salvar o progresso:', erro);
    }
}

// Atualiza a tela
document.getElementById('tituloLivro').textContent = titulo;
document.getElementById('infoLivro').textContent   = `por ${autor} · ISBN ${isbn}`;
document.title = titulo + ' — Librarvore';

// Gera o conteúdo
const conteudo = gerarConteudoLivro(titulo, isbn, autor, usuario);
document.getElementById('conteudo').textContent = conteudo;

let timerSalvarProgresso;
function agendarSalvarProgresso() {
    clearTimeout(timerSalvarProgresso);
    timerSalvarProgresso = setTimeout(() => {
        salvarProgresso(calcularProgressoLeitura());
    }, 600);
}

window.addEventListener('scroll', agendarSalvarProgresso, { passive: true });
window.addEventListener('beforeunload', () => salvarProgresso(calcularProgressoLeitura()));

async function restaurarProgresso() {
    if (!isbn || isbn === '—') return;
    try {
        const resposta = await fetch('/api/progresso');
        const registros = await resposta.json();
        if (!resposta.ok) throw new Error(registros.erro || 'Não foi possível carregar o progresso.');
        const registro = registros.find(item => item.isbn === isbn);
        if (registro) {
            const altura = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            window.scrollTo(0, altura * Math.max(0, Math.min(100, Number(registro.progresso) || 0)) / 100);
        }
    } catch (erro) {
        console.warn('Não foi possível restaurar o progresso:', erro);
    }
}

restaurarProgresso();

// Botão "Baixar .txt"
function baixarTxt() {
    const nome = titulo
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, '')
        .trim()
        .replace(/\s+/g, '_') + '.txt';

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Gera o texto do livro
function gerarConteudoLivro(titulo, isbn, autor, usuario) {
    const capitulos = [
        'O primeiro capítulo estabelece o mundo onde a narrativa acontece. Caminhos se cruzam, silêncios falam mais que palavras, e o leitor é convidado a mergulhar em uma história que promete transformar sua percepção sobre o tema.',
        'Entre memórias e reflexões, os personagens revelam suas motivações mais profundas. Cada cena nos aproxima de uma verdade que aos poucos se desenha — como um mapa que só faz sentido quando visto por inteiro.',
        'A tensão cresce. O que parecia simples ganha camadas de complexidade. E o autor, com maestria, nos conduz por caminhos inesperados, onde cada escolha tem seu preço e cada silêncio carrega uma consequência.',
        'No centro da narrativa, um momento de revelação. O leitor descobre que nada era o que parecia — e que o próprio ato de ler, aqui, é uma experiência de transformação. A obra atinge seu ponto mais alto com uma prosa precisa e emocionante.',
        'O desfecho chega como um sussurro após o grito. Não há respostas fáceis, mas há uma verdade: a literatura, quando bem-feita, nos deixa diferentes de quando começamos. E este livro, sem dúvida, é daqueles que marcam.'
    ];

    let txt  = '═══════════════════════════════════════════\n';
    txt     += '  ' + titulo.toUpperCase() + '\n';
    txt     += '  por ' + autor + '\n';
    txt     += '═══════════════════════════════════════════\n\n';
    txt     += 'ISBN:   ' + isbn + '\n';
    txt     += 'Leitor: ' + usuario + '\n';
    txt     += 'Data:   ' + new Date().toLocaleString('pt-BR') + '\n\n';
    txt     += '───────────────────────────────────────────\n\n';
    txt     += 'APRESENTAÇÃO\n\n';
    txt     += 'Esta é uma obra de destaque na Librarvore. O texto abaixo é\n';
    txt     += 'uma prévia gerada automaticamente para fins educacionais.\n';
    txt     += 'O conteúdo real da obra não está disponível.\n\n';

    capitulos.forEach((c, i) => {
        const num = String(i + 1).padStart(2, '0');
        txt += '───────────────────────────────────────────\n';
        txt += 'CAPÍTULO ' + num + '\n';
        txt += '───────────────────────────────────────────\n\n';
        txt += c + '\n\n';
    });

    txt += '───────────────────────────────────────────\n';
    txt += 'FIM DA PRÉVIA\n';
    txt += '───────────────────────────────────────────\n\n';
    txt += 'Gerado por Librarvore — ' + new Date().toLocaleDateString('pt-BR') + '\n';
    return txt;
}