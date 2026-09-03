const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

const oldEndpoint = `app.get("/api/zhentube", async (req, res) => {
  const { title, episode } = req.query;
  if (!title || !episode) return res.status(400).json({ error: "Missing title or episode" });

  const formattedTitle = String(title).toLowerCase().replace(/[^a-z0-9\\s-]/g, '').trim().replace(/\\s+/g, '-');
  const url1 = \`https://zhentube.com/\${formattedTitle}-episode-\${episode}/\`;
  const url2 = \`https://zhentube.com/\${formattedTitle}-episode-\${episode}-uncensored/\`;

  try {
    let response = await axios.get(url1, {
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (response.status === 404) {
        response = await axios.get(url2, {
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
    }

    if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const iframe = $('iframe.lazyload').first();
        const src = iframe.attr('data-src');
        if (src) {
            return res.json({ src });
        }
    }
    return res.status(404).json({ error: "Video source not found" });
  } catch (error) {
    console.error("ZhenTube Scrape Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});`;

const newEndpoint = `app.get("/api/zhentube", async (req, res) => {
  const { title, episode } = req.query;
  if (!title || !episode) return res.status(400).json({ error: "Missing title or episode" });

  const baseTitle = String(title).toLowerCase();
  
  // Helpers
  const noAnimation = baseTitle.replace(/the animation/g, '').replace(/\\s+/g, ' ').trim();
  const noPunctExceptQuestion = (str) => str.replace(/[^\\w\\s\\?-]/g, '').replace(/\\s+/g, ' ').trim();
  const slugify = (str) => str.replace(/\\s+/g, '-').replace(/\\?/g, '%3F');

  // Generate variants according to rules
  const slugsToTry = [
    // 1. Remove both "the animation" and punctuation except "?"
    slugify(noPunctExceptQuestion(noAnimation)),
    // 2. Remove only "the animation"
    slugify(noAnimation),
    // 3. Remove only punctuation except "?"
    slugify(noPunctExceptQuestion(baseTitle)),
    // 4. Original strict fallback
    baseTitle.replace(/[^a-z0-9\\s-]/g, '').trim().replace(/\\s+/g, '-')
  ];

  // Remove empty and duplicate slugs
  const uniqueSlugs = [...new Set(slugsToTry.filter(Boolean))];

  for (const slug of uniqueSlugs) {
    const url1 = \`https://zhentube.com/\${slug}-episode-\${episode}/\`;
    const url2 = \`https://zhentube.com/\${slug}-episode-\${episode}-uncensored/\`;

    for (const url of [url1, url2]) {
      try {
        const response = await axios.get(url, {
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.status === 200) {
          const html = response.data;
          const $ = cheerio.load(html);
          const iframe = $('iframe.lazyload').first();
          const src = iframe.attr('data-src');
          if (src) {
            return res.json({ src });
          }
        }
      } catch (error) {
        console.error("ZhenTube Scrape Iteration Error:", error.message);
      }
    }
  }

  return res.status(404).json({ error: "Video source not found" });
});`;

if (code.includes('const formattedTitle = String(title).toLowerCase()')) {
    // If exact match fails, use index slicing
    const startIndex = code.indexOf('app.get("/api/zhentube"');
    const endIndex = code.indexOf('});', startIndex) + 3;
    code = code.substring(0, startIndex) + newEndpoint + code.substring(endIndex);
    fs.writeFileSync('api/index.ts', code);
    console.log('Updated api/index.ts successfully');
} else {
    console.log('Could not find endpoint to replace.');
}

