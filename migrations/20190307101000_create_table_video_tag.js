exports.up = knex => knex.schema.createTable('VideoTag', (table) => {
  table.uuid('id').index().unique().notNullable();

  table.uuid('tag_id').notNullable();
  table.foreign('tag_id').references('id').inTable('Tag');

  table.uuid('video_id').notNullable();
  table.foreign('video_id').references('id').inTable('Video');

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('VideoTag');
