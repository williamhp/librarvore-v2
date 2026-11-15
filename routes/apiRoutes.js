const crypto = require('crypto');
const pool = require('../models/db');
const registrarControladoresApi = require('../controllers/apiController');

const MENSAGEM_RECUPERACAO = 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.';
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function enviarRecuperacaoViaResend(req, res) {
    const email = String(req.body?.email || '').trim();
    if (!FORMATO_EMAIL.test(email)) {
        return res.status(400).json({ erro: 'Informe um endereço de e-mail válido.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ erro: 'Recuperação por e-mail indisponível: configure RESEND_API_KEY no Render.' });
    }

    const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
    const remetente = process.env.RESEND_FROM || 'Librárvore <onboarding@resend.dev>';

    try {
        const [usuarios] = await pool.query(
            'SELECT login FROM cadastrousuario WHERE login = ?',
            [email]
        );

        // Não revelar se o endereço está cadastrado.
        if (!usuarios.length) return res.json({ ok: true, mensagem: MENSAGEM_RECUPERACAO });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await pool.query(`
            INSERT INTO senha_recuperacao (usuario, token_hash, expira_em)
            VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE))
            ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expira_em = VALUES(expira_em)
        `, [usuarios[0].login, tokenHash]);

        const link = `${baseUrl}/03-nova-senha.html?token=${encodeURIComponent(token)}`;
        const resposta = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: remetente,
                to: [usuarios[0].login],
                subject: 'Redefinição de senha - Librárvore',
                text: `Use este link nos próximos 30 minutos para redefinir sua senha: ${link}`,
                html: `<p>Você solicitou a redefinição da senha da sua conta Librárvore.</p><p><a href="${link}">Redefinir minha senha</a></p><p>O link expira em 30 minutos. Se você não fez esta solicitação, ignore este e-mail.</p>`
            })
        });

        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
            // Invalida o token que não pôde ser enviado, sem apagar uma solicitação mais recente.
            await pool.query(
                'DELETE FROM senha_recuperacao WHERE usuario = ? AND token_hash = ?',
                [usuarios[0].login, tokenHash]
            );
            console.error('Resend recusou o e-mail de recuperação:', resultado.message || resultado.name || resposta.status);
            return res.status(503).json({ erro: 'Não foi possível enviar o e-mail. Verifique a configuração do Resend.' });
        }

        return res.json({ ok: true, mensagem: MENSAGEM_RECUPERACAO });
    } catch (erro) {
        console.error('Falha ao processar recuperação via Resend:', erro.message);
        return res.status(503).json({ erro: 'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.' });
    }
}

module.exports = function registrarRotasApi(app, porta) {
    // Registre esta rota antes do controller legado, que ainda contém a implementação SMTP.
    app.post('/api/recuperar-senha', enviarRecuperacaoViaResend);
    return registrarControladoresApi(app, porta);
};
