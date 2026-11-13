require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const pool = require('./models/db'); // Corrigido para a pasta models
const registrarControladoresApi = require('./controllers/apiController'); // Importa o controller
const { redirecionarPara } = require('./controllers/pageController');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

// ---------- Middlewares ----------
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

// ---------- Arquivos Estáticos ----------
// A pasta de HTML é 'view' (singular), conforme seu repositório
app.use(express.static(path.join(__dirname, 'view'))); 
// Serve os arquivos de 'public' (imagens, css, js)
app.use(express.static(path.join(__dirname, 'public'))); 
// Mapeia '/assets' para 'public/assets' (para achar o preferencias.js)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'))); 

// ---------- Rotas da API ----------
// Chama a função do controller que registra TODAS as rotas (perfil, categorias, etc.)
const inicializarTabelas = registrarControladoresApi(app, PORTA);

// ---------- Rotas de Página (Redirecionamentos) ----------
app.get('/', redirecionarPara('/01-login.html'));
app.get('/login', redirecionarPara('/01-login.html'));
app.get('/acervo', redirecionarPara('/03-acervo.html'));

// ---------- Start ----------
app.listen(PORTA, '0.0.0.0', () => {
    console.log('✅ Servidor rodando na porta ' + PORTA);
    
    // Inicializa o banco em background
    if (typeof inicializarTabelas === 'function') {
        inicializarTabelas()
            .then(() => console.log('✅ Banco de dados inicializado com sucesso'))
            .catch(e => console.error('❌ Erro ao inicializar banco:', e.message));
    }
});
