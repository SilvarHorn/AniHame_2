const fs = require('fs');

// 1. Add docchi endpoint to the REAL api router (api/index.ts)
let apiContent = fs.readFileSync('api/index.ts', 'utf8');
if (!apiContent.includes('/api/docchi')) {
  const docchiRoute = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
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
  apiContent = apiContent.replace('app.post("/api/anilist"', docchiRoute);
  fs.writeFileSync('api/index.ts', apiContent);
}

// 2. Fix empty iframe src in Watch.tsx
let watchContent = fs.readFileSync('src/pages/Watch.tsx', 'utf8');
watchContent = watchContent.replace(
  'src={iframeUrl}',
  'src={iframeUrl || undefined}'
);
fs.writeFileSync('src/pages/Watch.tsx', watchContent);
console.log('Fixed backend route and iframe src.');
