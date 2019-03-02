const HTTPStatus = require('http-status-codes');
const htmlToText = require('html-to-text');

const DB = require('../services/db');
const Auth = require('../services/authentication');
const Random = require('../services/random');
const getStaticContentURL = require('../helpers/get-static-content-url');

const options = {
  schema: {
    querystring: {
      number: { type: 'string' },
      title: { type: 'string' },
      videoId: { type: 'number' },
      seasonId: { type: 'number' },
    },
    body: {
      properties: {
        number: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        videoId: { type: 'number' },
        seasonId: { type: 'number' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const episodes = await DB
      .select('e.*', 'v.url')
      .from('episodes as e')
      .where(request.query)
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .orderByRaw('CAST(number AS INT)');

    return episodes;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { number, season_number: seasonNumber, serial_slug: serialSlug } = request.query;

    const [serial] = await DB('serials').where({ slug: serialSlug });
    const [season] = await DB('seasons').where({ number: seasonNumber, serial_id: serial.id });

    const episodes = await DB
      .select('e.*', 'v.url')
      .from('episodes as e')
      .where({ season_id: season.id })
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .orderByRaw('CAST(number AS INT)');

    const currentEpisode = episodes.find(episode => episode.number === number);
    const indexOfCurrentEpisode = episodes.indexOf(currentEpisode);
    const previousEpisode = episodes[indexOfCurrentEpisode - 1];
    const nextEpisode = episodes[indexOfCurrentEpisode + 1];

    return {
      ...currentEpisode,
      nextEpisode,
      previousEpisode,
      season,
      serial,
    };
  });

  fastify.get('/random', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { serial_id: serialId } = request.query;

    let serial;

    if (serialId) {
      [serial] = await DB('serials').where({ id: serialId });
    } else {
      // Select serials which have episodes
      const serials = await DB
        .select('s.*')
        .from('episodes as e')
        .leftJoin('seasons as se', 'e.season_id', 'se.id')
        .leftJoin('serials as s', 's.id', 'se.serial_id')
        .distinct('s.id');

      // Choose a random one
      serial = Random.arrayElement(serials);
    }

    // Select all episodes of the desired serial
    const episodes = await DB
      .select('e.*', 'v.url')
      .from('episodes as e')
      .innerJoin('seasons as s', 'e.season_id', 's.id')
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .andWhere({ 's.serial_id': serial.id });

    const randomEpisode = Random.arrayElement(episodes.filter(episode => episode.url));

    const [season] = await DB('seasons').where({ id: randomEpisode.seasonId });

    return {
      ...randomEpisode,
      season,
      serial,
    };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [episode] = await DB('episodes').where({ id: request.params.id });

    if (!episode) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
    }

    return episode;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { url, ...rest } = request.body;
    let videoId;

    if (url) {
      await DB('videos').insert({
        url: getStaticContentURL(url),
      });

      [{ id: videoId }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    }

    await DB('episodes')
      .insert({
        video_id: videoId,
        ...rest,
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');
    const [createdEpisode] = await DB
      .select('e.*', 'v.url')
      .from('episodes as e')
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .where({ id });

    return createdEpisode;
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const {
      title, description, ...rest
    } = request.body;

    const sanitizedTitle = title ? htmlToText.fromString(title, { wordwrap: false }) : undefined;
    const sanitizedDescription = description
      ? htmlToText.fromString(description, { wordwrap: false })
      : undefined;

    await DB('episodes')
      .update({
        title: sanitizedTitle,
        description: sanitizedDescription,
        ...rest,
      })
      .where({ id });

    const [updatedEpisode] = await DB
      .select('e.*', 'v.url')
      .from('episodes as e')
      .innerJoin('videos as v', 'e.video_id', 'v.id')
      .where({ 'e.id': id });

    return updatedEpisode;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedEpisode] = await DB('episodes').where({ id });

    await DB('episodes')
      .where({ id })
      .delete();

    return deletedEpisode;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('You must provide "force=true" queryparam to ensure this operation.');
    }

    const deletedEpisodes = await DB('episodes').where(query);

    await DB('episodes')
      .where(query)
      .delete();

    return deletedEpisodes;
  });
};

module.exports = router;
