const fs = require('fs');

let content = fs.readFileSync('src/api/index.ts', 'utf8');

const apiString = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
  try {
    const { anime, ep } = req.params;
    const Scraper = require("@docchi/scraping-anime-websites-poland").default;
    const result = await Scraper({
      anime: anime,
      episode: ep,
      website: "docchi"
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message });
  }
});

app.post("/api/anilist"`;

content = content.replace('app.post("/api/anilist"', apiString);

fs.writeFileSync('src/api/index.ts', content);
