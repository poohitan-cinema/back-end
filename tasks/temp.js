const DB = require('../services/db');
const wtf = require('../helpers/get-static-content-url');

DB('videos')
  .then(videos => Promise.all(
    videos.map(video => DB('videos').update({ url: wtf(video.url) }).where({ id: video.id })),
  ))
  .then(() => process.exit(0));
