exports.up = knex => knex.schema.table('movies', (table) => {
  table.integer('video_id').unsigned();
  table.foreign('video_id').references('id').inTable('videos');
});

exports.down = knex => knex.schema.table('movies', (table) => {
  table.dropColumn('video_id');
  table.dropForeign('video_id');
});
