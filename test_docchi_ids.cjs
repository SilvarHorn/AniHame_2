const axios = require('axios');
async function test() {
  try {
    const seriesRes = await axios.get('https://api.docchi.pl/v1/series/hentai?limit=10000');
    console.log('Total hentai series:', seriesRes.data.length);
    console.log('Sample:', seriesRes.data.slice(0, 3).map(s => s.mal_id + ' -> ' + s.slug));
  } catch(e) { console.log(e.message); }
}
test();
