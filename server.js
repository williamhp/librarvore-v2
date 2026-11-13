require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const pool = require('./db');

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

// ---------- Arquivos Estáticos ----------
// Serve a pasta 'public' (HTMLs, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Redirecionamentos amigáveis
app.get('/', (_, res) => res.redirect('/01-login.html'));
app.get('/login', (_, res) => res.redirect('/01-login.html'));
app.get('/acervo', (_, res) => res.redirect('/03-acervo.html')); // ou 05-acervo.html, dependendo do seu fluxo

// ---------- Rotas da API ----------
// (Aqui você mantém as rotas que já funcionam no seu server.js: /api/login, /api/livros, etc.)
// ...
