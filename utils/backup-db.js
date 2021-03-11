const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');

const config = require('../config');

const { spaces } = config.digitalOcean;

const spacesEndpoint = new AWS.Endpoint(spaces.endpoint);
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  endpoint: spacesEndpoint,
});

const BACKUP_FOLDER = 'database-backups';
const BACKUPS_MAX_COUNT = 10;

async function deleteRedundantBackups() {
  try {
    const { Contents: currentFiles } = await s3.listObjectsV2({
      Bucket: spaces.name,
      Prefix: BACKUP_FOLDER,
    })
      .promise();

    const nonEmptyFiles = currentFiles.filter(file => file.Size > 0);

    if (nonEmptyFiles.length < BACKUPS_MAX_COUNT) {
      return;
    }

    const filesSortedByCreationDateASC = nonEmptyFiles.sort((left, right) => {
      if (left.LastModified > right.LastModified) {
        return 1;
      }

      if (left.LastModified < right.LastModified) {
        return -1;
      }

      return 0;
    });

    const redundantFiles = filesSortedByCreationDateASC
      .slice(0, nonEmptyFiles.length - BACKUPS_MAX_COUNT);

    await s3.deleteObjects({
      Bucket: spaces.name,
      Delete: {
        Objects: redundantFiles.map(file => ({ Key: file.Key })),
      },
    })
      .promise();

    console.log(`Removed ${redundantFiles.length} redundant backups: ${redundantFiles.map(file => file.Key).join(', ')}`);
  } catch (error) {
    console.error(error);
  }
}

async function uploadNewBackup() {
  try {
    const pathToDB = config.db.connection.filename;
    const filename = path.basename(pathToDB);
    const dbFile = await fs.readFile(pathToDB);

    const data = await s3.upload({
      Body: dbFile,
      Bucket: spaces.name,
      Key: `${BACKUP_FOLDER}/${Date.now()}_${filename}`,
    })
      .promise();

    console.log(`Successfully created backup: ${data.Key}`);
  } catch (error) {
    console.error(error);
  }
}

async function backup() {
  await uploadNewBackup();
  await deleteRedundantBackups();
}

module.exports = backup;
