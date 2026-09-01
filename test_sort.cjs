const axios = require('axios');
const NHENTAI_KEY = 'nhk_dQajaRA5Ob-8MDIeeYzjxwJ22ORkc9bUbqsxwLyJHjcWs50j';
const NHENTAI_HEADERS = {
    'Authorization': `Key ${NHENTAI_KEY}`,
    'User-Agent': 'AniHame/1.0'
};

async function test() {
  try {
    const res = await axios.get(`https://nhentai.net/api/v2/search?query=english&sort=popular`, { headers: NHENTAI_HEADERS });
    console.log("With sort=popular:", res.data.result.map(g => g.id).slice(0, 5));
    
    const res2 = await axios.get(`https://nhentai.net/api/v2/search?query=english`, { headers: NHENTAI_HEADERS });
    console.log("Without sort:", res2.data.result.map(g => g.id).slice(0, 5));
  } catch(e) {
    console.error(e.message);
  }
}
test();
