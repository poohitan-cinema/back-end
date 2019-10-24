const moment = require('moment');
const DB = require('../services/db');

module.exports = async (user, timestampName) => {
  if (!user) {
    return Promise.resolve();
  }

  return DB('User')
    .update({
      [timestampName]: moment().format('YYYY-MM-DD HH:mm:ss'),
    })
    .where({ id: user.id });
};
