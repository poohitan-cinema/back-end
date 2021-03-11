require('dotenv').config();

const knexfile = require('./knexfile');

const environment = process.env.NODE_ENV;

if (!environment) {
  throw new Error('Provide NODE_ENV');
}

const shared = {
  port: 7400,

  digitalOcean: {
    spaces: {
      name: 'poohitan-cinema',
      endpoint: 'ams3.digitaloceanspaces.com',
    },
  },
};

const config = {
  development: {
    cookieDomain: 'localhost',

    db: knexfile.development,
    corsWhiteList: ['http://localhost:7300'],

    jwtSecret: 'jwtsecret',
  },
  production: {
    cookieDomain: '.cinema.poohitan.com',

    db: knexfile.production,
    corsWhiteList: ['http://cinema.poohitan.com', 'https://cinema.poohitan.com'],

    jwtSecret: process.env.JWT_SECRET,

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
  environment,
  ...shared,
  ...config[environment],
};
