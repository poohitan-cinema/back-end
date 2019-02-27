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

function fixTitleCase(title) {
  const exceptions = [
    'і', 'й', 'та', 'у', 'в', 'о', 'об', 'або', 'не', 'а', 'як', 'яка', 'який', 'якого', 'яке', 'які', 'яку', 'що', 'на',
    'біля', 'про', 'без', 'від', 'для', 'по', 'через', 'при', 'над', 'під', 'до', 'з', 'із', 'як', 'за', 'але',
    'би', 'б', 'хоча', 'це', 'його', 'її', 'мій', 'моя', 'мої', 'моє', 'їх', 'наші', 'ваші',
  ];
  const romanNumeralsRegex = /^[IXVCMLDІХМ]+$/i;

  const fixedTitle = title
    .split(' ')
    .map((word, index, array) => {
      const isFirstWord = index === 0;
      const isLastWord = index === array.length - 1;

      if (exceptions.includes(word.toLowerCase()) && !isFirstWord && !isLastWord) {
        return word.toLowerCase();
      }

      if (romanNumeralsRegex.test(word)) {
        return word.toUpperCase();
      }

      const [firstLetter, ...rest] = word;

      return [
        firstLetter.toUpperCase(),
        rest.join('').toLowerCase(),
      ].join('');
    })
    .join(' ');

  if (title !== fixedTitle) {
    console.log(`Fixed episode title from "${title}" to "${fixedTitle}"`);
  }

  return fixedTitle;
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
                title: fixTitleCase(title),
                description,
                number,
                season_id: season.id,
              });
          }

          console.log(`Updating episode ${number} in season ${seasonNumber}...`);

          return DB('episodes')
            .update({ title: fixTitleCase(title), description })
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
