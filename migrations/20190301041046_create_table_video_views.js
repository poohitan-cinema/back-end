exports.up = knex => knex.schema.createTable('video_views', (table) => {
  table.increments('id');
  table.float('duration');

  table.integer('user_id').unsigned().notNullable();
  table.foreign('user_id').references('id').inTable('users');

  table.integer('video_id').unsigned().notNullable();
  table.foreign('video_id').references('id').inTable('videos');

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('video_views');
