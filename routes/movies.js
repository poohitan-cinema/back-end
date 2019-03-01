const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const Auth = require('../services/authentication');
const getStaticContentURL = require('../helpers/get-static-content-url');
const Random = require('../services/random');

const options = {
  schema: {
    querystring: {
      slug: { type: 'string' },
      title: { type: 'string' },
    },
    body: {
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string' },
        cover: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const movies = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where(request.query);

    reply.send(movies);
  });

  fastify.get('/random', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const movies = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where(request.query);

    const randomMovie = Random.arrayElement(movies);

    reply.send(randomMovie);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [movie] = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where({ id: request.params.id });

    reply.send(movie);
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    let videoId;

    if (url) {
      await DB('videos').insert({
        url: getStaticContentURL(url),
      });

      [{ id: videoId }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    }

    await DB('movies')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        video_id: videoId,
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const {
      icon, cover, ...rest
    } = request.body;

    await DB('movies')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    await DB('movies')
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

    await DB('movies')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
