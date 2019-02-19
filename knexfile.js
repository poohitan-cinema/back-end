const path = require('path');
const transformColumnNamesCase = require('./helpers/transform-column-names-case');

function postProcessResponse(result) {
  if (Array.isArray(result)) {
    return result.map(row => transformColumnNamesCase(row, 'camel'));
  }

  return transformColumnNamesCase(result, 'camel');
}

const pathToDB = path.resolve(__dirname, '../cinema.sqlite3');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: pathToDB,
    },
    useNullAsDefault: true,
    postProcessResponse,
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: pathToDB,
    },
    useNullAsDefault: true,
    postProcessResponse,
  },
};
