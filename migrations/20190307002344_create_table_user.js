exports.up = knex => knex.schema.createTable('User', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('name').unique().index().notNullable();
  table.string('password').notNullable();
  table.string('role');
  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('User');
