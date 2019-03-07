const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

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

const DEFAULT_ROLE = 'user';

const router = async (fastify) => {
  fastify.addHook('preHandler', Auth.checkAdminRights);

  fastify.get('/', options, async () => {
    const users = await DB('User');

    return users;
  });

  fastify.get('/:id', async (request, reply) => {
    const [user] = await DB('User').where({ id: request.params.id });

    if (!user) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return user;
  });

  fastify.post('/', options, async (request, reply) => {
    const { name, password, role = DEFAULT_ROLE } = request.body;

    if (!(name && password && role)) {
      reply.code(HTTPStatus.UNPROCESSABLE_ENTITY);

      throw new Error('Запит повинен містити ім\'я користувача і його пароль');
    }

    const id = uuid.v4();

    await DB('User')
      .insert({
        id,
        name,
        password,
        role,
      });

    const [createdUser] = await DB('User').where({ id });

    return createdUser;
  });

  fastify.patch('/:id', options, async (request) => {
    const { id } = request.params;

    await DB('User')
      .update(request.body)
      .where({ id: request.params });

    const [updatedUser] = await DB('User').where({ id });

    return updatedUser;
  });

  fastify.delete('/:id', async (request) => {
    const { id } = request.params;
    const [deletedUser] = await DB('User').where({ id });

    await DB('User')
      .where({ id: request.params.id })
      .delete();

    return deletedUser;
  });
};

module.exports = router;
