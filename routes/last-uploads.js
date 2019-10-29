const moment = require('moment');
const DB = require('../services/db');
const Auth = require('../services/authentication');
const updateUserTimestamp = require('../helpers/update-user-timestamp');

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
    const { limit = 100, meta = false } = request.query;

    const lastVideos = await DB('Video')
      .orderBy('updated_at', 'desc')
      .limit(limit);

    const idsOfLastVideos = lastVideos.map(video => video.id);

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
      .whereIn('Video.id', idsOfLastVideos)
      .orderBy('Video.updated_at', 'desc')
      .innerJoin('Video', 'Episode.video_id', 'Video.id')
      .innerJoin('Season', 'Episode.season_id', 'Season.id')
      .innerJoin('Serial', 'Season.serial_id', 'Serial.id')
      .map(episode => ({ ...episode, type: 'episode' }));

    const lastMovies = await DB
      .select('Movie.title', 'Movie.slug', 'Video.id', 'Video.updated_at as timestamp')
      .from('Movie')
      .innerJoin('Video', 'Movie.video_id', 'Video.id')
      .whereIn('Video.id', idsOfLastVideos)
      .orderBy('Video.updated_at', 'desc')
      .map(episode => ({ ...episode, type: 'movie' }));

    const lastUploads = lastEpisodes
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

    const { currentUser } = request;
    const checkedUpdatesAt = currentUser.checkedUpdatesAt
      ? moment.utc(currentUser.checkedUpdatesAt)
      : moment.utc().subtract(1, 'year');

    const fresh = lastUploads
      .filter(item => moment.utc(item.timestamp).isAfter(checkedUpdatesAt));
    const rest = lastUploads
      .filter(item => !fresh.includes(item));

    if (meta) {
      reply.send({
        fresh: Boolean(fresh.length),
        number: fresh.length,
      });

      return;
    }

    await updateUserTimestamp(currentUser, 'checkedUpdatesAt');

    reply.send({ fresh, rest });
  });
};

module.exports = router;
