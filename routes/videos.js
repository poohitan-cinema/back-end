const HTTPStatus = require('http-status-codes');

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

    const videos = await DB('videos')
      .where({
        url: encodeURI(url),
        ...query,
      });

    reply.send(videos);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [video] = await DB('videos').where({ id: request.params.id });

    reply.send(video);
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('videos')
      .insert({
        url: getStaticContentURL(url),
        ...rest,
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('videos')
      .update({
        url: getStaticContentURL(url),
        ...rest,
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    await DB('videos')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.send('You must provide "force=true" queryparam to ensure this operation.');

      return;
    }

    await DB('videos')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
