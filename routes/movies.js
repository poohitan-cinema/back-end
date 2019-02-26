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
        url: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const movies = await DB('movies')
      .where(request.query);

    reply.send(movies);
  });

  fastify.get('/random', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const movies = await DB('movies').where(request.query);

    const randomIndex = Random.number({ min: 0, max: movies.length });
    const randomMovie = movies[randomIndex];

    reply.send(randomMovie);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const [movie] = await DB('movies').where({ id: request.params.id });

    reply.send(movie);
  });

  fastify.post('/', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    await DB('movies')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        url: getStaticContentURL(url),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    await DB('movies')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        url: getStaticContentURL(url),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    await DB('movies')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
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
