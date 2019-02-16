const fastify = require('fastify');
const HTTPStatus = require('http-status-codes');
const cors = require('fastify-cors');

const serials = require('./routes/serials');
const seasons = require('./routes/seasons');
const episodes = require('./routes/episodes');
const staticContent = require('./routes/static');

const transformColumnNamesCase = require('./helpers/transform-column-names-case');
const config = require('./config');

const server = fastify({ logger: true });

server.addHook('preHandler', async (request) => {
  request.body = transformColumnNamesCase(request.body, 'snake');
  request.query = transformColumnNamesCase(request.query, 'snake');
});

server.register(cors, { origin: config.corsWhiteList, credentials: true });

server.register(serials, { prefix: '/serials' });
server.register(seasons, { prefix: '/seasons' });
server.register(episodes, { prefix: '/episodes' });
server.register(staticContent, { prefix: '/static' });

server.get('/', async (request, reply) => {
  reply.send(HTTPStatus.OK);
});

server.listen(config.port, (error, address) => {
  if (error) {
    server.log.error(error);
    process.exit(1);

    return;
  }

  server.log.info(`Server listening on ${address}`);
});
