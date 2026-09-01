const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

const correctSearch = `app.get('/api/nhentai/search', async (req, res) => {
    try {
        const query = req.query.query;
        const page = req.query.page || 1;
        const sort = req.query.sort;
        let url = \`https://nhentai.net/api/v2/search?query=\${encodeURIComponent(query as string)}&page=\${page}\`;
        if (sort) {
            url += \`&sort=\${sort}\`;
        }
        const response = await axios.get(url, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});`;

// find everything from app.get('/api/nhentai/search' to the end of file and replace
content = content.replace(/app\.get\('\/api\/nhentai\/search'[\s\S]*$/m, correctSearch + '\n');
fs.writeFileSync('api/index.ts', content);
console.log('done');
