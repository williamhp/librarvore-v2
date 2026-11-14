require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const registrarRotasPagina = require('./routes/pageRoutes');
const registrarRotasApi = require('./routes/apiRoutes');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

// Middlewares
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().any());
app.use(session({
    secret: process.env.SESSION_SECRET || 'librarvore-segredo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
}));

// ---------- Rotas ----------
registrarRotasPagina(app);
const inicializarTabelas = registrarRotasApi(app, PORTA);

// ---------- Arquivos Estáticos ----------
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const arquivosCompartilhados = {
    '/login.css': path.join(__dirname, 'public/assets/css/login.css'),
    '/librarvore.css': path.join(__dirname, 'librarvore.css'),
    '/telas.css': path.join(__dirname, 'telas.css'),
    '/estilo.css': path.join(__dirname, 'estilo.css'),
    '/assets/css/tema.css': path.join(__dirname, 'tema.css'),
    '/assets/img/logo-librarvore-branca.png': path.join(__dirname, 'logo-librarvore-branca.png'),
    '/assets/img/logo-librarvore-colorida.png': path.join(__dirname, 'logo-librarvore-colorida.png'),
    '/assets/img/logo-librarvore.png': path.join(__dirname, 'logo-librarvore.png'),
    '/leitor.js': path.join(__dirname, 'leitor.js')
};

for (const [rota, arquivo] of Object.entries(arquivosCompartilhados)) {
    app.get(rota, (_, res) => res.sendFile(arquivo));
}

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

async function iniciarServidor() {
    await inicializarTabelas();

    app.listen(PORTA, '0.0.0.0', () => {
        console.log(`Librárvore disponível em http://localhost:${PORTA}`);
    });
}

iniciarServidor().catch((erro) => {
    console.error('Falha ao inicializar o servidor e o banco de dados:', erro);
    process.exitCode = 1;
});
