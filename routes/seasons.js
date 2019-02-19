const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');
const Auth = require('../services/authentication');

const options = {
  schema: {
    querystring: {
      number: { type: 'number' },
      serial: { type: 'number' },
    },
    body: {
      properties: {
        number: { type: 'number' },
        cover: { type: 'string' },
        serial: { type: 'number' },
      },
    },
  },
};

const router = async (fastify) => {
  fastify.get('/', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const seasons = await DB('seasons')
      .where(request.query)
      .orderBy('number', 'asc');

    reply.send(seasons);
  });

  fastify.get('/:id', { ...options, preHandler: Auth.validateJWT }, async (request, reply) => {
    const [season] = await DB
      .select('se.*', 's.title as serial_title', 's.slug as serial_slug', 's.icon as serial_icon', 's.id as serial_id')
      .from('seasons as se')
      .where({ 'se.id': request.params.id })
      .join('serials as s', { 's.id': 'se.serial_id' });

    reply.send(season);
  });

  fastify.post('/', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .insert({
        ...rest,
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  fastify.patch('/:id', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .update({
        ...rest,
        cover: getStaticContentURL(cover),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/:id', { preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    await DB('seasons')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });

  fastify.delete('/', { ...options, preHandler: Auth.validateSuperSecret }, async (request, reply) => {
    const { force, ...query } = request.query;

    if (!force) {
      reply.send('You must provide "force=true" queryparam to ensure this operation.');

      return;
    }

    await DB('seasons')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
