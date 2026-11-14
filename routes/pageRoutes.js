const { redirecionarPara } = require('../controllers/pageController');
const path = require('path');

function registrarRotasPagina(app) {
    app.get('/telas', (_, res) => {
        res.sendFile(path.join(__dirname, '../view/index.html'));
    });

    const diretorioPaginas = path.join(__dirname, '../view/pages');
    const paginas = {
        '01-login.html': 'auth/01-login.html',
        '02-esqueci-senha.html': 'auth/02-esqueci-senha.html',
        '03-nova-senha.html': 'auth/03-nova-senha.html',
        '02-inicio.html': 'catalog/02-inicio.html',
        '03-acervo.html': 'catalog/03-acervo.html',
        '04-inicio.html': 'catalog/04-inicio.html',
        '05-acervo.html': 'catalog/05-acervo.html',
        '06-detalhes-livro.html': 'catalog/06-detalhes-livro.html',
        '08-detalhes-livro.html': 'catalog/08-detalhes-livro.html',
        '04-minha-lista.html': 'collection/04-minha-lista.html',
        '05-continuar-lendo.html': 'collection/05-continuar-lendo.html',
        '06-minha-lista.html': 'collection/06-minha-lista.html',
        '07-continuar-lendo.html': 'collection/07-continuar-lendo.html',
        '07-meu-perfil.html': 'account/07-meu-perfil.html',
        '08-configuracoes.html': 'account/08-configuracoes.html',
        '10-meu-perfil.html': 'account/10-meu-perfil.html',
        '11-configuracoes.html': 'account/11-configuracoes.html',
        '12-preferencias-leitura.html': 'account/12-preferencias-leitura.html',
        '09-leitor.html': 'reader/09-leitor.html',
        '09-leitura.html': 'reader/09-leitura.html'
    };

    for (const [arquivo, pagina] of Object.entries(paginas)) {
        app.get(`/${arquivo}`, (_, res) => {
            res.sendFile(path.join(diretorioPaginas, pagina));
        });
    }

    const redirecionamentos = {
        '/': '/01-login.html',
        '/index': '/01-login.html',
        '/index.html': '/01-login.html',
        '/login': '/01-login.html',
        '/login.html': '/01-login.html',
        '/inicio': '/02-inicio.html',
        '/acervo': '/03-acervo.html',
        '/minha-lista': '/04-minha-lista.html',
        '/04-minhalista': '/04-minha-lista.html',
        '/04-minhalista.html': '/04-minha-lista.html',
        '/continuar-lendo': '/05-continuar-lendo.html',
        '/detalhes-livro': '/06-detalhes-livro.html',
        '/meu-perfil': '/07-meu-perfil.html',
        '/configuracoes': '/08-configuracoes.html',
        '/leitor': '/09-leitor.html'
    };

    for (const [rota, destino] of Object.entries(redirecionamentos)) {
        app.get(rota, redirecionarPara(destino));
    }
}

module.exports = registrarRotasPagina;

