const axios = require('axios');
async function test() {
    const malId = "40746";
    let docchiSlug = malId;
    const seriesRes = await axios.get('https://api.docchi.pl/v1/series/hentai?limit=10000');
    if (Array.isArray(seriesRes.data)) {
        const found = seriesRes.data.find(s => s.mal_id === parseInt(malId));
        if (found && found.slug) {
            docchiSlug = found.slug;
        }
    }
    console.log('docchiSlug is', docchiSlug);
}
test();
