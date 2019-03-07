const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

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
    const serials = await DB('Serial')
      .where(request.query);

    return serials;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { slug } = request.query;

    const [serial] = await DB('Serial').where({ slug });
    const seasons = await DB('Season')
      .where({ serial_id: serial.id })
      .orderByRaw('CAST(number AS INT)');

    return {
      ...serial,
      seasons,
    };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [serial] = await DB('Serial').where({ id: request.params.id });

    if (!serial) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return serial;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { icon, cover, ...rest } = request.body;
    const id = uuid.v4();

    await DB('Serial')
      .insert({
        id,
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      });

    const [createdSerial] = await DB('Serial').where({ id });

    return createdSerial;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const { icon, cover, ...rest } = request.body;

    await DB('Serial')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id });

    const [updatedSerial] = await DB('Serial').where({ id });

    return updatedSerial;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedSerial] = await DB('Serial').where({ id });

    await DB('Serial')
      .where({ id })
      .delete();

    return deletedSerial;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('Це небезпечна операція. Для підтвердження треба додати параметр "?force=true"');
    }

    const deletedSerials = await DB('Serial').where(query);

    await DB('Serial')
      .where(query)
      .delete();

    return deletedSerials;
  });

  fastify.post('/:slug/batch-add-episode-urls', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { season: seasonNumber, urls } = request.body;

    const [serial] = await DB('Serial')
      .where({ slug: request.params.slug });

    const [season] = await DB('Season').where({ serial_id: serial.id, number: seasonNumber });

    const createdEpisodes = [];
    const updatedEpisodes = [];
    const skippedEpisodes = [];

    await Promise.all(
      Object.keys(urls).map(async (episodeNumber) => {
        const rawUrl = urls[episodeNumber];
        const url = getStaticContentURL(rawUrl);
        const number = episodeNumber;

        const [episode] = await DB('Episode')
          .where({ season_id: season.id, number });

        // Skip if episode already exists and has a connected video (do not override)
        if (episode && episode.videoId) {
          skippedEpisodes.push(episode.id);

          return;
        }

        const videoId = uuid.v4();

        const [video] = await DB('Video')
          .insert({ id: videoId, url })
          .then(() => DB('Video').where({ id: videoId }));

        if (episode) {
          await DB('Episode').update({
            video_id: video.id,
          });

          updatedEpisodes.push(episode.id);
        } else {
          const id = uuid.v4();

          await DB('Episode').insert({
            id,
            number,
            season_id: season.id,
            video_id: video.id,
          });

          createdEpisodes.push(id);
        }
      }),
    );

    return {
      createdEpisodes,
      updatedEpisodes,
      skippedEpisodes,
    };
  });
};

module.exports = router;
