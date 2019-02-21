const knexfile = require('./knexfile');

const environment = process.env.NODE_ENV;

if (!environment) {
  throw new Error('Provide NODE_ENV');
}

const shared = {
  port: 7400,
  digitalOcean: {
    space: 'https://poohitan-cinema.ams3.cdn.digitaloceanspaces.com',
  },
};

const config = {
  development: {
    db: knexfile.development,
    corsWhiteList: ['http://localhost:7300'],

    jwtSecret: 'jwtsecret',
    superSecret: 'supersecret',
  },
  production: {
    db: knexfile.production,
    corsWhiteList: ['http://cinema.poohitan.com', 'https://cinema.poohitan.com'],

    jwtSecret: process.env.POOHITAN_COM_JWT_SECRET,
    superSecret: process.env.POOHITAN_COM_SUPERSECRET,

    server: {
      host: '46.101.99.203',
      username: 'poohitan',
      folder: '~/poohitan.com/cinema/back-end',
    },

    repository: 'git@github.com:poohitan-cinema/back-end.git',

    deploy: {
      appName: 'cinema-api',
    },
  },
};

module.exports = {
  ...shared,
  ...config[environment],
};
