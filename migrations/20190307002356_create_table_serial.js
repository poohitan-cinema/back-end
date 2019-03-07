exports.up = knex => knex.schema.createTable('Serial', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('slug').unique().index().notNullable();
  table.string('title').notNullable();
  table.text('icon');
  table.text('cover');
  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('Serial');
