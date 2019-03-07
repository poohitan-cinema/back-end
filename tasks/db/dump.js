const fs = require('fs');
const util = require('util');
const path = require('path');

const writeFile = util.promisify(fs.writeFile);

const DB = require('../../services/db');

async function dump() {
  const tablesList = await DB
    .select('name')
    .from('sqlite_master')
    .whereRaw('type =\'table\' AND name NOT LIKE \'sqlite_%\'')
    .map(item => item.name);

  return Promise.all(
    tablesList.map(async (tableName) => {
      const tableData = await DB(tableName);

      return { [tableName]: tableData };
    }),
  )
    .then(data => data.reduce((accumulator, item) => ({ ...accumulator, ...item }), {}));
}

dump()
  .then((data) => {
    const filename = path.resolve(__dirname, '../dump.json');

    return writeFile(filename, JSON.stringify(data, null, 2));
  })
  .then(() => console.log('Finished'))
  .then(() => process.exit(0));
