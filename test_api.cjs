const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/docchi/overflow/1');
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
