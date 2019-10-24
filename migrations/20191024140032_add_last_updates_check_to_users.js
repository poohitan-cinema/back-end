exports.up = knex => knex.schema.table('User', (table) => {
  table.timestamp('checkedUpdatesAt');
});

exports.down = knex => knex.schema.table('User', (table) => {
  table.dropColumn('checkedUpdatesAt');
});
