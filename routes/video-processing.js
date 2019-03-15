const HTTPStatus = require('http-status-codes');
const Torrent = require('../services/torrent');
const VideoProcessor = require('../services/video-processor');
const Auth = require('../services/authentication');

const currentJobs = {};

const router = async (fastify) => {
  fastify.post('/parse-torrent-content', { preHandler: Auth.checkAdminRights }, async (request) => {
    const { files } = request.raw;

    const file = files.torrent.data;
    const torrentContentMap = await Torrent.getContentTree(file);

    return torrentContentMap;
  });

  fastify.post('/start-job', async (request) => {
    const { files } = request.raw;
    const torrent = files.torrent.data;

    const job = VideoProcessor.createJob({
      torrent,
    });

    currentJobs[job.id] = job;

    job.start();
  });

  fastify.get('/job-progress/:job_id', async (request, reply) => {
    const jobId = request.params.job_id;
    const job = currentJobs[jobId];

    if (!job) {
      reply.code(HTTPStatus.NOT_FOUND);

      throw new Error('Немає завдання з таким ідентифікатором.');
    }

    const { info } = job;

    if (info.status === 'finished') {
      delete currentJobs[jobId];
    }

    return info;
  });
};

module.exports = router;
