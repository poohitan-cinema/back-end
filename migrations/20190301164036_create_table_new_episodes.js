exports.up = knex => knex.schema.createTable('new_episodes', (table) => {
  table.increments('id');
  table.string('number').notNullable();
  table.text('title');
  table.text('description');
  table.timestamps(false, true);

  table.integer('season_id').unsigned().notNullable();
  table.foreign('season_id').references('id').inTable('seasons');

  table.integer('video_id').unsigned();
  table.foreign('video_id').references('id').inTable('videos');
});

exports.down = knex => knex.schema.dropTableIfExists('new_episodes');
