const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const Auth = require('../services/authentication');
const getStaticContentURL = require('../helpers/get-static-content-url');

const options = {
  schema: {
    querystring: {
      userId: { type: 'number' },
      videoId: { type: 'number' },
    },
    body: {
      properties: {
        duration: { type: 'number' },
        userId: { type: 'number' },
        videoId: { type: 'number' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const videoViews = await DB('video_views')
      .where(request.query);

    reply.send(videoViews);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [videoView] = await DB('video_views').where({ id: request.params.id });

    reply.send(videoView);
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('video_views')
      .insert({
        url: getStaticContentURL(url),
        ...rest,
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('video_views')
      .update({
        url: getStaticContentURL(url),
        ...rest,
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    await DB('video_views')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
