
exports.up = knex => knex.schema.table('episodes', (table) => {
  table.string('description');
});

exports.down = knex => knex.schema.table('episodes', (table) => {
  table.dropColumn('description');
});
