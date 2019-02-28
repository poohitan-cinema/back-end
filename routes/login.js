const HTTPStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');

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
    const { name, password } = request.body;

    const [user] = await DB('users')
      .where({ name })
      .limit(1);

    if (user.password !== password) {
      reply.send(HTTPStatus.UNAUTHORIZED);

      return;
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret);
    const { id, role } = user;
    const safeUser = { id, name, role };

    reply
      .setCookie('token', token)
      .setCookie('user', JSON.stringify(safeUser))
      .send({
        user: safeUser,
        token,
      });
  });
};

module.exports = router;
