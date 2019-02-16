
exports.up = knex => knex.schema.createTable('episodes', (table) => {
  table.increments('id');
  table.integer('number').unsigned().notNullable();
  table.text('title');
  table.text('url');
  table.timestamps(false, true);

  table.integer('season_id').unsigned().notNullable();
  table.foreign('season_id').references('id').inTable('seasons');
});

exports.down = knex => knex.schema.dropTableIfExists('episodes');
