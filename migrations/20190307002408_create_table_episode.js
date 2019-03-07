exports.up = knex => knex.schema.createTable('Episode', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('number').notNullable();
  table.text('title');
  table.text('description');
  table.timestamps(false, true);

  table.uuid('season_id').notNullable();
  table.foreign('season_id').references('id').inTable('Season');

  table.uuid('video_id');
  table.foreign('video_id').references('id').inTable('Video');
});

exports.down = knex => knex.schema.dropTableIfExists('Episode');
