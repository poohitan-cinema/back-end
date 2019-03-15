const uuid = require('uuid');
const Torrent = require('./torrent');
const ffmpeg = require('./ffmpeg');

function createJob(torrent) {
  const id = uuid.v4();
  let info = {
    status: 'pending',
  };

  return {
    id,
    info,
    async start() {
      const files = await Torrent.startDownload(torrent);

      for (file in files) {
        const stream = file.createReadStream();


      }
    },
  };
}
