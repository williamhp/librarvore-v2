const crypto = require('crypto');
const pool = require('../models/db');
const nodemailer = require('nodemailer');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
let colunaUsuarioFavoritos;
let colunaUsuarioProgresso;

async function hashSenha(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(senha, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verificarSenha(senha, senhaArmazenada) {
    if (!senhaArmazenada.startsWith('scrypt$')) return senha === senhaArmazenada;
    const partes = senhaArmazenada.split('$');
    if (partes.length !== 3 || !/^[a-f0-9]{32}$/i.test(partes[1]) || !/^[a-f0-9]{128}$/i.test(partes[2])) return false;
    const hash = await scrypt(senha, partes[1], 64);
    return crypto.timingSafeEqual(hash, Buffer.from(partes[2], 'hex'));
}

function registrarControladoresApi(app, PORTA) {
    app.post('/api/login', async (req, res) => {
        const login = String(req.body?.login || '').trim();
        const senha = String(req.body?.senha || '');
        if (!login || !senha) return res.status(400).json({ erro: 'Preencha email e senha!' });
    
        try {
            const [linhas] = await pool.query('SELECT id, login, senha FROM cadastrousuario WHERE login = ?', [login]);
            if (!linhas.length || !(await verificarSenha(senha, linhas[0].senha))) {
                return res.status(401).json({ erro: 'Login ou senha inválidos!' });
            }
            if (!linhas[0].senha.startsWith('scrypt$')) {
                await pool.query('UPDATE cadastrousuario SET senha = ? WHERE id = ?', [await hashSenha(senha), linhas[0].id]);
            }
            req.session.usuario = linhas[0].login;
            req.session.usuarioId = linhas[0].id;
            res.json({ ok: true, usuario: linhas[0].login });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro no banco: ' + erro.message });
        }
    });
    
    app.post('/api/cadastro', async (req, res) => {
        const login = String(req.body?.login || '').trim();
        const senha = String(req.body?.senha || '');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) || senha.length < 8 || senha.length > 128) {
            return res.status(400).json({ erro: 'Informe um e-mail válido e uma senha de 8 a 128 caracteres.' });
        }
    
        try {
            const [resultado] = await pool.query('INSERT INTO cadastrousuario (login, senha) VALUES (?, ?)', [login, await hashSenha(senha)]);
            req.session.usuario = login;
            req.session.usuarioId = resultado.insertId;
            res.status(201).json({ ok: true, usuario: login });
        } catch (erro) {
            if (erro.code === 'ER_DUP_ENTRY') {
                res.status(409).json({ erro: 'Este email já está cadastrado!' });
            } else {
                res.status(500).json({ erro: 'Erro: ' + erro.message });
            }
        }
    });
    
    app.post('/api/logout', (req, res) => {
        req.session.destroy((erro) => {
            if (erro) return res.status(500).json({ erro: 'Não foi possível encerrar a sessão.' });
            res.clearCookie('connect.sid');
            res.json({ ok: true });
        });
    });
    
    async function inicializarTabelas() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cadastrousuario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(120) NOT NULL UNIQUE,
                senha VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    
        const [colunasUsuario] = await pool.query('SHOW COLUMNS FROM cadastrousuario');
        const colunaSenha = colunasUsuario.find((coluna) => coluna.Field === 'senha');
        const tipoSenha = colunaSenha?.Type.match(/^varchar\((\d+)\)$/i);
        if (!tipoSenha) throw new Error('A coluna cadastrousuario.senha precisa ser VARCHAR.');
        if (Number(tipoSenha[1]) < 255) {
            await pool.query('ALTER TABLE cadastrousuario MODIFY senha VARCHAR(255) NOT NULL');
        }
    
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                usuario_id INT NOT NULL,
                isbn VARCHAR(20) NOT NULL,
                PRIMARY KEY (usuario_id, isbn)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    
        await pool.query(`
            CREATE TABLE IF NOT EXISTS progresso_leitura (
                usuario_id INT NOT NULL,
                isbn VARCHAR(20) NOT NULL,
                titulo VARCHAR(255) DEFAULT NULL,
                autor VARCHAR(255) DEFAULT NULL,
                progresso INT DEFAULT 0,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (usuario_id, isbn)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    
        await pool.query(`
            CREATE TABLE IF NOT EXISTS preferencias_usuario (
                usuario VARCHAR(120) NOT NULL PRIMARY KEY,
                nome VARCHAR(120) DEFAULT NULL,
                tamanho_texto ENUM('pequeno', 'medio', 'grande') NOT NULL DEFAULT 'medio',
                tema ENUM('claro', 'escuro') NOT NULL DEFAULT 'claro',
                notif_prazo TINYINT(1) NOT NULL DEFAULT 1,
                notif_novidades TINYINT(1) NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    
        const [colunasLogin] = await pool.query('SHOW FULL COLUMNS FROM cadastrousuario');
        const [colunasPreferencias] = await pool.query('SHOW FULL COLUMNS FROM preferencias_usuario');
        const collationLogin = colunasLogin.find((coluna) => coluna.Field === 'login')?.Collation;
        const collationPreferencias = colunasPreferencias.find((coluna) => coluna.Field === 'usuario')?.Collation;
        if (!collationLogin || !/^[a-z0-9_]+$/i.test(collationLogin)) {
            throw new Error('Não foi possível determinar uma collation compatível para os dados de usuário.');
        }
        if (collationPreferencias !== collationLogin) {
            await pool.query(`
                ALTER TABLE preferencias_usuario
                MODIFY usuario VARCHAR(120) CHARACTER SET utf8mb4 COLLATE ${collationLogin} NOT NULL
            `);
        }
    
        await pool.query(`
            CREATE TABLE IF NOT EXISTS senha_recuperacao (
                usuario VARCHAR(120) NOT NULL PRIMARY KEY,
                token_hash CHAR(64) NOT NULL,
                expira_em DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    
        async function descobrirColunaUsuario(tabela) {
            const [colunas] = await pool.query(`SHOW COLUMNS FROM ${tabela}`);
            if (colunas.some((coluna) => coluna.Field === 'usuario_id')) return 'usuario_id';
            if (colunas.some((coluna) => coluna.Field === 'usuario')) return 'usuario';
            throw new Error(`A tabela ${tabela} não possui uma coluna de usuário compatível.`);
        }
    
        colunaUsuarioFavoritos = await descobrirColunaUsuario('favoritos');
        colunaUsuarioProgresso = await descobrirColunaUsuario('progresso_leitura');
    }
    
    async function obterIdentificadorUsuario(req, coluna) {
        if (coluna === 'usuario') return req.session.usuario;
        if (req.session.usuarioId) return req.session.usuarioId;
    
        const [usuarios] = await pool.query('SELECT id FROM cadastrousuario WHERE login = ?', [req.session.usuario]);
        if (!usuarios.length) throw new Error('A conta da sessão não foi encontrada.');
        req.session.usuarioId = usuarios[0].id;
        return usuarios[0].id;
    }
    
    app.get('/api/livros', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Faça login primeiro.' });
        try {
            const categoriaAlias = {
                direito: 'Direito',
                'direito': 'Direito',
                educacao: 'Educação',
                'educação': 'Educação',
                saude: 'Medicina',
                saúde: 'Medicina',
                administracao: 'Administração',
                'administração': 'Administração',
                tecnologia: 'Informática',
                literatura: 'Romance',
                ciencias: 'Física',
                'ciências': 'Física',
                historia: 'História',
                'história': 'História',
                romance: 'Romance',
                drama: 'Drama',
                fantasia: 'Fantasia',
                distopia: 'Distopia',
                suspense: 'Suspense',
                terror: 'Terror',
                policial: 'Policial',
                biografia: 'Biografia',
                filosofia: 'Filosofia',
                matematica: 'Matemática',
                fisica: 'Física',
                medicina: 'Medicina',
                informatica: 'Informática',
                historia: 'História'
            };
    
            const categoria = req.query.categoria;
            const busca = (req.query.q || '').trim();
            const filtros = [];
            const params = [];
    
            if (categoria) {
                const categoriaMapeada = categoriaAlias[String(categoria).trim().toLowerCase()] || String(categoria).trim();
                filtros.push('LOWER(categoria) = LOWER(?)');
                params.push(categoriaMapeada);
            }
    
            if (busca) {
                const termo = `%${busca}%`;
                filtros.push('(LOWER(titulo) LIKE LOWER(?) OR LOWER(autor) LIKE LOWER(?))');
                params.push(termo, termo);
            }
    
            let sql = 'SELECT * FROM titulos';
            if (filtros.length > 0) {
                sql += ' WHERE ' + filtros.join(' AND ');
            }
    
            const [livros] = await pool.query(sql, params);
            const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const extrairPartes = (valor) => (normalizar(valor).match(/\d+|[^\d]+/g) || [normalizar(valor)]);
    
            const compararNaturais = (a, b, termo = '') => {
                const termoNormalizado = normalizar(termo).trim();
    
                const scoreLivro = (livro) => {
                    if (!termoNormalizado) return 99;
                    const titulo = normalizar(livro.titulo || '');
                    const autor = normalizar(livro.autor || '');
    
                    if (autor.startsWith(termoNormalizado)) return 0;
                    if (titulo.startsWith(termoNormalizado)) return 1;
                    if (autor.includes(termoNormalizado)) return 2;
                    if (titulo.includes(termoNormalizado)) return 3;
                    return 4;
                };
    
                const scoreA = scoreLivro(a);
                const scoreB = scoreLivro(b);
    
                if (scoreA !== scoreB) return scoreA - scoreB;
    
                const destaqueA = Number(a.destaque) === 1 ? 1 : 0;
                const destaqueB = Number(b.destaque) === 1 ? 1 : 0;
    
                if (destaqueA !== destaqueB) {
                    return destaqueB - destaqueA;
                }
    
                const partesA = extrairPartes(a.titulo || '');
                const partesB = extrairPartes(b.titulo || '');
                const limite = Math.max(partesA.length, partesB.length);
    
                for (let i = 0; i < limite; i++) {
                    const parteA = partesA[i] || '';
                    const parteB = partesB[i] || '';
                    const numeroA = /^\d+$/.test(parteA);
                    const numeroB = /^\d+$/.test(parteB);
    
                    if (numeroA && numeroB) {
                        const diferenca = Number(parteA) - Number(parteB);
                        if (diferenca !== 0) return diferenca;
                        continue;
                    }
    
                    if (numeroA !== numeroB) {
                        return numeroA ? -1 : 1;
                    }
    
                    const resultado = parteA.localeCompare(parteB, 'pt-BR', { sensitivity: 'base' });
                    if (resultado !== 0) return resultado;
                }
    
                return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { sensitivity: 'base' });
            };
    
            const resultadosOrdenados = [...livros].sort((a, b) => compararNaturais(a, b, busca));
            res.json({ usuario: req.session.usuario, livros: resultadosOrdenados });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    // NOVAS ROTAS PARA O CATÁLOGO FUNCIONAR
    app.get('/api/estatisticas', async (req, res) => {
        try {
            const [total] = await pool.query('SELECT COUNT(*) as t FROM titulos');
            const [disp] = await pool.query('SELECT COUNT(*) as d FROM titulos WHERE disponivel = 1');
            const [cats] = await pool.query('SELECT COUNT(DISTINCT categoria) as c FROM titulos');
            res.json({ 
                total: total[0].t, 
                disponiveis: disp[0].d, 
                categorias: cats[0].c 
            });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.get('/api/categorias', async (req, res) => {
        try {
            const [categorias] = await pool.query('SELECT categoria, COUNT(*) AS total FROM titulos GROUP BY categoria ORDER BY categoria');
            res.json({ categorias });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    // ==========================================
    // ROTAS ADICIONAIS PARA AS PÁGINAS 02 A 08
    // ==========================================
    
    // Obter detalhes de um livro específico por ISBN
    app.get('/api/livros/:isbn', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const [livro] = await pool.query('SELECT * FROM titulos WHERE isbn = ?', [req.params.isbn]);
            if (livro.length === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
            res.json(livro[0]);
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    // Obter Minha Lista / Favoritos do utilizador
    app.get('/api/favoritos', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const usuario = await obterIdentificadorUsuario(req, colunaUsuarioFavoritos);
            const [favs] = await pool.query(`
                SELECT t.* FROM titulos t 
                JOIN favoritos f ON t.isbn = f.isbn 
                WHERE f.${colunaUsuarioFavoritos} = ?
            `, [usuario]);
            res.json(favs);
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    // Adicionar aos Favoritos
    app.post('/api/favoritos', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        const { isbn } = req.body;
        if (!isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });
        try {
            const usuario = await obterIdentificadorUsuario(req, colunaUsuarioFavoritos);
            await pool.query(`INSERT IGNORE INTO favoritos (${colunaUsuarioFavoritos}, isbn) VALUES (?, ?)`, [usuario, isbn]);
            res.json({ ok: true, mensagem: 'Adicionado à sua lista com sucesso!' });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.delete('/api/favoritos/:isbn', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const usuario = await obterIdentificadorUsuario(req, colunaUsuarioFavoritos);
            await pool.query(`DELETE FROM favoritos WHERE ${colunaUsuarioFavoritos} = ? AND isbn = ?`, [usuario, req.params.isbn]);
            res.json({ ok: true, mensagem: 'Removido da sua lista com sucesso!' });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    // Obter progresso de leitura ("Continuar Lendo")
    app.get('/api/progresso', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const usuario = await obterIdentificadorUsuario(req, colunaUsuarioProgresso);
            const [prog] = await pool.query(`
                SELECT p.*, t.titulo, t.autor, t.categoria FROM progresso_leitura p
                LEFT JOIN titulos t ON p.isbn = t.isbn
                WHERE p.${colunaUsuarioProgresso} = ?
                ORDER BY p.atualizado_em DESC, p.titulo ASC
            `, [usuario]);
            res.json(prog);
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.post('/api/progresso', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    
        const { isbn, titulo, autor, progresso } = req.body || {};
        if (!isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });
    
        const percentual = Math.max(0, Math.min(100, Number(progresso) || 0));
    
        try {
            const usuario = await obterIdentificadorUsuario(req, colunaUsuarioProgresso);
            await pool.query(`
                INSERT INTO progresso_leitura (${colunaUsuarioProgresso}, isbn, titulo, autor, progresso, atualizado_em)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    autor = VALUES(autor),
                    progresso = VALUES(progresso),
                    atualizado_em = CURRENT_TIMESTAMP
            `, [usuario, isbn, titulo || null, autor || null, percentual]);
    
            res.json({ ok: true, usuario: req.session.usuario, isbn, progresso: percentual });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    // Obter dados do Perfil
    app.get('/api/perfil', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const [user] = await pool.query(`
                SELECT u.id, u.login, COALESCE(p.nome, '') AS nome
                FROM cadastrousuario u
                LEFT JOIN preferencias_usuario p ON p.usuario = u.login
                WHERE u.login = ?
            `, [req.session.usuario]);
            if (!user.length) {
                req.session.destroy(() => {});
                return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' });
            }
            res.json(user[0]);
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.post('/api/recuperar-senha', async (req, res) => {
        const email = String(req.body?.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ erro: 'Informe um endereço de e-mail válido.' });
        }
    
        const portaSmtp = Number(process.env.SMTP_PORT);
        const smtpConfigurado = process.env.SMTP_HOST && Number.isInteger(portaSmtp) &&
            portaSmtp > 0 && portaSmtp <= 65535 &&
            process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM;
        if (!smtpConfigurado) {
            return res.status(503).json({ erro: 'Recuperação por e-mail indisponível. Configure as variáveis SMTP no servidor.' });
        }
    
        try {
            const [usuarios] = await pool.query('SELECT login FROM cadastrousuario WHERE login = ?', [email]);
            if (usuarios.length) {
                const token = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                await pool.query(`
                    INSERT INTO senha_recuperacao (usuario, token_hash, expira_em)
                    VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE))
                    ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expira_em = VALUES(expira_em)
                `, [usuarios[0].login, tokenHash]);
    
                const transportador = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: portaSmtp,
                    secure: process.env.SMTP_SECURE === 'true' || portaSmtp === 465,
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                });
                const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${PORTA}`).replace(/\/+$/, '');
                const link = `${baseUrl}/03-nova-senha.html?token=${token}`;
                try {
                    await transportador.sendMail({
                        from: process.env.SMTP_FROM,
                        to: usuarios[0].login,
                        subject: 'Redefinição de senha - Librárvore',
                        text: `Use este link nos próximos 30 minutos para redefinir sua senha: ${link}`,
                        html: `<p>Use este link nos próximos 30 minutos para redefinir sua senha:</p><p><a href="${link}">Redefinir senha</a></p>`
                    });
                } catch (erroEmail) {
                    await pool.query('DELETE FROM senha_recuperacao WHERE usuario = ?', [usuarios[0].login]);
                    console.error('Falha ao enviar e-mail de recuperação:', erroEmail.message);
                    return res.status(503).json({ erro: 'Não foi possível enviar o e-mail. Verifique a configuração SMTP.' });
                }
            }
    
            res.json({ ok: true, mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.post('/api/redefinir-senha', async (req, res) => {
        const token = String(req.body?.token || '');
        const novaSenha = String(req.body?.nova_senha || '');
        if (!/^[a-f0-9]{64}$/i.test(token) || novaSenha.length < 8 || novaSenha.length > 128) {
            return res.status(400).json({ erro: 'Link inválido ou senha fora do limite de 8 a 128 caracteres.' });
        }
    
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        let conexao;
        try {
            conexao = await pool.getConnection();
            await conexao.beginTransaction();
            const [tokens] = await conexao.query(`
                SELECT usuario FROM senha_recuperacao
                WHERE token_hash = ? AND expira_em > CURRENT_TIMESTAMP
                FOR UPDATE
            `, [tokenHash]);
            if (!tokens.length) {
                await conexao.rollback();
                return res.status(400).json({ erro: 'O link expirou ou já foi utilizado. Solicite outro.' });
            }
    
            await conexao.query('UPDATE cadastrousuario SET senha = ? WHERE login = ?', [await hashSenha(novaSenha), tokens[0].usuario]);
            await conexao.query('DELETE FROM senha_recuperacao WHERE usuario = ?', [tokens[0].usuario]);
            await conexao.commit();
            res.json({ ok: true });
        } catch (erro) {
            if (conexao) await conexao.rollback();
            res.status(500).json({ erro: erro.message });
        } finally {
            if (conexao) conexao.release();
        }
    });
    
    app.put('/api/perfil', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        const nome = String(req.body?.nome || '').trim();
        if (!nome || nome.length > 120) {
            return res.status(400).json({ erro: 'Informe um nome com até 120 caracteres.' });
        }
    
        try {
            await pool.query(
                'INSERT INTO preferencias_usuario (usuario, nome) VALUES (?, ?) ON DUPLICATE KEY UPDATE nome = VALUES(nome)',
                [req.session.usuario, nome]
            );
            res.json({ ok: true, nome });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.get('/api/preferencias', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        try {
            const [rows] = await pool.query(
                'SELECT tamanho_texto AS tamanho, tema, notif_prazo, notif_novidades FROM preferencias_usuario WHERE usuario = ?',
                [req.session.usuario]
            );
            res.json(rows[0] || { tamanho: 'medio', tema: 'claro', notif_prazo: 1, notif_novidades: 0 });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.put('/api/preferencias', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        const body = req.body || {};
        const { tamanho, tema } = body;
        if (!['pequeno', 'medio', 'grande'].includes(tamanho) || !['claro', 'escuro'].includes(tema)) {
            return res.status(400).json({ erro: 'Preferências de leitura inválidas.' });
        }
    
        try {
            const [existentes] = await pool.query(
                'SELECT notif_prazo, notif_novidades FROM preferencias_usuario WHERE usuario = ?',
                [req.session.usuario]
            );
            const notifPrazo = Object.prototype.hasOwnProperty.call(body, 'notif_prazo')
                ? Number(body.notif_prazo === true || body.notif_prazo === 1)
                : Number(existentes[0]?.notif_prazo ?? 1);
            const notifNovidades = Object.prototype.hasOwnProperty.call(body, 'notif_novidades')
                ? Number(body.notif_novidades === true || body.notif_novidades === 1)
                : Number(existentes[0]?.notif_novidades ?? 0);
            await pool.query(`
                INSERT INTO preferencias_usuario (usuario, tamanho_texto, tema, notif_prazo, notif_novidades)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    tamanho_texto = VALUES(tamanho_texto),
                    tema = VALUES(tema),
                    notif_prazo = VALUES(notif_prazo),
                    notif_novidades = VALUES(notif_novidades)
            `, [req.session.usuario, tamanho, tema, Number(notifPrazo), Number(notifNovidades)]);
            res.json({ ok: true, tamanho, tema, notif_prazo: Number(notifPrazo), notif_novidades: Number(notifNovidades) });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    
    app.post('/api/senha', async (req, res) => {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
        const senhaAtual = String(req.body?.senha_atual || '');
        const novaSenha = String(req.body?.nova_senha || '');
        if (!senhaAtual || novaSenha.length < 8 || novaSenha.length > 128) {
            return res.status(400).json({ erro: 'Informe a senha atual e uma nova senha de 8 a 128 caracteres.' });
        }
    
        try {
            const [usuarios] = await pool.query('SELECT id, senha FROM cadastrousuario WHERE login = ?', [req.session.usuario]);
            if (!usuarios.length || !(await verificarSenha(senhaAtual, usuarios[0].senha))) {
                return res.status(400).json({ erro: 'Senha atual incorreta.' });
            }
            await pool.query('UPDATE cadastrousuario SET senha = ? WHERE id = ?', [await hashSenha(novaSenha), usuarios[0].id]);
            res.json({ ok: true });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    });
    return inicializarTabelas;
}

module.exports = registrarControladoresApi;

