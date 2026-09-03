const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.docchi.pl/v1/search?query=overflow'); // Try search
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.status + ' ' + e.response.statusText : e.message);
  }
}
test();
