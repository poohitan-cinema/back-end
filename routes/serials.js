const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const Auth = require('../services/authentication');
const getStaticContentURL = require('../helpers/get-static-content-url');

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
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const serials = await DB('serials')
      .where(request.query);

    return serials;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { slug } = request.query;

    const [serial] = await DB('serials').where({ slug });
    const seasons = await DB('seasons')
      .where({ serial_id: serial.id })
      .orderBy('number', 'asc');

    return {
      ...serial,
      seasons,
    };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [serial] = await DB('serials').where({ id: request.params.id });

    if (!serial) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return serial;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    const [createdSerial] = await DB('serials').where({ id });

    return createdSerial;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedSerial] = await DB('serials').where({ id });

    return updatedSerial;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedSerial] = await DB('serials').where({ id });

    await DB('serials')
      .where({ id })
      .delete();

    return deletedSerial;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { force, ...query } = request.query;

    if (!force) {
      return new Error('You must provide "force=true" queryparam to ensure this operation.');
    }

    const deletedSerials = await DB('serials').where(query);

    await DB('serials')
      .where(query)
      .delete();

    return deletedSerials;
  });

  fastify.post('/:id/batch-add-episode-urls', { preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { season: seasonNumber, urls } = request.body;

    const [serial] = await DB('serials')
      .where({ id: request.params.id });

    const [season] = await DB('seasons').where({ serial_id: serial.id, number: seasonNumber });

    await Promise.all(
      Object.keys(urls).map(async (episodeNumber) => {
        const rawUrl = urls[episodeNumber];
        const url = getStaticContentURL(rawUrl);
        const number = Number(episodeNumber);

        const [episode] = await DB('episodes')
          .where({ season_id: season.id, number });

        if (!episode.videoId) {
          return DB('videos').insert({ url })
            .then(() => DB('videos').where({ url }))
            .then(([video]) => {
              if (episode) {
                return DB('episodes')
                  .update({ video_id: video.id })
                  .where({ id: episode.id });
              }

              return DB('episodes').insert({
                number,
                season_id: season.id,
                video_id: video.id,
              });
            });
        }

        return DB('videos')
          .update({ url })
          .where({ id: episode.videoId });
      }),
    );

    reply.code(HTTPStatus.OK);

    return {};
  });
};

module.exports = router;
