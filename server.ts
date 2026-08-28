import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";

function expandRange(range: string): number[] {
    const [start, end] = range.split('-').map(Number);
    const expandedRange: number[] = [];
    for (let i = start; i <= end; i++) {
        expandedRange.push(i);
    }
    return expandedRange;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  let animeMappings: any[] | null = null;
  let mappingFetchPromise: Promise<any> | null = null;

  async function getAnimeMappings() {
    if (animeMappings) return animeMappings;
    if (!mappingFetchPromise) {
      mappingFetchPromise = fetch('https://raw.githubusercontent.com/SilvarHorn/anime-lists/master/anime-list-mini.json')
        .then(res => res.json())
        .then(data => {
          animeMappings = data;
          return data;
        })
        .catch(err => {
          console.error("Failed to fetch anime mappings", err);
          mappingFetchPromise = null;
          return [];
        });
    }
    return mappingFetchPromise;
  }

  app.get("/api/mapping/:anilistId", async (req, res) => {
    const anilistId = parseInt(req.params.anilistId, 10);
    if (isNaN(anilistId)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    try {
      const mappings = await getAnimeMappings();
      const mapping = mappings.find((m: any) => m.anilist_id === anilistId);
      if (mapping) {
        res.json(mapping);
      } else {
        res.status(404).json({ error: "Mapping not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/anilist", async (req, res) => {
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error: any) {
      console.error("Anilist Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Kitsu API Proxies
  app.get("/api/kitsu/mappings/:malId", async (req, res) => {
    try {
      const { malId } = req.params;
      const response = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/kitsu/anime/:kitsuId/episodes", async (req, res) => {
    try {
      const { kitsuId } = req.params;
      const limit = req.query.limit || 20;
      const offset = req.query.offset || 0;
      const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/episodes?page[limit]=${limit}&page[offset]=${offset}`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/kitsu/anime/:kitsuId", async (req, res) => {
    try {
      const { kitsuId } = req.params;
      const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/filler/:animeName", async (req, res) => {
    const animeName = req.params.animeName;
    const url = `https://www.animefillerlist.com/shows/${animeName}`;
    try {
        const response = await axios.get(url, { validateStatus: () => true });
        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            const fillerEpisodes: number[] = [];
            
            $('div.filler span.Label').each((index, element) => {
                if ($(element).text().trim() === 'Filler Episodes:') {
                    const fillerEpisode = $(element).next().text().trim();
                    const episodes = fillerEpisode.split(',').map(ep => {
                        if (ep.includes('-')) {
                            return expandRange(ep.trim());
                        } else {
                            return [Number(ep.trim())];
                        }
                    });
                    episodes.forEach(arr => fillerEpisodes.push(...arr));
                }
            });
            res.json({ fillerEpisodes });
        } else {
            res.json({ fillerEpisodes: [] });
        }
    } catch (error) {
        console.error("Filler Scrape Error:", error);
        res.json({ fillerEpisodes: [] }); // Fail gracefully
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1y' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
