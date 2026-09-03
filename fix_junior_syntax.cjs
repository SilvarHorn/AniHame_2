const fs = require('fs');
let apiContent = fs.readFileSync('api/index.ts', 'utf8');

const correctRoute = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
  try {
    const { anime, ep } = req.params;
    let formattedEp = ep;
    if (!isNaN(ep) && Number(ep) < 10) {
      formattedEp = '0' + Number(ep);
    }
    const Scraper = require("@docchi/scraping-anime-websites-poland").default;
    const result = await Scraper({
      folder: "hentai",
      anime: anime,
      episode: formattedEp,
      website: "junior"
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
});

app.post("/api/anilist"`;

// Remove the broken part starting from the app.get("/api/docchi to app.post("/api/anilist"
const badStart = apiContent.indexOf('app.get("/api/docchi');
const badEnd = apiContent.indexOf('app.post("/api/anilist"');

if (badStart !== -1 && badEnd !== -1) {
  apiContent = apiContent.substring(0, badStart) + correctRoute + apiContent.substring(badEnd + 'app.post("/api/anilist"'.length);
}

fs.writeFileSync('api/index.ts', apiContent);
