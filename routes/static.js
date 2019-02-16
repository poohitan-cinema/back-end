const config = require('../config');

const router = async (server) => {
  server.get('/images/*', async (request, reply) => {
    const path = request.params['*'];

    reply.redirect(`${config.digitalOcean.space}/images/${path}`);
  });

  server.get('/videos/*', async (request, reply) => {
    const path = request.params['*'];

    reply.redirect(`${config.digitalOcean.space}/videos/${path}`);
  });
};

module.exports = router;
