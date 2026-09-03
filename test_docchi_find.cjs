const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.docchi.pl/v1/series/find/mal_id/40658'); // Try to find by mal_id
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.status + ' ' + e.response.statusText : e.message);
  }
}
test();
