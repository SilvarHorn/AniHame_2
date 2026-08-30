import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://myanimelist.net/anime/1/Cowboy_Bebop/episode', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(res => {
  const $ = cheerio.load(res.data);
  const eps = [];
  $('table.episode_list tbody tr.episode-list-data').each((i, el) => {
    const epNum = $(el).find('td.episode-number').text().trim();
    const title = $(el).find('td.episode-title a.fl-l.fw-b').text().trim();
    if(epNum && title) eps.push({ num: parseInt(epNum), title });
  });
  console.log(eps.slice(0, 5));
}).catch(err => console.log(err.message));
