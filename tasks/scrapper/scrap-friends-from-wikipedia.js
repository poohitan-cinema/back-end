const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

const url = 'https://uk.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA_%D0%B5%D0%BF%D1%96%D0%B7%D0%BE%D0%B4%D1%96%D0%B2_%D1%82%D0%B5%D0%BB%D0%B5%D1%81%D0%B5%D1%80%D1%96%D0%B0%D0%BB%D1%83_%C2%AB%D0%94%D1%80%D1%83%D0%B7%D1%96%C2%BB';

Promise.resolve()
  .then(async () => {
    const html = await request(url);
    const $ = cheerio.load(html);

    const tables = $('table.wikitable').slice(1);

    const data = tables.map(function parseTable(tableIndex) {
      const table = $(this);
      const rows = table.find('tr').slice(1);

      const rowsData = rows.map((rowIndex) => {
        if (rowIndex % 3 === 0) {
          const secondRow = rows.eq(rowIndex + 1);
          const thirdRow = rows.eq(rowIndex + 2);
          const secondRowCells = secondRow.find('td');
          const thirdRowCells = thirdRow.find('td');

          const episodeNumber = secondRowCells.eq(0).text().split('-')[1].trim();
          const episodeTitle = secondRowCells.eq(1).text().split('/')[1].trim().replace(/Росс/g, 'Рос');
          const episodeDescription = thirdRowCells.eq(0).text().trim().replace(/Росс/g, 'Рос');

          return {
            number: Number(episodeNumber),
            title: episodeTitle.slice(-1) === '.' ? episodeTitle.slice(0, -1) : episodeTitle,
            description: episodeDescription,
          };
        }

        return null;
      });

      return {
        season: tableIndex + 1,
        episodes: rowsData.get(),
      };
    });

    const filePath = path.resolve(__dirname, 'friends.json');

    return writeFile(filePath, JSON.stringify(data.get(), null, 2));
  })
  .then(() => console.log('Finished'))
  .catch(error => console.error(error))
  .then(() => process.exit(0));
