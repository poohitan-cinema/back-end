const HTTPStatus = require('http-status-codes');

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
      'vv.*',
      'e.title as episode_title',
      'e.number as episode_number',
      'se.number as season_number',
      's.slug as serial_slug',
      's.title as serial_title',
    )
    .from('video_views as vv')
    .innerJoin('videos as v', 'vv.video_id', 'v.id')
    .innerJoin('episodes as e', 'e.video_id', 'v.id')
    .innerJoin('seasons as se', 'se.id', 'e.season_id')
    .innerJoin('serials as s', 's.id', 'se.serial_id')
    .where(where)
    .orderBy('created_at', 'desc')
    .limit(limit);
}


async function getMoviesViewsDetailed({ where, limit }) {
  return DB
    .select('vv.*', 'm.title as movie_title', 'm.slug as movie_slug')
    .from('video_views as vv')
    .innerJoin('videos as v', 'vv.video_id', 'v.id')
    .innerJoin('movies as m', 'm.video_id', 'v.id')
    .where(where)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const videoViews = await DB('video_views').where(request.query);

    return videoViews;
  });

  fastify.get('/episodes', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const { limit, ...query } = request.query;
    const episodesViews = await getEpisodesViewsDetailed({ where: query, limit });

    return episodesViews;
  });

  fastify.get('/episodes/last', { ...options, preHandler: Auth.checkUserRights }, async (request) => {
    const [lastEpisodeView] = await getEpisodesViewsDetailed({ where: request.query, limit: 1 });

    if (!lastEpisodeView) {
      return null;
    }

    const [nextEpisode] = await DB
      .select(
        'e.id',
        'e.number',
        'e.title',
        'se.number as season_number',
        's.slug as serial_slug',
      )
      .from('episodes as e')
      .innerJoin('seasons as se', 'e.season_id', 'se.id')
      .innerJoin('serials as s', 'se.serial_id', 's.id')
      .where({
        'e.number': `${Number(lastEpisodeView.episodeNumber) + 1}`,
        'se.number': lastEpisodeView.seasonNumber,
        's.slug': lastEpisodeView.serialSlug,
      })
      .orWhere({
        'e.number': '1',
        'se.number': lastEpisodeView.seasonNumber + 1,
        's.slug': lastEpisodeView.serialSlug,
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
    const [videoView] = await DB('video_views').where({ id: request.params.id });

    if (!videoView) {
      reply.code(HTTPStatus.NOT_FOUND);

      return {};
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

      return {};
    }

    await DB('video_views')
      .insert({
        video_id: videoId,
        user_id: userId,
        end_time: Math.floor(endTime),
      });

    return {};
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('video_views')
      .update(request.body)
      .where({ id: request.params.id });

    return {};
  });

  fastify.delete('/:id', { preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('video_views')
      .where({ id: request.params.id })
      .delete();

    return {};
  });

  fastify.delete('/', { preHandler: Auth.checkAdminRights }, async (request) => {
    await DB('video_views')
      .where(request.query)
      .delete();

    return {};
  });
};

module.exports = router;
