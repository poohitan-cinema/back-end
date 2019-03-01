exports.up = knex => knex.schema.renameTable('new_movies', 'movies');

exports.down = knex => knex.schema.renameTable('movies', 'new_movies');
