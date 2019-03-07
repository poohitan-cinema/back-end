const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

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
      .from('Movie as m')
      .innerJoin('Video as v', 'm.video_id', 'v.id')
      .where(request.query);

    return movies;
  });

  fastify.get('/random', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const movies = await DB
      .select('Movie.*', 'Video.url')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .where(request.query);

    if (!movies.length) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return Random.arrayElement(movies.filter(movie => movie.url));
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [movie] = await DB
      .select('Movie.*', 'Video.url')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .where({ id: request.params.id });

    if (!movie) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return movie;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    const videoId = uuid.v4();

    if (url) {
      await DB('Video').insert({
        id: videoId,
        url: getStaticContentURL(url),
      });
    }

    const id = uuid.v4();

    await DB('Movie')
      .insert({
        id,
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        video_id: videoId,
      });

    const [createdMovie] = await DB
      .select('Movie.*', 'Video.url')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .where({ 'Movie.id': id });

    return createdMovie;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const {
      icon, cover, ...rest
    } = request.body;

    await DB('Movie')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedMovie] = await DB
      .select('Movie.*', 'Video.url')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .where({ 'Movie.id': id });

    return updatedMovie;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedMovie] = await DB('Movie').where({ id });

    await DB('Movie')
      .where({ id })
      .delete();

    return deletedMovie;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('Це небезпечна операція. Для підтвердження треба додати параметр "?force=true"');
    }

    const deletedMovies = await DB('Movie').where(query);

    await DB('Movie')
      .where(query)
      .delete();

    return deletedMovies;
  });
};

module.exports = router;
