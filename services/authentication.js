const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const util = require('util');

const config = require('../config');
const DB = require('./db');

const verifyToken = util.promisify(jwt.verify);

async function checkUserRights(request, reply, next) {
  const { token } = request.cookies;

  try {
    await verifyToken(token, config.jwtSecret);

    return next();
  } catch (error) {
    reply.code(HttpStatus.UNAUTHORIZED);

    console.log(error);

    return next(new Error('Операція доступна лише зареєстрованим користувачам'));
  }
}

async function checkAdminRights(request, reply, next) {
  const { token } = request.cookies;

  try {
    await verifyToken(token, config.jwtSecret);

    const { id } = jwt.decode(token);
    const [user] = await DB('users').where({ id });

    if (user.role === 'admin') {
      return next();
    }

    throw new Error();
  } catch (error) {
    reply.code(HttpStatus.UNAUTHORIZED);

    return next(new Error('Операція доступна лише адміністраторам'));
  }
}

module.exports = { checkUserRights, checkAdminRights };
