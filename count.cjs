const axios = require('axios');
async function test() {
  const res = await axios.get('https://api.docchi.pl/v1/series/hentai?limit=10000');
  console.log(res.data.length);
}
test();
