const fastify = require('fastify')({
  logger: {
    prettyPrint: true,
  },
});
const HTTPStatus = require('http-status-codes');

const signIn = require('./routes/login');
const users = require('./routes/users');
const videos = require('./routes/videos');
const movies = require('./routes/movies');
const serials = require('./routes/serials');
const seasons = require('./routes/seasons');
const episodes = require('./routes/episodes');

const transformColumnNamesCase = require('./helpers/transform-column-names-case');
const config = require('./config');

fastify.register(require('fastify-cors'), { origin: config.corsWhiteList, credentials: true });
fastify.register(require('fastify-cookie'), (error) => {
  if (error) throw error;
});

fastify.addHook('preHandler', async (request) => {
  request.body = transformColumnNamesCase(request.body, 'snake');
  request.query = transformColumnNamesCase(request.query, 'snake');
});

fastify.register(signIn, { prefix: '/sign-in' });
fastify.register(users, { prefix: '/users' });
fastify.register(videos, { prefix: '/videos' });
fastify.register(movies, { prefix: '/movies' });
fastify.register(serials, { prefix: '/serials' });
fastify.register(seasons, { prefix: '/seasons' });
fastify.register(episodes, { prefix: '/episodes' });

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
