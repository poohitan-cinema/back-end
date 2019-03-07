exports.up = knex => knex.schema.createTable('Tag', (table) => {
  table.uuid('id').index().unique().notNullable();
  table.string('name').notNullable();
  table.string('slug').notNullable();
  table.timestamps(false, true);
});

exports.down = knex => knex.schema.dropTableIfExists('Tag');
