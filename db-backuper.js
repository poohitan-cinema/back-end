const { CronJob } = require('cron');

const backup = require('./utils/backup-db');

const job = new CronJob('0 0 8 * * *', () => {
  backup();
}, null, false, 'Europe/Uzhgorod');

job.start();
