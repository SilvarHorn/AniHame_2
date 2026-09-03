const fs = require('fs');

let apiContent = fs.readFileSync('api/index.ts', 'utf8');

const docchiRegex = /app\.get\("\/api\/docchi\/:anime\/:ep"[\s\S]*?\}\);\n/;

const newDocchiRoute = `app.get("/api/docchi/:anime/:ep", async (req, res) => {
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
});
`;

apiContent = apiContent.replace(docchiRegex, newDocchiRoute);
fs.writeFileSync('api/index.ts', apiContent);
console.log('Updated /api/docchi route');
