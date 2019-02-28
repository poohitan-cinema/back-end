exports.up = knex => knex.schema.createTable('new_episodes', (table) => {
  table.increments('id');
  table.string('number').notNullable();
  table.text('title');
  table.text('description');
  table.text('url');
  table.timestamps(false, true);

  table.integer('season_id').unsigned().notNullable();
  table.foreign('season_id').references('id').inTable('seasons');
});

exports.down = knex => knex.schema.dropTableIfExists('new_episodes');
