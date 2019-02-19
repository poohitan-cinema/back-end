const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const Auth = require('../services/authentication');

const options = {
  schema: {
    body: {
      properties: {
        name: { type: 'string' },
        password: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.addHook('preHandler', Auth.validateSuperSecret);

  fastify.get('/', options, async (request, reply) => {
    const users = await DB('users');

    reply.send(users);
  });

  fastify.get('/:id', async (request, reply) => {
    const [user] = await DB('users').where({ id: request.params.id });

    reply.send(user);
  });

  fastify.post('/', options, async (request, reply) => {
    await DB('users')
      .insert(request.body);

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', options, async (request, reply) => {
    await DB('users')
      .update(request.body)
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', async (request, reply) => {
    await DB('users')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
