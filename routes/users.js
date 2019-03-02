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
  fastify.addHook('preHandler', Auth.checkAdminRights);

  fastify.get('/', options, async () => {
    const users = await DB('users');

    return users;
  });

  fastify.get('/:id', async (request, reply) => {
    const [user] = await DB('users').where({ id: request.params.id });

    if (!user) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return user;
  });

  fastify.post('/', options, async (request) => {
    await DB('users')
      .insert(request.body);

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    const [createdUser] = await DB('users').where({ id });

    return createdUser;
  });

  fastify.patch('/:id', options, async (request) => {
    const { id } = request.params;

    await DB('users')
      .update(request.body)
      .where({ id: request.params });

    const [updatedUser] = await DB('users').where({ id });

    return updatedUser;
  });

  fastify.delete('/:id', async (request) => {
    const { id } = request.params;
    const [deletedUser] = await DB('users').where({ id });

    await DB('users')
      .where({ id: request.params.id })
      .delete();

    return deletedUser;
  });
};

module.exports = router;
