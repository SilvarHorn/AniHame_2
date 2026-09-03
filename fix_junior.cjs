const fs = require('fs');

let apiContent = fs.readFileSync('api/index.ts', 'utf8');

const juniorRoute = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
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
});`;

const regex = /app\.get\("\/api\/docchi\/:anime\/:ep"[\s\S]*?\}\);\n/;
apiContent = apiContent.replace(regex, juniorRoute + '\n');
fs.writeFileSync('api/index.ts', apiContent);
console.log('Fixed docchi to use junior with folder hentai.');
