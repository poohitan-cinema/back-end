const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const util = require('util');

const config = require('../config');
const DB = require('./db');

const verifyToken = util.promisify(jwt.verify);

async function injectCurrentUser(request) {
  const token = request.cookies.token || request.query.token;

  if (!token) {
    return;
  }

  try {
    await verifyToken(token, config.jwtSecret);

    const { id } = jwt.decode(token);
    const [user] = await DB('User')
      .select('id', 'name', 'role')
      .where({ id })
      .limit(1);

    if (!user) {
      throw new Error(`Користувача з ID ${id} не знайдено`);
    }

    request.currentUser = user;
    request.token = token;
  } catch (error) {
    throw new Error('Невалідний токен авторизації');
  }
}

async function checkUserRights(request, reply) {
  const isAuthenticated = request.currentUser && request.currentUser.id;

  if (isAuthenticated) {
    return true;
  }

  reply.code(HttpStatus.UNAUTHORIZED);

  throw new Error('Операція доступна лише зареєстрованим користувачам');
}

async function checkAdminRights(request, reply) {
  const isAdmin = request.currentUser && request.currentUser.role === 'admin';

  if (isAdmin) {
    return true;
  }

  reply.code(HttpStatus.UNAUTHORIZED);

  throw new Error('Операція доступна лише адміністраторам');
}

module.exports = { injectCurrentUser, checkUserRights, checkAdminRights };
