const transformColumnNamesCase = require('./helpers/transform-column-names-case');

function postProcessResponse(result) {
  if (Array.isArray(result)) {
    return result.map(row => transformColumnNamesCase(row, 'camel'));
  }

  return transformColumnNamesCase(result, 'camel');
}

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './cinema.sqlite3',
    },
    useNullAsDefault: true,
    postProcessResponse,
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: '~/poohitan.com/cinema/back-end/cinema.sqlite3',
    },
    useNullAsDefault: true,
    postProcessResponse,
  },
};
