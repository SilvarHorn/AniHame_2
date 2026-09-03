const fs = require('fs');
let apiContent = fs.readFileSync('api/index.ts', 'utf8');

const docchiRegex = /app\.get\("\/api\/docchi\/:anime\/:ep"[\s\S]*?\}\);\n/;

const newDocchiRoute = `app.get("/api/docchi/:malId/:ep", async (req, res) => {
  try {
    const { malId, ep } = req.params;
    
    // 1. Fetch docchi's hentai list to find the correct slug
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

    // 2. Fetch the episodes using the mapped slug
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
    if (err.response && err.response.status === 404) {
      return res.json({ episode_url: [] });
    }
    res.status(500).json({ status: 500, message: err.message });
  }
});
`;

apiContent = apiContent.replace(docchiRegex, newDocchiRoute);
fs.writeFileSync('api/index.ts', apiContent);
console.log('Updated /api/docchi to use malId mapping');
