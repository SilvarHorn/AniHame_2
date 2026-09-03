const axios = require('axios');
async function test() {
  try {
    const malId = 51723; // example hentai
    // 1. Get from docchi by malId
    try {
      const docchiRes = await axios.get(`https://api.docchi.pl/v1/series/related/${malId}`);
      console.log("Docchi by malId:", docchiRes.data);
    } catch(e) {
      console.log("Docchi by malId error:", e.response ? e.response.status : e.message);
    }
    
    // 2. Get from jikan
    const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`);
    const title = jikanRes.data.data.title;
    console.log("Jikan Title:", title);
    
    // 3. Get from docchi by title
    try {
      const docchiRes2 = await axios.get(`https://api.docchi.pl/v1/series/related/${encodeURIComponent(title)}`);
      console.log("Docchi by title:", docchiRes2.data);
    } catch(e) {
      console.log("Docchi by title error:", e.response ? e.response.status : e.message);
    }
  } catch (e) {
    console.error(e.message);
  }
}
test();
