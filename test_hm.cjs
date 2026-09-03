const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    const titles = ["Kanojo Saimin"];
    for (const title of titles) {
        if (!title) continue;
        const formattedName = title.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
        console.log("formattedName:", formattedName);
        const url = `https://hentaimama.io/episodes/${formattedName}-2/`;
        try {
            const response = await axios.get(url, {
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            console.log(response.status);
            if (response.status === 200) {
                const html = response.data;
                const $ = cheerio.load(html);
                const iframeSrc = $('#option-1 iframe').attr('src');
                if (iframeSrc) {
                    console.log("Found:", iframeSrc);
                    return;
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}
test();
