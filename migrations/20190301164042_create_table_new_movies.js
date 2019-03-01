exports.up = knex => knex.schema.createTable('new_movies', (table) => {
  table.increments('id');
  table.string('slug').unique().index().notNullable();
  table.text('title').notNullable();
  table.text('description');
  table.text('cover');
  table.text('icon');
  table.text('url').notNullable();

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('new_movies');
