// server.js
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const pool = require('./models/db');
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
  cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
}));

// registrar rotas da API
registrarRotasApi(app, PORTA);

// arquivos estáticos...
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.get('/', (_, res) => res.redirect('/01-login.html'));
app.get('/login', (_, res) => res.redirect('/01-login.html'));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cadastrousuario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      login VARCHAR(120) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS senha_recuperacao (
      usuario VARCHAR(120) NOT NULL PRIMARY KEY,
      token_hash CHAR(64) NOT NULL,
      expira_em DATETIME NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_expira_em (expira_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS titulos (
      isbn VARCHAR(20) PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      autor VARCHAR(150) NOT NULL,
      categoria VARCHAR(50) NOT NULL,
      numero_de_edicao VARCHAR(20),
      copyright VARCHAR(10),
      editora VARCHAR(100),
      paginas INT,
      sinopse TEXT,
      disponivel TINYINT(1) DEFAULT 1,
      destaque TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ Tabelas verificadas/criadas');
}

initDb()
  .then(() => app.listen(PORTA, '0.0.0.0', () => {
    console.log('✅ Servidor na porta ' + PORTA);
  }))
  .catch(e => console.error('❌ Erro fatal:', e.message));
