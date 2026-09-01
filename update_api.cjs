const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

const newRoute = `app.get('/api/nhentai/galleries/popular', async (req, res) => {
    try {
        const response = await axios.get(\`https://nhentai.net/api/v2/galleries/popular\`, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/nhentai/search',`;

content = content.replace("app.get('/api/nhentai/search',", newRoute);
fs.writeFileSync('api/index.ts', content);
console.log('done');
