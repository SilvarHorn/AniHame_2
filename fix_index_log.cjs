const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const docchiRoute = `app.get("/api/docchi/:malId/:ep", async (req, res) => {
  try {
    const { malId, ep } = req.params;
    let docchiSlug = malId;
    try {
      const seriesRes = await axios.get('https://api.docchi.pl/v1/series/hentai?limit=10000');
      if (Array.isArray(seriesRes.data)) {
        const found = seriesRes.data.find(s => s.mal_id === parseInt(malId));
        if (found && found.slug) {
          docchiSlug = found.slug;
        }
      }
    } catch (e) {
      console.log('Error fetching docchi series list', e.message);
    }
    console.log("Fetching docchi:", docchiSlug, ep);
    const response = await axios.get(\`https://api.docchi.pl/v1/episodes/find/\${docchiSlug}/\${ep}\`);
    if (Array.isArray(response.data) && response.data.length > 0) {
      const episode_url = response.data.map(p => ({
        player: p.player_hosting || 'Unknown',
        url: p.player
      }));
      res.json({ episode_url });
    } else {
      res.json({ episode_url: [] });
    }
  } catch (err) {
    console.log('ERROR docchi:', err.message);
    if (err.response && err.response.status === 404) {
      return res.json({ episode_url: [] });
    }
    res.status(500).json({ status: 500, message: err.message });
  }
});`;

const start = content.indexOf('app.get("/api/docchi');
const end = content.indexOf('app.post("/api/anilist"');
if (start !== -1 && end !== -1) {
  content = content.substring(0, start) + docchiRoute + '\n\n' + content.substring(end);
  fs.writeFileSync('api/index.ts', content);
}
