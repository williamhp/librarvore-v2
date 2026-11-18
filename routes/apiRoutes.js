const pool = require('../models/db');
const { promisify } = require('util');
const crypto = require('crypto');
const registrarControladoresApi = require('../controllers/apiController');

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const scrypt = promisify(crypto.scrypt);
async function hashSenha(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(senha, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

module.exports = function registrarRotasApi(app, porta) {

    // Verifica se o e-mail existe e deixa o front seguir para a página de nova senha
    app.post('/api/recuperar-senha', async (req, res) => {
        const email = String(req.body?.email || '').trim();
        if (!FORMATO_EMAIL.test(email)) {
            return res.status(400).json({ erro: 'Informe um endereço de e-mail válido.' });
        }
        try {
            const [usuarios] = await pool.query(
                'SELECT login FROM cadastrousuario WHERE login = ?',
                [email]
            );
            if (!usuarios.length) {
                return res.status(404).json({ erro: 'Nenhuma conta encontrada com este e-mail.' });
            }
            return res.json({ ok: true });
        } catch (erro) {
            return res.status(500).json({ erro: erro.message });
        }
    });

    // Redefine a senha diretamente pelo e-mail, sem token
    app.post('/api/redefinir-senha', async (req, res) => {
        const email     = String(req.body?.email     || '').trim();
        const novaSenha = String(req.body?.nova_senha || '');
        if (!FORMATO_EMAIL.test(email) || novaSenha.length < 8 || novaSenha.length > 128) {
            return res.status(400).json({ erro: 'Dados inválidos. A senha deve ter entre 8 e 128 caracteres.' });
        }
        try {
            const [usuarios] = await pool.query(
                'SELECT id FROM cadastrousuario WHERE login = ?',
                [email]
            );
            if (!usuarios.length) {
                return res.status(404).json({ erro: 'Conta não encontrada.' });
            }
            await pool.query(
                'UPDATE cadastrousuario SET senha = ? WHERE id = ?',
                [await hashSenha(novaSenha), usuarios[0].id]
            );
            return res.json({ ok: true });
        } catch (erro) {
            return res.status(500).json({ erro: erro.message });
        }
    });

    return registrarControladoresApi(app, porta);
};
