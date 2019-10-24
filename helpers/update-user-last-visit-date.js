const moment = require('moment');
const DB = require('../services/db');

module.exports = async (user) => {
  if (!user) {
    return Promise.resolve();
  }

  return DB('User')
    .update({ lastVisitedAt: moment().format('YYYY-MM-DD HH:mm:ss') })
    .where({ id: user.id });
};
