const moment = require('moment');
const DB = require('../services/db');
const Auth = require('../services/authentication');

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const options = {
  schema: {
    body: {
      properties: {
        url: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.checkUserRights }, async (request, reply) => {
    const { limit = 100 } = request.query;

    const lastUpdatesVideos = await DB('Video')
      .orderBy('updated_at', 'desc')
      .limit(limit);

    const idsOfLastUpdatedVideos = lastUpdatesVideos.map(video => video.id);

    const lastEpisodes = await DB
      .select(
        'Episode.title',
        'Episode.number',
        'Season.number as season_number',
        'Serial.slug as serial_slug',
        'Serial.title as serial_title',
        'Video.id',
        'Video.updated_at as timestamp',
      )
      .from('Episode')
      .whereIn('Video.id', idsOfLastUpdatedVideos)
      .orderBy('Video.updated_at', 'desc')
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .innerJoin('Season', 'Episode.season_id', 'Season.id')
      .innerJoin('Serial', 'Season.serial_id', 'Serial.id')
      .map(episode => ({ ...episode, type: 'episode' }));

    const lastMovies = await DB
      .select('Movie.title', 'Movie.slug', 'Video.id', 'Video.updated_at as timestamp')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .whereIn('Video.id', idsOfLastUpdatedVideos)
      .orderBy('Video.updated_at', 'desc')
      .map(episode => ({ ...episode, type: 'movie' }));

    const allUpdates = lastEpisodes
      .concat(lastMovies)
      .sort((left, right) => {
        const leftMoment = moment.utc(left.timestamp, DATE_FORMAT);
        const rightMoment = moment.utc(right.timestamp, DATE_FORMAT);

        if (leftMoment.isBefore(rightMoment)) {
          return 1;
        }

        if (leftMoment.isAfter(rightMoment)) {
          return -1;
        }

        if (left.type === 'episode' && right.type === 'episode') {
          if (Number(left.number) < Number(right.number)) {
            return 1;
          }

          if (Number(left.number) > Number(right.number)) {
            return -1;
          }

          return 0;
        }

        return 0;
      })
      .slice(0, limit);

    reply.send(allUpdates);
  });
};

module.exports = router;