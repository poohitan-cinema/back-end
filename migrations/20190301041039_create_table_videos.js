exports.up = knex => knex.schema.createTable('videos', (table) => {
  table.increments('id');
  table.text('url').notNullable().defaultTo('');

  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('videos');
