const axios = require('axios');
async function test() {
  try {
    const seriesRes = await axios.get('https://api.docchi.pl/v1/series?limit=10');
    console.log('Total series:', seriesRes.data.length);
  } catch(e) { console.log(e.message); }
}
test();
