const HTTPStatus = require('http-status-codes');
const uuid = require('uuid');

const DB = require('../services/db');
const Auth = require('../services/authentication');

const options = {
  schema: {
    querystring: {
      userId: { type: 'number' },
      videoId: { type: 'number' },
    },
    body: {
      properties: {
        endTime: { type: 'number' },
        userId: { type: 'number' },
        videoId: { type: 'number' },
      },
    },
  },
};

async function getEpisodesViewsDetailed({ where, limit }) {
  return DB
    .select(
      'VideoView.*',
      'Episode.title as episode_title',
      'Episode.number as episode_number',
      'Season.number as season_number',
      'Serial.slug as serial_slug',
      'Serial.title as serial_title',
    )
    .from('VideoView')
    .innerJoin('Video', 'VideoView.video_id', 'Video.id')
    .innerJoin('Episode', 'Episode.video_id', 'Video.id')
    .innerJoin('Season', 'Season.id', 'Episode.season_id')
    .innerJoin('Serial', 'Serial.id', 'Season.serial_id')
    .where(where)
    .orderBy('created_at', 'desc')
    .limit(limit);
}


async function getMoviesViewsDetailed({ where, limit }) {
  return DB
    .select('VideoView.*', 'Movie.title as movie_title', 'Movie.slug as movie_slug')
    .from('VideoView')
    .innerJoin('Video', 'VideoView.video_id', 'Video.id')
    .innerJoin('Movie', 'Movie.video_id', 'Video.id')
    .where(where)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    const videoViews = await DB('VideoView').where(request.query);

    return videoViews;
  });

  fastify.get('/episodes', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { limit, ...query } = request.query;
    const { id } = request.currentUser;

    const episodesViews = await getEpisodesViewsDetailed({
      where: { user_id: id, ...query },
      limit,
    });

    return episodesViews;
  });

  fastify.get('/episodes/last', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { id } = request.currentUser;

    const [lastEpisodeView] = await getEpisodesViewsDetailed({
      where: { user_id: id, ...request.query },
      limit: 1,
    });

    if (!lastEpisodeView) {
      return null;
    }

    const [nextEpisode] = await DB
      .select(
        'Episode.id',
        'Episode.number',
        'Episode.title',
        'Season.number as season_number',
        'Serial.slug as serial_slug',
      )
      .from('Episode')
      .innerJoin('Season', 'Episode.season_id', 'Season.id')
      .innerJoin('Serial', 'Season.serial_id', 'Serial.id')
      .where({
        'Episode.number': `${Number(lastEpisodeView.episodeNumber) + 1}`,
        'Season.number': lastEpisodeView.seasonNumber,
        'Serial.slug': lastEpisodeView.serialSlug,
      })
      .orWhere({
        'Episode.number': '1',
        'Season.number': lastEpisodeView.seasonNumber + 1,
        'Serial.slug': lastEpisodeView.serialSlug,
      });

    return {
      ...lastEpisodeView,
      nextEpisode,
    };
  });

  fastify.get('/movies', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { limit, ...query } = request.query;
    const videoViews = await getMoviesViewsDetailed({ where: query, limit });

    return videoViews;
  });

  fastify.get('/movies/last', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const [lastMovieView] = await getMoviesViewsDetailed({ where: request.query, limit: 1 });

    if (!lastMovieView) {
      return null;
    }

    return lastMovieView;
  });

  fastify.get('/:id', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const [videoView] = await DB('VideoView').where({ id: request.params.id });

    if (!videoView) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error();
    }

    return videoView;
  });

  fastify.post('/', { preHandler: Auth.checkUserRights }, async (request, reply) => {
    const { body } = request;
    const { videoId, userId, endTime } = typeof body === 'string'
      ? JSON.parse(body)
      : body;

    if (!(videoId && userId && endTime)) {
      reply.code(HTTPStatus.UNPROCESSABLE_ENTITY);

      throw new Error();
    }

    const id = uuid.v4();
    await DB('VideoView')
      .insert({
        id,
        video_id: videoId,
        user_id: userId,
        end_time: Math.floor(endTime),
      });

    return { id };
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('VideoView')
      .update(request.body)
      .where({ id: request.params.id });

    return {};
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('VideoView')
      .where({ id: request.params.id })
      .delete();

    return {};
  });

  fastify.delete('/', { preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('VideoView')
      .where(request.query)
      .delete();

    return {};
  });
};

module.exports = router;
