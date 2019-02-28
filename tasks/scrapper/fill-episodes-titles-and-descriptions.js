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
      const [season] = await DB('seasons')
        .where({
          serial_id: serial.id,
          number: seasonNumber,
        });

      if (!season) {
        return Promise.resolve();
      }

      return Promise.all(
        episodes.map(async ({ number, title, description }) => {
          const [episode] = await DB('episodes').where({ season_id: season.id, number });

          if (!episode) {
            console.log(`Creating episode ${number} in season ${seasonNumber}...`);

            return DB('episodes')
              .insert({
                title,
                description,
                number,
                season_id: season.id,
              });
          }

          console.log(`Updating episode ${number} in season ${seasonNumber}...`);

          return DB('episodes')
            .update({ title, description })
            .where({ season_id: season.id, number });
        }),
      );
    }),
  );
}

DB('serials')
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
