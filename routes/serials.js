const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');
const parseJWT = require('../helpers/parse-jwt');

const options = {
  schema: {
    querystring: {
      slug: { type: 'string' },
      title: { type: 'string' },
    },
    body: {
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        icon: { type: 'string' },
        cover: { type: 'string' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.addHook('preHandler', async request => parseJWT(request));

  fastify.get('/', options, async (request, reply) => {
    const { include, ...query } = request.query;

    const serials = await DB('serials')
      .where(query);

    reply.send(serials);
  });

  fastify.get('/:id', async (request, reply) => {
    const [serial] = await DB('serials').where({ id: request.params.id });

    reply.send(serial);
  });

  fastify.post('/', options, async (request, reply) => {
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', options, async (request, reply) => {
    const { icon, cover, ...rest } = request.body;

    await DB('serials')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', async (request, reply) => {
    await DB('serials')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/', options, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.send('You must provide "force=true" queryparam to ensure this operation.');

      return;
    }

    await DB('serials')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
