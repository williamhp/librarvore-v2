require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const registrarRotasPagina = require('./routes/pageRoutes');
const registrarRotasApi = require('./routes/apiRoutes');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().any());
app.use(session({
    secret: process.env.SESSION_SECRET || 'librarvore-segredo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

registrarRotasPagina(app);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/partials', express.static(path.join(__dirname, 'views', 'partials')));

const inicializarTabelas = registrarRotasApi(app, PORTA);
inicializarTabelas()
    .then(() => {
        app.listen(PORTA, '0.0.0.0', () => {
            console.log(`Servidor rodando em http://localhost:${PORTA}`);
            console.log(`Acesso pelo domínio: http://www.librarvore.com.br${PORTA === 80 ? '' : ':' + PORTA}`);
        });
    })
    .catch((erro) => {
        console.error('Não foi possível inicializar o banco de dados:', erro.message);
        process.exitCode = 1;
    });
