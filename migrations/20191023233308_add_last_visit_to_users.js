exports.up = knex => knex.schema.table('User', (table) => {
  table.timestamp('lastVisitedAt');
});

exports.down = knex => knex.schema.table('User', (table) => {
  table.dropColumn('lastVisitedAt');
});
