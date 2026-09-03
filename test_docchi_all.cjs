const axios = require('axios');
async function test() {
  try {
    const seriesRes = await axios.get('https://api.docchi.pl/v1/series/all?limit=1');
    console.log('All limit 1 works?');
  } catch(e) { console.log(e.message); }
}
test();
