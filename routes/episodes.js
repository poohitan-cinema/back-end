const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');
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
      .select('Episode.*', 'Video.url')
      .from('Episode')
      .where(request.query)
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .orderByRaw('CAST(number AS INT)');

    return episodes;
  });

  fastify.get('/detailed', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { number, season_number: seasonNumber, serial_slug: serialSlug } = request.query;

    const [serial] = await DB('Serial').where({ slug: serialSlug });
    const [season] = await DB('Season').where({ number: seasonNumber, serial_id: serial.id });

    const episodes = await DB
      .select('Episode.*', 'Video.url')
      .from('Episode')
      .where({ season_id: season.id })
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .orderByRaw('CAST(number AS INT)');

    const currentEpisode = episodes.find(episode => episode.number === number);
    const indexOfCurrentEpisode = episodes.indexOf(currentEpisode);
    const previousEpisode = episodes[indexOfCurrentEpisode - 1];
    const nextEpisode = episodes[indexOfCurrentEpisode + 1];

    const tags = await DB('VideoTag').where({ video_id: currentEpisode.videoId });

    return {
      ...currentEpisode,
      tags,
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
      [serial] = await DB('Serial').where({ id: serialId });
    } else {
      // Select serials which have episodes
      const serials = await DB
        .select('Serial.*')
        .from('Episode')
        .leftJoin('Season', 'Episode.season_id', 'Season.id')
        .leftJoin('Serial', 'Serial.id', 'Season.serial_id')
        .distinct('Serial.id');

      // Choose a random one
      serial = Random.arrayElement(serials);
    }

    // Select all episodes of the desired serial
    const episodes = await DB
      .select('Episode.*', 'Video.url')
      .from('Episode')
      .innerJoin('Season', 'Episode.season_id', 'Season.id')
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .andWhere({ 'Season.serial_id': serial.id });

    const randomEpisode = Random.arrayElement(episodes.filter(episode => episode.url));

    const [season] = await DB('Season').where({ id: randomEpisode.seasonId });

    return {
      ...randomEpisode,
      season,
      serial,
    };
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [episode] = await DB('Episode').where({ id: request.params.id });

    if (!episode) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return episode;
  });

  fastify.post('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const { url, ...rest } = request.body;
    const videoId = uuid.v4();

    if (url) {
      await DB('Video').insert({
        id: videoId,
        url: getStaticContentURL(url),
      });
    }

    const id = uuid.v4();

    await DB('Episode')
      .insert({
        id,
        video_id: videoId,
        ...rest,
      });

    const [createdEpisode] = await DB
      .select('Episode.*', 'Video.url')
      .from('Episode')
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .where({ 'Episode.id': id });

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

    await DB('Episode')
      .update({
        title: sanitizedTitle,
        description: sanitizedDescription,
        ...rest,
      })
      .where({ id });

    const [updatedEpisode] = await DB
      .select('Episode.*', 'Video.url')
      .from('Episode')
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .where({ 'Episode.id': id });

    return updatedEpisode;
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { id } = request.params;
    const [deletedEpisode] = await DB('Episode').where({ id });

    await DB('Episode')
      .where({ id })
      .delete();

    return deletedEpisode;
  });

  fastify.delete('/', { ...options, preHandler: Auth.checkAdminRights }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.code(HTTPStatus.FORBIDDEN);

      return new Error('Це небезпечна операція. Для підтвердження треба додати параметр "?force=true"');
    }

    const deletedEpisodes = await DB('Episode').where(query);

    await DB('Episode')
      .where(query)
      .delete();

    return deletedEpisodes;
  });
};

module.exports = router;
