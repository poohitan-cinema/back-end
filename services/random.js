function number({ min = 0, max = 1, integer = false }) {
  const random = Math.random() * (max - min) + min;

  return integer ? Math.round(random) : random;
}

function arrayElement(array) {
  const randomIndex = number({ min: 0, max: array.length - 1, integer: true });

  return array[randomIndex];
}

module.exports = {
  number,
  arrayElement,
};
