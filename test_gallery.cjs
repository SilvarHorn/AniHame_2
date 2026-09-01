const axios = require('axios');
async function test() {
  try {
    const res = await axios.get(`https://nhentai.net/api/v2/galleries/popular`, {
      headers: { 'Authorization': 'Key nhk_fRMH-nP5PSYt3Y3x5o4XZecYQY-19jK6it-5MHjtVONElYxm' }
    });
    if (res.data.result && res.data.result.length > 0) {
      const g = res.data.result[0];
      console.log("images object:", JSON.stringify(g.images, null, 2));
    } else {
      console.log(JSON.stringify(res.data.slice(0,1), null, 2));
    }
  } catch(e) { console.error(e.message); }
}
test();
