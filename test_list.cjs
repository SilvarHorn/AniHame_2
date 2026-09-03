const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.docchi.pl/v1/series/hentai?limit=10000');
    const series = res.data.find(s => s.title.toLowerCase().includes('overflow') || s.slug.includes('overflow'));
    console.log(series);
  } catch (e) {
    console.error(e.response ? e.response.status + ' ' + e.response.statusText : e.message);
  }
}
test();
