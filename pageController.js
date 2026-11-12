function redirecionarPara(caminho) {
    return (req, res) => res.redirect(caminho);
}

module.exports = { redirecionarPara };
