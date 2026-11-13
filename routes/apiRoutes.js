const registrarControladoresApi = require('../controllers/apiController');

module.exports = function registrarRotasApi(app, porta) {
    return registrarControladoresApi(app, porta);
};

