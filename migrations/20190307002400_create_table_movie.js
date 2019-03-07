exports.up = knex => knex.schema.createTable('Movie', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('slug').unique().index().notNullable();
  table.text('title').notNullable();
  table.text('description');
  table.text('cover');
  table.text('icon');

  table.uuid('video_id');
  table.foreign('video_id').references('id').inTable('Video');

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('Movie');
