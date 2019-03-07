exports.up = knex => knex.schema.createTable('Video', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.text('url').notNullable();

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('Video');
