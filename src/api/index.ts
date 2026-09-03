import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
app.use(express.json());

const cache = new Map<string, any>();
function getCached(key: string) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) return cached.data;
    return null;
}
function setCached(key: string, data: any) {
    cache.set(key, { data, timestamp: Date.now() });
}

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
    const cacheKey = `anilist_${JSON.stringify(req.body)}`;
    const cached = getCached(cacheKey);
    if (cached) {
        return res.status(200).send(cached);
    }
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.text();
    if (response.ok) {
        setCached(cacheKey, data);
    }
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error("Anilist Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mal/anime/:malId", async (req, res) => {
  const malId = req.params.malId;
  const cacheKey = `mal_details_${malId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const url = `https://myanimelist.net/anime/${malId}`;
  try {
      const response = await axios.get(url, { 
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      let type = '';
      if (response.status === 200) {
          const html = response.data;
          const $ = cheerio.load(html);
          
          $('div.spaceit_pad').each((index, element) => {
              const text = $(element).text();
              if (text.includes('Type:')) {
                  type = $(element).find('a').text().trim() || text.replace('Type:', '').trim();
              }
          });
      }
      
      const result = { type };
      setCached(cacheKey, result);
      res.json(result);
  } catch (error) {
      console.error("MAL Scrape Error (Details):", error);
      res.json({ type: '' });
  }
});

app.get("/api/mal/anime/:malId/episodes", async (req, res) => {
  const malId = req.params.malId;
  const offset = parseInt(req.query.offset as string) || 0;
  const cacheKey = `mal_episodes_${malId}_${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const url = `https://myanimelist.net/anime/${malId}/a/episode?offset=${offset}`;
  try {
      const response = await axios.get(url, { 
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (response.status === 200) {
          const html = response.data;
          const $ = cheerio.load(html);
          const episodes: any[] = [];
          
          $('table.episode_list tbody tr.episode-list-data').each((index, element) => {
              const epNum = $(element).find('td.episode-number').text().trim();
              const title = $(element).find('td.episode-title a.fl-l.fw-b').text().trim();
              const aired = $(element).find('td.episode-aired').text().trim();

              if (epNum && title) {
                  episodes.push({
                      num: parseInt(epNum, 10),
                      title: title,
                      aired: aired === 'N/A' ? '' : aired
                  });
              }
          });
          
          const result = { episodes };
          setCached(cacheKey, result);
          res.json(result);
      } else {
          setCached(cacheKey, { episodes: [] });
          res.json({ episodes: [] });
      }
  } catch (error) {
      console.error("MAL Scrape Error:", error);
      res.json({ episodes: [] }); // Fail gracefully
  }
});

app.get("/api/kitsu/mappings/:malId", async (req, res) => {
  try {
    const { malId } = req.params;
    const cacheKey = `kitsu_mapping_${malId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data);
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
    const cacheKey = `kitsu_episodes_${kitsuId}_${limit}_${offset}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/episodes?page[limit]=${limit}&page[offset]=${offset}`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/kitsu/anime/:kitsuId", async (req, res) => {
  try {
    const { kitsuId } = req.params;
    const cacheKey = `kitsu_anime_${kitsuId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function expandRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number);
  if (isNaN(start) || isNaN(end)) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

app.get("/api/filler/:animeName", async (req, res) => {
  const animeName = req.params.animeName;
  const cacheKey = `filler_${animeName}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

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

          setCached(cacheKey, { fillerEpisodes });
          res.json({ fillerEpisodes });
      } else {
          setCached(cacheKey, { fillerEpisodes: [] });
          res.json({ fillerEpisodes: [] });
      }
  } catch (error) {
      console.error("Filler Scrape Error:", error);
      res.json({ fillerEpisodes: [] }); // Fail gracefully
  }
});

// This unused legacy server module must not contain credentials. The live API
// implementation is api/index.ts and reads its key from server environment.
const NHENTAI_KEY = process.env.NHENTAI_API_KEY;
const NHENTAI_HEADERS = {
    'Authorization': `Key ${NHENTAI_KEY}`,
    'User-Agent': 'AniHame/1.0 (https://ais-dev-o6ghfgue2legdl3ryt35u6-886014336186.asia-southeast1.run.app)'
};

app.get('/api/nhentai/galleries', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const response = await axios.get(`https://nhentai.net/api/v2/galleries?page=${page}`, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/nhentai/galleries/random', async (req, res) => {
    try {
        const response = await axios.get(`https://nhentai.net/api/v2/galleries/random`, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/nhentai/galleries/:id', async (req, res) => {
    try {
        const response = await axios.get(`https://nhentai.net/api/v2/galleries/${req.params.id}`, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/nhentai/search', async (req, res) => {
    try {
        const query = req.query.query;
        const page = req.query.page || 1;
        const response = await axios.get(`https://nhentai.net/api/v2/search?query=${encodeURIComponent(query as string)}&page=${page}`, {
            headers: NHENTAI_HEADERS
        });
        res.json(response.data);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default app;
app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello' });
});
