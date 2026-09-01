const axios = require('axios');
const NHENTAI_KEY = 'nhk_dQajaRA5Ob-8MDIeeYzjxwJ22ORkc9bUbqsxwLyJHjcWs50j';
const NHENTAI_HEADERS = {
    'Authorization': `Key ${NHENTAI_KEY}`,
    'User-Agent': 'AniHame/1.0'
};

async function test() {
  try {
    const res = await axios.get(`https://nhentai.net/api/v2/galleries?page=1`, { headers: NHENTAI_HEADERS });
    console.log(Object.keys(res.data));
  } catch(e) {
    console.error(e.message);
  }
}
test();
