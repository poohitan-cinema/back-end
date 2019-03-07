exports.up = knex => knex.schema.createTable('Season', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('number').notNullable();
  table.text('cover');
  table.timestamps(false, true);

  table.uuid('serial_id').notNullable();
  table.foreign('serial_id').references('id').inTable('Serial');
});

exports.down = knex => knex.schema.dropTableIfExists('Season');
