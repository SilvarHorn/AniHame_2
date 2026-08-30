import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://myanimelist.net/anime/1', {
  validateStatus: () => true,
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(res => {
  const $ = cheerio.load(res.data);
  let type = '';
  $('div.spaceit_pad').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Type:')) {
      type = $(el).find('a').text().trim() || text.replace('Type:', '').trim();
    }
  });
  console.log("Type:", type);
});
