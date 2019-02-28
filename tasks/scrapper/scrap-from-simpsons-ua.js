const { argv } = require('yargs');
const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

const { serial: serialSlug, url: dataUrl } = argv;
const SEASON_URL_REGEX = /sezon-(\d+)\//;

if (!(serialSlug && dataUrl)) {
  console.log('You must provide --serial and --url params. Example: --serial %SERIAL_SLUG% --url %DATA_URL%');

  process.exit(1);

  return;
}

async function scrapSeason(url) {
  console.log(`Scrapping ${url}...`);

  const html = await request(url);
  const $ = cheerio.load(html);

  const links = $('figure');

  return links.map(function parse(index) {
    const title = $(this).find('.description_popup .nazva').text();
    const description = $(this).find('.description_popup .descr').not('.nazva').text();

    return { number: index + 1, title, description };
  })
    .get();
}

request(dataUrl)
  .then(async (html) => {
    const $ = cheerio.load(html);

    const seasonUrls = $('figure a')
      .map((index, element) => element.attribs.href)
      .get()
      .filter(url => SEASON_URL_REGEX.test(url))
      .reverse();

    const result = [];

    await seasonUrls.reduce((promiseChain, url) => promiseChain.then(
      () => new Promise((resolve) => {
        setTimeout(() => scrapSeason(url)
          .then((data) => {
            const seasonNumberMatches = url.match(SEASON_URL_REGEX);
            const seasonNumber = seasonNumberMatches ? seasonNumberMatches[1] : null;

            result.push({
              season: Number(seasonNumber),
              episodes: data,
            });

            resolve();
          }),
        1000);
      }),
    ), Promise.resolve());

    return result;
  })
  .then((data) => {
    const filePath = path.resolve(__dirname, `${serialSlug}.json`);

    return writeFile(filePath, JSON.stringify(data, null, 2));
  })
  .then(() => console.log('Finished'))
  .catch(error => console.error(error))
  .then(() => process.exit(0));
