exports.up = knex => knex.schema.renameTable('new_episodes', 'episodes');

exports.down = knex => knex.schema.renameTable('episodes', 'new_episodes');
