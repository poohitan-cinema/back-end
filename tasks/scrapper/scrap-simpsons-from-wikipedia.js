const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const util = require('util');

const SEASONS_COUNT = 30;

const writeFile = util.promisify(fs.writeFile);

async function scrapSeason(number) {
  const url = `https://uk.wikipedia.org/wiki/%D0%A1%D1%96%D0%BC%D0%BF%D1%81%D0%BE%D0%BD%D0%B8_(%D1%81%D0%B5%D0%B7%D0%BE%D0%BD_${number})`;

  console.log(`Scrapping ${url}...`);

  const html = await request(url);
  const $ = cheerio.load(html);

  const rows = $('table.wikiepisodetable tr').slice(1);

  const parsedData = rows.map(function parse() {
    const row = $(this);
    const cells = row.find('td');

    if (cells.length === 1) {
      const fullDescription = cells.eq(0).text();
      const [description] = fullDescription.split('\n\n');

      return { description: description.trim() };
    }

    const episodeNumber = cells.eq(1).text().trim();
    const titles = cells.eq(2).text();
    const matches = titles.match(/«.+» (.+)$/);
    const ukrainianTitle = matches[1].trim();

    return { episodeNumber, title: ukrainianTitle };
  });

  const episodes = [];

  for (let i = 0; i < parsedData.length; i += 2) {
    const { episodeNumber, title } = parsedData[i];
    const { description } = parsedData[i + 1];

    episodes.push({
      number: episodeNumber,
      title,
      description,
    });
  }

  return { season: number, episodes };
}

Promise.resolve()
  .then(() => {
    const data = [];

    return Array.from({ length: SEASONS_COUNT })
      .reduce((promiseChain, item, index) => promiseChain.then(() => new Promise((resolve) => {
        setTimeout(() => scrapSeason(index + 1).then((season) => {
          data.push(season);
          resolve();
        }), 1000);
      })), Promise.resolve())
      .then(() => {
        const filePath = path.resolve(__dirname, 'the-simpsons.json');

        return writeFile(filePath, JSON.stringify(data, null, 2));
      });
  })
  .then(() => console.log('Finished'))
  .catch(error => console.error(error))
  .then(() => process.exit(0));
