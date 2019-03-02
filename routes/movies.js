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
      videoId: { type: 'number' },
    },
    body: {
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string' },
        cover: { type: 'string' },
        videoId: { type: 'number' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const movies = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where(request.query);

    return movies;
  });

  fastify.get('/random', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const movies = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where(request.query);

    if (!movies.length) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return Random.arrayElement(movies.filter(movie => movie.url));
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [movie] = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where({ id: request.params.id });

    if (!movie) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return movie;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
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
    const [createdMovie] = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where({ id });

    return createdMovie;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const {
      icon, cover, ...rest
    } = request.body;

    await DB('movies')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedMovie] = await DB
      .select('m.*', 'v.url')
      .from('movies as m')
      .innerJoin('videos as v', 'm.video_id', 'v.id')
      .where({ id });

    return updatedMovie;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedMovie] = await DB('movies').where({ id });

    await DB('movies')
      .where({ id })
      .delete();

    return deletedMovie;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('You must provide "force=true" queryparam to ensure this operation.');
    }

    const deletedMovies = await DB('movies').where(query);

    await DB('movies')
      .where(query)
      .delete();

    return deletedMovies;
  });
};

module.exports = router;
