const HTTPStatus = require('http-status-codes');

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
    const seasons = await DB('seasons')
      .where(request.query)
      .orderBy('number', 'asc');

    return seasons;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { number, serial_slug: serialSlug } = request.query;

    const [serial] = await DB('serials')
      .where({ slug: serialSlug });
    const [season] = await DB('seasons')
      .where({ number, serial_id: serial.id });
    const episodes = await DB
      .select('e.id', 'e.title', 'e.number', 'v.url')
      .from('episodes as e')
      .where({ season_id: season.id })
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .orderByRaw('CAST(e.number AS INT)');

    return { ...season, serial, episodes };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [season] = await DB('seasons').where({ id: request.params.id });

    if (!season) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return season;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .insert({
        ...rest,
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    const [createdSeason] = await DB('seasons').where({ id });

    return createdSeason;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .update({
        ...rest,
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedSeason] = await DB('seasons').where({ id });

    return updatedSeason;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedSeason] = await DB('seasons').where({ id });

    await DB('seasons')
      .where({ id })
      .delete();

    return deletedSeason;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { force, ...query } = request.query;

    if (!force) {
      return new Error('You must provide "force=true" queryparam to ensure this operation.');
    }

    const deletedSeasons = await DB('seasons').where(query);

    await DB('seasons')
      .where(query)
      .delete();

    return deletedSeasons;
  });
};

module.exports = router;
