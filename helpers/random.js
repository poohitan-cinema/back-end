module.exports = ({ min = 0, max = 1, integer = false }) => {
  const random = Math.random() * (max - min) + min;

  return integer ? Math.round(random) : random;
};
