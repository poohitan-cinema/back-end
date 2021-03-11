const config = require('../config');

module.exports = url => (url ? url.replace(config.digitalOcean.spaces.name, '') : url);
