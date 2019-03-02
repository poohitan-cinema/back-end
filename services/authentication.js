const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const util = require('util');

const config = require('../config');
const DB = require('./db');

const verifyToken = util.promisify(jwt.verify);

async function checkUserRights(request, reply) {
  const token = request.cookies.token || request.query.token;

  try {
    await verifyToken(token, config.jwtSecret);
  } catch (error) {
    reply.code(HttpStatus.UNAUTHORIZED);

    console.log(error);

    throw new Error('Операція доступна лише зареєстрованим користувачам');
  }
}

async function checkAdminRights(request, reply) {
  const token = request.cookies.token || request.query.token;

  try {
    await verifyToken(token, config.jwtSecret);

    const { id } = jwt.decode(token);
    const [user] = await DB('users').where({ id });

    if (user.role !== 'admin') {
      throw new Error();
    }
  } catch (error) {
    reply.code(HttpStatus.UNAUTHORIZED);

    console.log(error);

    throw new Error('Операція доступна лише адміністраторам');
  }
}

module.exports = { checkUserRights, checkAdminRights };
