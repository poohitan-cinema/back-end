const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');
const Auth = require('../services/authentication');

const options = {
  schema: {
    querystring: {
      number: { type: 'number' },
      serialId: { type: 'number' },
    },
    body: {
      properties: {
        number: { type: 'number' },
        cover: { type: 'string' },
        serialId: { type: 'number' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const seasons = await DB('Season')
      .where(request.query);

    return seasons;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { number, serial_slug: serialSlug } = request.query;

    const [serial] = await DB('Serial')
      .where({ slug: serialSlug });
    const [season] = await DB('Season')
      .where({ number, serial_id: serial.id });
    const episodes = await DB
      .select('Episode.id', 'Episode.title', 'Episode.number', 'Video.url')
      .from('Episode')
      .where({ season_id: season.id })
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .orderByRaw('CAST(Episode.number AS INT)');

    return { ...season, serial, episodes };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [season] = await DB('Season').where({ id: request.params.id });

    if (!season) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return season;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { cover, ...rest } = request.body;
    const id = uuid.v4();

    await DB('Season')
      .insert({
        id,
        ...rest,
        cover: getStaticContentURL(cover),
      });

    const [createdSeason] = await DB('Season').where({ id });

    return createdSeason;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const { cover, ...rest } = request.body;

    await DB('Season')
      .update({
        ...rest,
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedSeason] = await DB('Season').where({ id });

    return updatedSeason;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedSeason] = await DB('Season').where({ id });

    await DB('Season')
      .where({ id })
      .delete();

    return deletedSeason;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('Це небезпечна операція. Для підтвердження треба додати параметр "?force=true"');
    }

    const deletedSeasons = await DB('Season').where(query);

    await DB('Season')
      .where(query)
      .delete();

    return deletedSeasons;
  });
};

module.exports = router;
