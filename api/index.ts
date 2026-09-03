import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 180;
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_CACHE_ENTRIES = 500;
const CACHE_DURATION = 1000 * 60 * 15;

const http = axios.create({
  timeout: UPSTREAM_TIMEOUT_MS,
  maxContentLength: 2 * 1024 * 1024,
  maxBodyLength: 2 * 1024 * 1024,
  validateStatus: () => true,
});

function toPositiveInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum ? number : null;
}

function clientError(res: express.Response, message: string) {
  return res.status(400).json({ error: message });
}

function upstreamError(res: express.Response) {
  return res.status(502).json({ error: "The data provider is temporarily unavailable." });
}

function expandRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end - start > 5_000) {
    return [];
  }
  const expandedRange: number[] = [];
    for (let i = start; i <= end; i++) {
        expandedRange.push(i);
    }
    return expandedRange;
}

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  });
  next();
});
app.use(express.json({ limit: "16kb", strict: true }));

const rateBuckets = new Map<string, { count: number; startedAt: number }>();
app.use((req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const existing = rateBuckets.get(key);
  const bucket = !existing || now - existing.startedAt >= REQUEST_WINDOW_MS
    ? { count: 0, startedAt: now }
    : existing;

  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 10_000) rateBuckets.clear();

  const retryAfter = Math.max(1, Math.ceil((REQUEST_WINDOW_MS - (now - bucket.startedAt)) / 1000));
  res.set({
    "RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "RateLimit-Remaining": String(Math.max(0, MAX_REQUESTS_PER_WINDOW - bucket.count)),
    "RateLimit-Reset": String(retryAfter),
  });
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).set("Retry-After", String(retryAfter)).json({ error: "Too many requests. Please retry shortly." });
  }
  next();
});

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError || (error as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if ((error as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  next(error);
});

for (const parameter of ["anilistId", "malId", "kitsuId", "id"]) {
  app.param(parameter, (req, res, next, value) => {
    if (toPositiveInteger(value, 1, 10_000_000) === null) return clientError(res, `Invalid ${parameter}.`);
    next();
  });
}

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cache for API responses
const apiCache = new Map<string, { data: unknown, timestamp: number }>();

function getCached(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  apiCache.delete(key);
  return null;
}

function setCached(key: string, data: unknown) {
  if (apiCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
  apiCache.set(key, { data, timestamp: Date.now() });
}

function sendCachedJson(res: express.Response, data: unknown) {
  return res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300").json(data);
}

let animeMappings: any[] | null = null;
let mappingFetchPromise: Promise<any> | null = null;

async function getAnimeMappings() {

  if (animeMappings) return animeMappings;
  if (!mappingFetchPromise) {
    mappingFetchPromise = fetch('https://raw.githubusercontent.com/SilvarHorn/anime-lists/master/anime-list-mini.json', {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Mapping request failed with ${res.status}`);
        return res.json();
      })
      .then(data => {
        animeMappings = Array.isArray(data) ? data : [];
        return animeMappings;
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
  const anilistId = toPositiveInteger(req.params.anilistId, 1, 10_000_000)!;
  try {
    const mappings = await getAnimeMappings();
    const mapping = mappings.find((m: any) => m.anilist_id === anilistId);
    if (mapping) {
      sendCachedJson(res, mapping);
    } else {
      res.status(404).json({ error: "Mapping not found" });
    }
  } catch (error) {
    console.error("Mapping lookup failed", error);
    upstreamError(res);
  }
});

app.post("/api/anilist", async (req, res) => {
  const body = req.body as { query?: unknown; variables?: unknown };
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const variables = body?.variables ?? {};
  const variablesSize = JSON.stringify(variables).length;
  if (!query || query.length > 12_000 || /\bmutation\b/i.test(query) || variablesSize > 4_000) {
    return clientError(res, "Provide a read-only AniList query (maximum 12 KB) and small variables object.");
  }

  try {
    const cacheKey = `anilist_${query}_${JSON.stringify(variables)}`;
    const cached = getCached(cacheKey);
    if (cached) {
        return res.status(200).set("Cache-Control", "public, max-age=60, stale-while-revalidate=300").type("application/json").send(cached);
    }

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    
    const data = await response.text();
    if (response.ok) {
        setCached(cacheKey, data);
    }
    res.status(response.status).type("application/json").send(data);
  } catch (error) {
    console.error("AniList proxy failed", error);
    upstreamError(res);
  }
});

app.get("/api/mal/anime/:malId", async (req, res) => {
  const malId = toPositiveInteger(req.params.malId, 1, 10_000_000)!;
  const cacheKey = `mal_details_${malId}`;
  const cached = getCached(cacheKey);
  if (cached) return sendCachedJson(res, cached);

  const url = `https://myanimelist.net/anime/${malId}`;
  try {
      const response = await http.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      let type = '';
      let title = '';
      if (response.status === 200) {
          const html = response.data;
          const $ = cheerio.load(html);
          
          title = $('meta[property="og:title"]').attr('content') || $('h1.title-name strong').text().trim();
          
          $('div.spaceit_pad').each((index, element) => {
              const text = $(element).text();
              if (text.includes('Type:')) {
                  type = $(element).find('a').text().trim() || text.replace('Type:', '').trim();
              }
          });
      }
      
      const result = { type, title };
      setCached(cacheKey, result);
      sendCachedJson(res, result);
  } catch (error) {
      console.error("MAL Scrape Error (Details):", error);
      upstreamError(res);
  }
});

app.get("/api/mal/anime/:malId/episodes", async (req, res) => {
  const malId = toPositiveInteger(req.params.malId, 1, 10_000_000)!;
  const offset = req.query.offset === undefined ? 0 : toPositiveInteger(String(req.query.offset), 0, 10_000);
  if (offset === null) return clientError(res, "Offset must be an integer between 0 and 10000.");
  const cacheKey = `mal_episodes_${malId}_${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return sendCachedJson(res, cached);

  const url = `https://myanimelist.net/anime/${malId}/a/episode?offset=${offset}`;
  try {
      const response = await http.get(url, {
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
          
          // MAL has navigation links for pagination? We can just return total if needed
          // But we can just rely on the frontend fetching until empty.
          
          const result = { episodes };
          setCached(cacheKey, result);
          sendCachedJson(res, result);
      } else {
          setCached(cacheKey, { episodes: [] });
          sendCachedJson(res, { episodes: [] });
      }
  } catch (error) {
      console.error("MAL Scrape Error:", error);
      upstreamError(res);
  }
});

// Kitsu API Proxies
app.get("/api/kitsu/mappings/:malId", async (req, res) => {
  try {
    const malId = toPositiveInteger(req.params.malId, 1, 10_000_000)!;
    const cacheKey = `kitsu_mapping_${malId}`;
    const cached = getCached(cacheKey);
    if (cached) return sendCachedJson(res, cached);

    const response = await http.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
    if (response.status >= 400) return upstreamError(res);
    setCached(cacheKey, response.data);
    sendCachedJson(res, response.data);
  } catch (error) {
    console.error("Kitsu mapping request failed", error);
    upstreamError(res);
  }
});

app.get("/api/kitsu/anime/:kitsuId/episodes", async (req, res) => {
  const kitsuId = toPositiveInteger(req.params.kitsuId, 1, 10_000_000)!;
  const limit = req.query.limit === undefined ? 20 : toPositiveInteger(String(req.query.limit), 1, 50);
  const offset = req.query.offset === undefined ? 0 : toPositiveInteger(String(req.query.offset), 0, 10_000);
  if (limit === null || offset === null) return clientError(res, "Limit must be 1-50 and offset must be 0-10000.");
  try {
    const cacheKey = `kitsu_episodes_${kitsuId}_${limit}_${offset}`;
    const cached = getCached(cacheKey);
    if (cached) return sendCachedJson(res, cached);

    const response = await http.get(`https://kitsu.io/api/edge/anime/${kitsuId}/episodes?page[limit]=${limit}&page[offset]=${offset}`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
    if (response.status >= 400) return upstreamError(res);
    setCached(cacheKey, response.data);
    sendCachedJson(res, response.data);
  } catch (error) {
    console.error("Kitsu episodes request failed", error);
    upstreamError(res);
  }
});

app.get("/api/kitsu/anime/:kitsuId", async (req, res) => {
  try {
    const kitsuId = toPositiveInteger(req.params.kitsuId, 1, 10_000_000)!;
    const cacheKey = `kitsu_anime_${kitsuId}`;
    const cached = getCached(cacheKey);
    if (cached) return sendCachedJson(res, cached);

    const response = await http.get(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
    if (response.status >= 400) return upstreamError(res);
    setCached(cacheKey, response.data);
    sendCachedJson(res, response.data);
  } catch (error) {
    console.error("Kitsu anime request failed", error);
    upstreamError(res);
  }
});

app.get("/api/filler/:animeName", async (req, res) => {
  const animeName = req.params.animeName;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(animeName) || animeName.length > 180) {
    return clientError(res, "Anime name must be a URL-safe slug.");
  }
  const cacheKey = `filler_${animeName}`;
  const cached = getCached(cacheKey);
  if (cached) return sendCachedJson(res, cached);

  const url = `https://www.animefillerlist.com/shows/${animeName}`;
  try {
      const response = await http.get(url);
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
          sendCachedJson(res, { fillerEpisodes });
      } else {
          setCached(cacheKey, { fillerEpisodes: [] });
          sendCachedJson(res, { fillerEpisodes: [] });
      }
  } catch (error) {
      console.error("Filler Scrape Error:", error);
      upstreamError(res);
  }
});


const NHENTAI_KEY = process.env.NHENTAI_API_KEY;
const NHENTAI_HEADERS = NHENTAI_KEY
  ? {
      'Authorization': `Key ${NHENTAI_KEY}`,
      'User-Agent': 'AniHame/1.0',
    }
  : null;

function getGalleryHeaders(res: express.Response) {
  if (!NHENTAI_HEADERS) {
    res.status(503).json({ error: "Gallery data is not configured on this server." });
    return null;
  }
  return NHENTAI_HEADERS;
}

function getPage(value: unknown): number | null {
  return value === undefined ? 1 : toPositiveInteger(String(value), 1, 1_000);
}

app.get('/api/nhentai/galleries', async (req, res) => {
    const page = getPage(req.query.page);
    if (page === null) return clientError(res, "Page must be an integer between 1 and 1000.");
    const headers = getGalleryHeaders(res);
    if (!headers) return;
    try {
        const response = await http.get(`https://nhentai.net/api/v2/galleries?page=${page}`, { headers });
        if (response.status >= 400) return upstreamError(res);
        sendCachedJson(res, response.data);
    } catch(e) {
        console.error("Gallery list request failed", e);
        upstreamError(res);
    }
});

app.get('/api/nhentai/galleries/random', async (req, res) => {
    const headers = getGalleryHeaders(res);
    if (!headers) return;
    try {
        const response = await http.get(`https://nhentai.net/api/v2/galleries/random`, { headers });
        if (response.status >= 400) return upstreamError(res);
        sendCachedJson(res, response.data);
    } catch(e) {
        console.error("Random gallery request failed", e);
        upstreamError(res);
    }
});

app.get('/api/nhentai/galleries/:id', async (req, res) => {
    const headers = getGalleryHeaders(res);
    if (!headers) return;
    try {
        const id = toPositiveInteger(req.params.id, 1, 10_000_000)!;
        const response = await http.get(`https://nhentai.net/api/v2/galleries/${id}`, { headers });
        if (response.status >= 400) return upstreamError(res);
        sendCachedJson(res, response.data);
    } catch(e) {
        console.error("Gallery request failed", e);
        upstreamError(res);
    }
});

app.get('/api/nhentai/galleries/popular', async (req, res) => {
    const headers = getGalleryHeaders(res);
    if (!headers) return;
    try {
        const response = await http.get(`https://nhentai.net/api/v2/galleries/popular`, { headers });
        if (response.status >= 400) return upstreamError(res);
        sendCachedJson(res, response.data);
    } catch(e) {
        console.error("Popular gallery request failed", e);
        upstreamError(res);
    }
});

app.get('/api/nhentai/search', async (req, res) => {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const page = getPage(req.query.page);
    const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
    if (!query || query.length > 160 || page === null || (sort && !/^[a-z-]{1,30}$/.test(sort))) {
      return clientError(res, "Provide a search query (max 160 characters), valid page, and optional safe sort value.");
    }
    const headers = getGalleryHeaders(res);
    if (!headers) return;
    try {
        let url = `https://nhentai.net/api/v2/search?query=${encodeURIComponent(query)}&page=${page}`;
        if (sort) {
            url += `&sort=${sort}`;
        }
        const response = await http.get(url, { headers });
        if (response.status >= 400) return upstreamError(res);
        sendCachedJson(res, response.data);
    } catch(e) {
        console.error("Gallery search request failed", e);
        upstreamError(res);
    }
});

app.get("/api/zhentube", async (req, res) => {
  const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  const episode = toPositiveInteger(String(req.query.episode), 1, 100_000);
  if (!title || title.length > 200 || episode === null) return clientError(res, "Provide a title up to 200 characters and an episode number.");

  const baseTitle = title.toLowerCase();
  
  // Helpers
  const noAnimation = baseTitle.replace(/the animation/g, '').replace(/\s+/g, ' ').trim();
  const noPunctExceptQuestion = (str) => str.replace(/[^\w\s\?-]/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (str) => str.replace(/\s+/g, '-').replace(/\?/g, '%3F');

  // Generate variants according to rules
  const slugsToTry = [
    // 1. Remove both "the animation" and punctuation except "?"
    slugify(noPunctExceptQuestion(noAnimation)),
    // 2. Remove only "the animation"
    slugify(noAnimation),
    // 3. Remove only punctuation except "?"
    slugify(noPunctExceptQuestion(baseTitle)),
    // 4. Original strict fallback
    baseTitle.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  ];

  // Remove empty and duplicate slugs
  const uniqueSlugs = [...new Set(slugsToTry.filter(Boolean))];

  for (const slug of uniqueSlugs) {
    const url1 = `https://zhentube.com/${slug}-episode-${episode}/`;
    const url2 = `https://zhentube.com/${slug}-episode-${episode}-uncensored/`;

    for (const url of [url1, url2]) {
      try {
        const response = await http.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.status === 200) {
          const html = response.data;
          const $ = cheerio.load(html);
          const iframe = $('iframe.lazyload').first();
          const src = iframe.attr('data-src');
          if (src) {
            try {
              const parsed = new URL(src, url);
              if (parsed.protocol === "https:") return sendCachedJson(res, { src: parsed.toString() });
            } catch {
              // Ignore malformed upstream embed URLs.
            }
          }
        }
      } catch (error) {
        console.error("Video source lookup iteration failed", error);
      }
    }
  }

  return res.status(404).json({ error: "Video source not found" });
});

export default app;
