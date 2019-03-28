const WebTorrent = require('webtorrent');
const _ = require('lodash');

const client = new WebTorrent();

function parsePath(path, parent = '') {
  const items = path.split('/');

  return items.map((name, index, array) => {
    const isLeaf = array.indexOf(name) === array.length - 1;
    const type = isLeaf ? 'file' : 'directory';

    const pathBefore = path.slice(0, path.indexOf(name)).slice(0, -1);
    const pathToThis = `${parent}/${pathBefore}/${name}`.replace(/\/\//g, '/');

    const token = {
      name,
      type,
      parent: `/${pathBefore}`,
      path: pathToThis,
    };

    return token;
  });
}

function removeFromArray(array, itemsToRemove) {
  return array.filter(item => !itemsToRemove.includes(item));
}

function generateTreeFromPath(path) {
  const [root, ...rest] = path.split('/');

  if (rest.length === 0) {
    return [{ name: root, selected: true }];
  }

  return { [root]: generateTreeFromPath(rest.join('/')) };
}

function mergeCustomizer(objValue, srcValue) { // eslint-disable-line
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

function convertFilelistToTree(filelist) {
  return filelist.reduce((accumulator, path) => {
    const subTree = generateTreeFromPath(path);

    return _.mergeWith({}, accumulator, subTree, mergeCustomizer);
  }, {});
}

async function getContentList(torrentFile) {
  return new Promise((resolve, reject) => {
    let fileList = [];

    client.on('error', reject);

    client.add(torrentFile, (torrent) => {
      fileList = torrent.files.map(file => file.path);

      torrent.destroy();

      resolve(fileList);
    });
  });
}

function convertFileListToTree(filelist) {
  const tokensList = filelist.reduce((accumulator, path) => {
    const tokens = parsePath(path);

    return accumulator.concat(tokens);
  }, []);

  let tokensWithUniquePathes = tokensList.filter((token, index, array) => {
    const firstTokenWithThisPath = array.find(elem => elem.path === token.path);
    const indexOfFirstTokenWithThisPath = array.indexOf(firstTokenWithThisPath);

    return array.indexOf(token) === indexOfFirstTokenWithThisPath;
  });

  const tree = tokensWithUniquePathes.find(token => token.parent === '/');
  let currentLeaves = [tree];

  tokensWithUniquePathes = removeFromArray(tokensWithUniquePathes, [tree]);

  while (tokensWithUniquePathes.length) {
    const newCurrentLeaves = [];

    currentLeaves.forEach((leaf) => { // eslint-disable-line
      if (leaf.type === 'file') {
        return;
      }

      leaf.children = leaf.children || []; // eslint-disable-line

      const newChildren = tokensWithUniquePathes.filter(token => token.parent === leaf.path);

      leaf.children.push(...newChildren);
      newCurrentLeaves.push(...newChildren);

      tokensWithUniquePathes = removeFromArray(tokensWithUniquePathes, newChildren);
    });

    currentLeaves = newCurrentLeaves;
  }

  return tree;
}

async function getContentTree(torrentFile) {
  const contentList = await getContentList(torrentFile);

  return convertFileListToTree(contentList);
}

module.exports = {
  getContentList,
  getContentTree,
  convertFilelistToTree,
};
