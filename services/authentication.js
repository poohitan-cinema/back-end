const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');

const config = require('../config');

function validateJWT(request, reply, next) {
  const { token } = request.cookies;

  if (!token) {
    reply.code(HttpStatus.UNAUTHORIZED);

    return next(new Error('Немає токену авторизації'));
  }

  try {
    jwt.verify(token, config.jwtSecret);

    return next();
  } catch (error) {
    reply.code(HttpStatus.UNAUTHORIZED);

    return next(new Error('Токен авторизації невалідний'));
  }
}

function validateSuperSecret(request, reply, next) {
  const { secret } = request.query;

  if (!secret) {
    reply.code(HttpStatus.UNAUTHORIZED);

    return next(new Error('Немає суперпаролю'));
  }

  if (secret === config.superSecret) {
    return next();
  }

  return next(new Error('Неправильний суперпароль'));
}

module.exports = { validateJWT, validateSuperSecret };
