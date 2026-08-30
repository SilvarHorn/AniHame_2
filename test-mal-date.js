import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://myanimelist.net/anime/1/a/episode', {
  validateStatus: () => true,
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(res => {
  const $ = cheerio.load(res.data);
  const eps = [];
  $('table.episode_list tbody tr.episode-list-data').each((i, el) => {
    const num = $(el).find('td.episode-number').text().trim();
    const title = $(el).find('td.episode-title a.fl-l.fw-b').text().trim();
    const aired = $(el).find('td.episode-aired').text().trim();
    eps.push({ num, title, aired });
  });
  console.log(eps.slice(0, 3));
});
