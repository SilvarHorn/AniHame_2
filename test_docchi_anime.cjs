const axios = require('axios');
async function test() {
  try {
    const seriesRes = await axios.get('https://api.docchi.pl/v1/series/anime?limit=10000');
    console.log('Total anime series:', seriesRes.data.length);
  } catch(e) { console.log(e.message); }
}
test();
