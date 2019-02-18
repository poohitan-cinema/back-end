const jwt = require('jsonwebtoken');

const config = require('../config');

module.exports = (request) => {
  const { token } = request.cookies;

  if (!token) {
    throw new Error('Not authenticated');
  }

  return jwt.verify(token, config.jwtSecret);
};
