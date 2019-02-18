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

    jwtSecret: 'jwtsecret',
    superSecret: 'supersecret',
  },
  production: {
    db: knexfile.production,
    baseURL: 'https://cinema.poohitan.com',

    corsWhiteList: [''],

    jwtSecret: process.env.POOHITAN_COM_JWT_SECRET,
    superSecret: process.env.POOHITAN_COM_SUPERSECRET,
  },
};

module.exports = {
  ...shared,
  ...config[environment],
};
