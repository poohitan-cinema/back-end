const config = require('../config');
const parseJWT = require('../helpers/parse-jwt');

const router = async (fastify) => {
  fastify.addHook('preHandler', async request => parseJWT(request));

  fastify.get('/images/*', async (request, reply) => {
    const path = request.params['*'];

    reply.redirect(`${config.digitalOcean.space}/images/${path}`);
  });

  fastify.get('/videos/*', async (request, reply) => {
    const path = request.params['*'];

    reply.redirect(`${config.digitalOcean.space}/videos/${path}`);
  });
};

module.exports = router;
