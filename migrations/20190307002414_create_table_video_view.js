exports.up = knex => knex.schema.createTable('VideoView', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.float('end_time');

  table.uuid('user_id').notNullable();
  table.foreign('user_id').references('id').inTable('User');

  table.uuid('video_id').notNullable();
  table.foreign('video_id').references('id').inTable('Video');

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('VideoView');
