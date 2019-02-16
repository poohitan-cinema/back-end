const config = require('../config');

module.exports = url => (url ? url.replace(config.digitalOcean.space, `${config.baseURL}/static`) : url);
