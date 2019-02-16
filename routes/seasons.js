const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');

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

const router = async (server) => {
  server.get('/', options, async (request, reply) => {
    const seasons = await DB('seasons')
      .where(request.query)
      .orderBy('number', 'asc');

    reply.send(seasons);
  });

  server.get('/:id', async (request, reply) => {
    const [season] = await DB
      .select('se.*', 's.title as serial_title', 's.slug as serial_slug', 's.icon as serial_icon', 's.id as serial_id')
      .from('seasons as se')
      .where({ 'se.id': request.params.id })
      .join('serials as s', { 's.id': 'se.serial_id' });

    reply.send(season);
  });

  server.post('/', options, async (request, reply) => {
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .insert({
        ...rest,
        cover: getStaticContentURL(cover),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  server.patch('/:id', options, async (request, reply) => {
    const { cover, ...rest } = request.body;

    await DB('seasons')
      .update({
        ...rest,
        cover: getStaticContentURL(cover),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  server.delete('/:id', async (request, reply) => {
    await DB('seasons')
      .where({ id: request.params.id })
      .delete();

    reply.send(HTTPStatus.OK);
  });

  server.delete('/', options, async (request, reply) => {
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
