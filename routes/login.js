const HTTPStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const StringSimilarity = require('string-similarity');
const moment = require('moment');

const config = require('../config');
const DB = require('../services/db');

const options = {
  schema: {
    body: {
      properties: {
        password: { type: 'string' },
      },
    },
  },
};

const router = async (server) => {
  server.post('/', options, async (request, reply) => {
    const { body } = request;

    if (!(body.name && body.password)) {
      reply.code(HTTPStatus.BAD_REQUEST);

      throw new Error('Ім\'я і пароль не можуть бути порожні');
    }

    // Username can't contain whitespace,
    // if it does, it's better to reject the request straight away
    // to avoid possible SQL injections
    if (/\s/g.test(body.name)) {
      reply.code(HTTPStatus.UNPROCESSABLE_ENTITY);

      throw new Error('Ім\'я не може містити пропусків');
    }

    const [user] = await DB('User')
      .whereRaw(`lower(name) = '${body.name.toLowerCase()}'`)
      .limit(1);

    if (!user) {
      reply.code(HTTPStatus.UNAUTHORIZED);

      throw new Error('Неправильне ім\'я або пароль');
    }

    if (user.password !== body.password) {
      const passwordsSimilarity = StringSimilarity.compareTwoStrings(user.password, body.password);
      const errorMessage = passwordsSimilarity > 0.5
        ? 'Пароль схожий, але неправильний'
        : 'Неправильне ім\'я або пароль';

      reply.code(HTTPStatus.UNAUTHORIZED);

      throw new Error(errorMessage);
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret);
    const { id, name, role } = user;
    const safeUser = { id, name, role };

    const expires = moment().add(1, 'weeks').toDate();

    reply
      .setCookie('cinema-token', token, {
        domain: config.cookieDomain,
        expires,
      })
      .setCookie('cinema-user', JSON.stringify(safeUser), {
        domain: config.cookieDomain,
        expires,
      });

    return {
      user: safeUser,
      token,
    };
  });
};

module.exports = router;
