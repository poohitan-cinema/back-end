const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

const DB = require('../services/db');
const Auth = require('../services/authentication');
const getStaticContentURL = require('../helpers/get-static-content-url');

const options = {
  schema: {
    body: {
      properties: {
        url: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const { url, ...query } = request.query;

    const videos = await DB('Video')
      .where({
        url: encodeURI(url),
        ...query,
      });

    reply.send(videos);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [video] = await DB('Video').where({ id: request.params.id });

    reply.send(video);
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { url, ...rest } = request.body;
    const id = uuid.v4();

    await DB('Video')
      .insert({
        id,
        url: getStaticContentURL(url),
        ...rest,
      });

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { url, ...rest } = request.body;

    await DB('Video')
      .update({
        url: getStaticContentURL(url),
        ...rest,
      })
      .where({ id: request.params.id });

    return {};
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('Video')
      .where({ id: request.params.id })
      .delete();

    return {};
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      throw new Error('Це небезпечна операція. Для підтвердження треба додати параметр "?force=true"');
    }

    await DB('Video')
      .where(query)
      .delete();

    return {};
  });
};

module.exports = router;
