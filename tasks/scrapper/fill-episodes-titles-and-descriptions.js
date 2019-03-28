const { argv } = require('yargs');
const fs = require('fs');
const util = require('util');
const path = require('path');
const DB = require('../../services/db');

const readFile = util.promisify(fs.readFile);

const { serial: serialSlugOrId } = argv;

if (!serialSlugOrId) {
  console.log('You must provide --serial param. Example: --serial %SERIAL_SLUG_OR_ID%');

  process.exit(1);

  return;
}

function fillSerialWithData(serial, data) {
  return Promise.all(
    data.map(async ({ season: seasonNumber, episodes }) => {
      const [season] = await DB('Season')
        .where({
          serial_id: serial.id,
          number: seasonNumber,
        });

      if (!season) {
        return Promise.resolve();
      }

      return Promise.all(
        episodes.map(async ({ number, title, description }) => {
          const [episode] = await DB('Episode').where({ season_id: season.id, number });

          if (!episode) {
            console.log(`Creating episode ${number} in season ${seasonNumber}...`);

            return DB('Episode')
              .insert({
                title,
                description,
                number,
                season_id: season.id,
              })
              .catch((error) => {
                console.log(`Failed to create episode ${number} in season ${seasonNumber}`);
                console.error(error);
              });
          }

          console.log(`Updating episode ${number} in season ${seasonNumber}...`);

          return DB('Episode')
            .update({ title, description })
            .where({ season_id: season.id, number })
            .catch((error) => {
              console.log(`Failed to update episode ${number} in season ${seasonNumber}`);
              console.error(error);
            });
        }),
      );
    }),
  );
}

DB('Serial')
  .where({ id: serialSlugOrId })
  .orWhere({ slug: serialSlugOrId })
  .then(async ([serial]) => {
    const filePath = path.resolve(__dirname, `./${serial.slug}.json`);
    const data = await readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(data);

    return fillSerialWithData(serial, parsedData);
  })
  .then(() => console.log('Finished'))
  .catch(error => console.error(error))
  .then(() => process.exit(0));
