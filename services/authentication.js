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

  await verifyToken(token, config.jwtSecret);

  const { id } = jwt.decode(token);
  const [user] = await DB
    .select('users.id', 'users.name', 'users.role')
    .from('users')
    .where({ id })
    .limit(1);

  request.currentUser = user;
  request.token = token;
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
