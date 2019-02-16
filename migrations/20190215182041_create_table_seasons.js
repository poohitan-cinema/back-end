
exports.up = knex => knex.schema.createTable('seasons', (table) => {
  table.increments('id');
  table.integer('number').unsigned().notNullable();
  table.text('cover');
  table.timestamps(false, true);

  table.integer('serial_id').unsigned().notNullable();
  table.foreign('serial_id').references('id').inTable('serials');
});

exports.down = knex => knex.schema.dropTableIfExists('seasons');
