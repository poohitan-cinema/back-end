const fastify = require('fastify')({
  logger: {
    prettyPrint: true,
  },
});
const HTTPStatus = require('http-status-codes');

const Auth = require('./services/authentication');

const login = require('./routes/login');
const users = require('./routes/users');
const videos = require('./routes/videos');
const videoViews = require('./routes/video-views');
const movies = require('./routes/movies');
const serials = require('./routes/serials');
const seasons = require('./routes/seasons');
const episodes = require('./routes/episodes');
const videoProcessing = require('./routes/video-processing');

const transformColumnNamesCase = require('./helpers/transform-column-names-case');
const config = require('./config');

fastify.register(require('fastify-file-upload'));
fastify.register(require('fastify-cors'), { origin: config.corsWhiteList, credentials: true });
fastify.register(require('fastify-cookie'), (error) => {
  if (error) throw error;
});

fastify.addHook('preHandler', async (request) => {
  if (request.headers['content-type'] === 'application/json') {
    request.body = transformColumnNamesCase(request.body, 'snake');
  }
  request.query = transformColumnNamesCase(request.query, 'snake');
});

fastify.addHook('preHandler', async request => Auth.injectCurrentUser(request));

fastify.register(login, { prefix: '/login' });
fastify.register(users, { prefix: '/users' });
fastify.register(videos, { prefix: '/videos' });
fastify.register(videoViews, { prefix: '/video-views' });
fastify.register(movies, { prefix: '/movies' });
fastify.register(serials, { prefix: '/serials' });
fastify.register(seasons, { prefix: '/seasons' });
fastify.register(episodes, { prefix: '/episodes' });
fastify.register(videoProcessing, { prefix: '/video-processing' });

fastify.get('/', async (request, reply) => {
  reply.send(HTTPStatus.OK);
});

fastify.listen(config.port, (error, address) => {
  if (error) {
    fastify.log.error(error);
    process.exit(1);

    return;
  }

  fastify.log.info(`Server listening on ${address}`);
});
