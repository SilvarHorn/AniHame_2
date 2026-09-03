const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.docchi.pl/v1/series/related/50582');
    console.log("50582 result:", res.data);
  } catch(e) {
    console.log("50582 error:", e.response ? e.response.status : e.message);
  }
}
test();
