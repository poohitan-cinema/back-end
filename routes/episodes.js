const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');
const Auth = require('../services/authentication');

const options = {
  schema: {
    querystring: {
      number: { type: 'number' },
      title: { type: 'string' },
    },
    body: {
      properties: {
        number: { type: 'number' },
        title: { type: 'string' },
        url: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const { include, ...query } = request.query;

    const episodes = await DB('episodes')
      .where(query)
      .orderBy('number', 'asc');

    reply.send(episodes);
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const { number, season_number: seasonNumber, serial_slug: serialSlug } = request.query;

    const [serial] = await DB('serials').where({ slug: serialSlug });
    const [season] = await DB('seasons').where({ number: seasonNumber, serial_id: serial.id });
    const episodes = await DB('episodes')
      .whereIn('number', [number - 1, number, number + 1])
      .andWhere({ season_id: season.id })
      .orderBy('number', 'asc');

    const [previousEpisode, currentEpisode, nextEpisode] = episodes;

    reply.send({
      ...currentEpisode,
      nextEpisode,
      previousEpisode,
      season,
      serial,
    });
  });

  fastify.get('/:id', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const [episode] = await DB('episodes').where({ id: request.params.id });

    reply.send(episode);
  });

  fastify.post('/', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('episodes')
      .insert({
        ...rest,
        url: getStaticContentURL(url),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const { url, ...rest } = request.body;

    await DB('episodes')
      .update({
        ...rest,
        url: getStaticContentURL(url),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    await DB('episodes')
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

    await DB('episodes')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
