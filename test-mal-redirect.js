import axios from 'axios';
import * as cheerio from 'cheerio';
axios.get('https://myanimelist.net/anime/1/a/episode?offset=0', {
  validateStatus: () => true,
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(res => {
  const $ = cheerio.load(res.data);
  console.log($('table.episode_list').length);
});
