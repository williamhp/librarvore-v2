require('dotenv').config();          // <-- PRIMEIRA LINHA
const express = require('express');
// ...
const pool = require('./db');        // <-- SÓ DEPOIS de dotenv
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { promisify } = require('util');
const pool = require('./db');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const scrypt = promisify(crypto.scrypt);

// ---------- Funções de Senha ----------
async function hashSenha(s) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = await scrypt(s, salt, 64);
    return `scrypt$${salt}$${h.toString('hex')}`;
}
async function verificarSenha(s, arm) {
    if (!arm || !arm.startsWith('scrypt$')) return s === arm;
    const p = arm.split('$');
    if (p.length !== 3) return false;
    const h = await scrypt(s, p[1], 64);
    return crypto.timingSafeEqual(h, Buffer.from(p[2], 'hex'));
}

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

// ---------- Inicialização do Banco ----------
async function initDb() {
    await pool.query(`CREATE TABLE IF NOT EXISTS cadastrousuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(120) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS titulos (
        isbn VARCHAR(20) PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL, autor VARCHAR(150) NOT NULL,
        categoria VARCHAR(50) NOT NULL, numero_de_edicao VARCHAR(20),
        copyright VARCHAR(10), editora VARCHAR(100), paginas INT,
        sinopse TEXT, disponivel TINYINT(1) DEFAULT 1, destaque TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('✅ Tabelas verificadas/criadas');
}

// ---------- Rotas da API ----------
app.post('/api/login', async (req, res) => {
    const l = String(req.body?.login || '').trim();
    const s = String(req.body?.senha || '');
    if (!l || !s) return res.status(400).json({ erro: 'Preencha tudo.' });
    try {
        const [r] = await pool.query('SELECT id, login, senha FROM cadastrousuario WHERE login = ?', [l]);
        if (!r.length || !(await verificarSenha(s, r[0].senha))) return res.status(401).json({ erro: 'Login ou senha inválidos.' });
        if (!r[0].senha.startsWith('scrypt$'))
            await pool.query('UPDATE cadastrousuario SET senha = ? WHERE id = ?', [await hashSenha(s), r[0].id]);
        req.session.usuario = r[0].login;
        req.session.usuarioId = r[0].id;
        res.json({ ok: true, usuario: r[0].login });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/cadastro', async (req, res) => {
    const l = String(req.body?.login || '').trim();
    const s = String(req.body?.senha || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l) || s.length < 8 || s.length > 128)
        return res.status(400).json({ erro: 'E-mail inválido ou senha fora de 8–128 caracteres.' });
    try {
        const [r] = await pool.query('INSERT INTO cadastrousuario (login, senha) VALUES (?, ?)', [l, await hashSenha(s)]);
        req.session.usuario = l;
        req.session.usuarioId = r.insertId;
        res.status(201).json({ ok: true, usuario: l });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'E-mail já cadastrado.' });
        res.status(500).json({ erro: e.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
});

app.get('/api/livros', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Faça login primeiro.' });
    try {
        const busca = (req.query.q || '').trim();
        let sql = 'SELECT * FROM titulos', params = [];
        if (busca) { sql += ' WHERE LOWER(titulo) LIKE LOWER(?) OR LOWER(autor) LIKE LOWER(?)'; params.push(`%${busca}%`, `%${busca}%`); }
        sql += ' ORDER BY titulo ASC LIMIT 500';
        const [livros] = await pool.query(sql, params);
        res.json({ usuario: req.session.usuario, livros });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/estatisticas', async (_, res) => {
    try {
        const [t] = await pool.query('SELECT COUNT(*) AS n FROM titulos');
        const [d] = await pool.query('SELECT COUNT(*) AS n FROM titulos WHERE disponivel=1');
        const [c] = await pool.query('SELECT COUNT(DISTINCT categoria) AS n FROM titulos');
        res.json({ total: t[0].n, disponiveis: d[0].n, categorias: c[0].n });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Rota de diagnóstico
app.get('/debug', async (_, res) => {
    const out = { env: { DB_HOST: process.env.DB_HOST, DB_NAME: process.env.DB_NAME, DB_PASS_set: !!process.env.DB_PASS }, db: 'unknown' };
    try {
        const [r] = await pool.query('SELECT COUNT(*) AS n FROM titulos');
        out.db = 'ok: ' + r[0].n + ' titulos';
    } catch (e) { out.db = 'ERRO: ' + e.message; }
    res.json(out);
});

// ---------- Arquivos Estáticos e Páginas ----------
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.get('/', (_, res) => res.redirect('/01-login.html'));
app.get('/login', (_, res) => res.redirect('/01-login.html'));
app.get('/acervo', (_, res) => res.redirect('/03-acervo.html'));

// ---------- Start ----------
initDb()
    .then(() => app.listen(PORTA, '0.0.0.0', () => {
        console.log('✅ Servidor na porta ' + PORTA);
    }))
    .catch(e => console.error('❌ Erro fatal:', e.message));
