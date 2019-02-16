const knexfile = require('./knexfile');

const environment = process.env.NODE_ENV;

if (!environment) {
  throw new Error('Provide NODE_ENV');
}

const shared = {
  port: 7400,
  digitalOcean: {
    space: 'https://poohitan-com.ams3.cdn.digitaloceanspaces.com/cinema',
  },
};

const config = {
  development: {
    db: knexfile.development,
    baseURL: `http://localhost:${shared.port}`,
    corsWhiteList: ['http://localhost:7300'],
  },
  production: {
    db: knexfile.production,
    baseURL: 'https://cinema.poohitan.com',
    corsWhiteList: [''],
  },
};

module.exports = {
  ...shared,
  ...config[environment],
};
