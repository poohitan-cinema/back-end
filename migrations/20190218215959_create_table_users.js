exports.up = knex => knex.schema.createTable('users', (table) => {
  table.increments('id');
  table.string('name').unique().index().notNullable();
  table.text('password').notNullable();
  table.string('role');
  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('users');
