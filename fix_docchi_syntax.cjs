const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const correctRoute = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
  try {
    const { anime, ep } = req.params;
    const response = await axios.get(\`https://api.docchi.pl/v1/episodes/find/\${anime}/\${ep}\`);
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
    res.status(500).json({ status: 500, message: err.message });
  }
});`;

const startIdx = content.indexOf('app.get("/api/docchi');
const endIdx = content.indexOf('app.post("/api/anilist"');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + correctRoute + '\n\n' + content.substring(endIdx);
  fs.writeFileSync('api/index.ts', content);
}
