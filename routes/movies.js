const HTTPStatus = require('http-status-codes');

const DB = require('../services/db');
const getStaticContentURL = require('../helpers/get-static-content-url');

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
        description: { type: 'string' },
        icon: { type: 'string' },
        cover: { type: 'string' },
        url: { type: 'string' },
      },
    },
  },
};

const router = async (server) => {
  server.get('/', options, async (request, reply) => {
    const { include, ...query } = request.query;

    const movies = await DB('movies')
      .where(query);

    reply.send(movies);
  });

  server.get('/:id', async (request, reply) => {
    const [movie] = await DB('movies').where({ id: request.params.id });

    reply.send(movie);
  });

  server.post('/', options, async (request, reply) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    await DB('movies')
      .insert({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        url: getStaticContentURL(url),
      });

    const [{ id }] = await DB.raw('SELECT last_insert_rowid() as "id"');

    reply.send({ id });
  });

  server.patch('/:id', options, async (request, reply) => {
    const {
      icon, cover, url, ...rest
    } = request.body;

    await DB('movies')
      .update({
        ...rest,
        icon: getStaticContentURL(icon),
        cover: getStaticContentURL(cover),
        url: getStaticContentURL(url),
      })
      .where({ id: request.params.id });

    reply.send(HTTPStatus.OK);
  });

  server.delete('/:id', async (request, reply) => {
    await DB('movies')
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

    await DB('movies')
      .where(query)
      .delete();

    reply.send(HTTPStatus.OK);
  });
};

module.exports = router;
