const axios = require('axios');
async function test() {
  try {
    const res = await axios.get(`https://nhentai.net/api/v2/galleries/677286`, {
      headers: { 'Authorization': 'Key nhk_fRMH-nP5PSYt3Y3x5o4XZecYQY-19jK6it-5MHjtVONElYxm' }
    });
    console.log(JSON.stringify(res.data, null, 2).substring(0, 1500));
  } catch(e) { console.error(e.message); }
}
test();
