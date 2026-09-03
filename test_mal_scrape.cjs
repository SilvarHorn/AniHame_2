const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const response = await axios.get('https://myanimelist.net/anime/51723');
  const $ = cheerio.load(response.data);
  const title = $('meta[property="og:title"]').attr('content') || $('h1.title-name strong').text().trim();
  console.log(title);
}
test();
