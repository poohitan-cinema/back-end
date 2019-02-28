exports.up = knex => knex.schema.createTable('serials', (table) => {
  table.increments('id');
  table.string('slug').unique().index().notNullable();
  table.string('title').notNullable();
  table.text('icon');
  table.text('cover');
  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('serials');
