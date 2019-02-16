const Case = require('case');

module.exports = (data, desiredCase) => {
  if (!data) {
    return data;
  }

  return Object.keys(data).reduce((result, key) => {
    const transformedKey = Case[desiredCase](key);
    const value = data[key];

    return Object.assign({}, result, {
      [transformedKey]: value,
    });
  }, {});
};
