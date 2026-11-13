const { redirecionarPara } = require('../controllers/pageController');

function registrarRotasPagina(app) {
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

