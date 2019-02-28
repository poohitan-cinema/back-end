const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');
const Auth = require('../services/authentication');

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
        icon: { type: 'string' },
        cover: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const serials = await DB('serials')
      .where(request.query);

    reply.send(serials);
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const { slug } = request.query;

    const [serial] = await DB('serials').where({ slug });
    const seasons = await DB('seasons')
      .where({ serial_id: serial.id })
      .orderBy('number', 'asc');

    reply.send({
      ...serial,
      seasons,
    });
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [serial] = await DB('serials').where({ id: request.params.id });

    reply.send(serial);
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    await DB('serials')
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

    await DB('serials')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });

  fastify.post('/:id/batch-add-episode-urls', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { season: seasonNumber, urls } = request.body;

    const [serial] = await DB('serials')
      .where({ id: request.params.id });

    const [season] = await DB('seasons').where({ serial_id: serial.id, number: seasonNumber });

    await Promise.all(
      Object.keys(urls).map(async (episodeNumber) => {
        const url = urls[episodeNumber];
        const number = Number(episodeNumber);
        const [episode] = await DB('episodes')
          .where({ season_id: season.id, number });

        if (episode) {
          return DB('episodes')
            .update({ url })
            .where({ id: episode.id });
        }

        return DB('episodes')
          .insert({
            url,
            number,
            season_id: season.id,
          });
      }),
    );

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
