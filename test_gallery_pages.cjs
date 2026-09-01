const axios = require('axios');
async function test() {
  try {
    const res = await axios.get(`https://nhentai.net/api/v2/galleries/677286`, {
      headers: { 'Authorization': 'Key nhk_fRMH-nP5PSYt3Y3x5o4XZecYQY-19jK6it-5MHjtVONElYxm' }
    });
    console.log("pages available?", !!res.data.pages);
    if (res.data.pages) {
      console.log(JSON.stringify(res.data.pages.slice(0, 3), null, 2));
    }
  } catch(e) { console.error(e.message); }
}
test();
