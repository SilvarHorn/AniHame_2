const express = require('express');
const app = express();

const Scraper = require("@docchi/scraping-anime-websites-poland").default;

app.get("/test", async (req, res) => {
    let ep = "1";
    let formattedEp = ep;
    if (!isNaN(ep) && Number(ep) < 10) {
      formattedEp = '0' + Number(ep);
    }
    const result = await Scraper({
      folder: "hentai",
      anime: "overflow",
      episode: formattedEp,
      website: "junior"
    });
    res.json(result);
});
app.listen(3001, () => {
    require('http').get('http://localhost:3001/test', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(data);
            process.exit(0);
        });
    });
});
