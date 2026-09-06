import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

// -----------------------------------------------------------------------------
// In-Memory Multi-Tier Cache with TTL & Size Eviction
// -----------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
const apiCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

function getCached(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  if (cached) {
    apiCache.delete(key);
  }
  return null;
}

function setCached(key: string, data: any, ttl: number = DEFAULT_CACHE_DURATION) {
  if (apiCache.size > 8000) {
    let count = 0;
    for (const k of apiCache.keys()) {
      apiCache.delete(k);
      count++;
      if (count > 1500) break;
    }
  }
  apiCache.set(key, { data, timestamp: Date.now(), ttl });
}

// Inflight promise coalescing
const inflightPromises = new Map<string, Promise<any>>();
function coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (inflightPromises.has(key)) {
    return inflightPromises.get(key)!;
  }
  const promise = fetcher().finally(() => {
    inflightPromises.delete(key);
  });
  inflightPromises.set(key, promise);
  return promise;
}

function expandRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number);
  if (isNaN(start) || isNaN(end)) return [];
  const expandedRange: number[] = [];
  for (let i = start; i <= end; i++) {
    expandedRange.push(i);
  }
  return expandedRange;
}

// -----------------------------------------------------------------------------
// Health Endpoint
// -----------------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// -----------------------------------------------------------------------------
// Fast Anime Mappings (Indexed O(1) HashMaps & Preloading)
// -----------------------------------------------------------------------------
let anilistToMapping = new Map<number, any>();
let malToMapping = new Map<number, any>();
let kitsuToMapping = new Map<number, any>();
let mappingFetchPromise: Promise<boolean> | null = null;

async function preloadAnimeMappings(): Promise<boolean> {
  if (anilistToMapping.size > 0) return true;
  if (mappingFetchPromise) return mappingFetchPromise;

  mappingFetchPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('https://raw.githubusercontent.com/SilvarHorn/anime-lists/master/anime-list-mini.json', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const aniMap = new Map<number, any>();
        const malMap = new Map<number, any>();
        const kitMap = new Map<number, any>();
        for (const item of data) {
          if (item.anilist_id) aniMap.set(item.anilist_id, item);
          if (item.mal_id) malMap.set(item.mal_id, item);
          if (item.kitsu_id) kitMap.set(item.kitsu_id, item);
        }
        anilistToMapping = aniMap;
        malToMapping = malMap;
        kitsuToMapping = kitMap;
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn("Failed to fetch anime mappings:", err?.message || err);
      mappingFetchPromise = null;
      return false;
    }
  })();

  return mappingFetchPromise;
}

// Eagerly preload mappings on startup
preloadAnimeMappings().catch(() => {});

app.get("/api/mapping/:anilistId", async (req, res) => {
  const anilistId = parseInt(req.params.anilistId, 10);
  if (isNaN(anilistId)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  let mapping = anilistToMapping.get(anilistId);
  if (!mapping && anilistToMapping.size === 0) {
    await preloadAnimeMappings();
    mapping = anilistToMapping.get(anilistId);
  }

  if (mapping) {
    return res.json(mapping);
  }

  return res.status(404).json({ error: "Mapping not found" });
});

app.get("/api/mapping/mal/:malId", async (req, res) => {
  const malId = parseInt(req.params.malId, 10);
  if (isNaN(malId)) {
    return res.status(400).json({ error: "Invalid MAL ID" });
  }

  let mapping = malToMapping.get(malId);
  if (!mapping && malToMapping.size === 0) {
    await preloadAnimeMappings();
    mapping = malToMapping.get(malId);
  }

  if (mapping) {
    return res.json(mapping);
  }
  return res.status(404).json({ error: "Mapping not found" });
});

// -----------------------------------------------------------------------------
// AniSchedule Feed & Episode Updates Providers
// -----------------------------------------------------------------------------
let cachedScheduleData: any[] | null = null;
let scheduleFetchTime = 0;
let cachedEpisodeFeed: any[] | null = null;
let episodeFeedFetchTime = 0;

async function getAniScheduleFeed(): Promise<any[]> {
  if (cachedScheduleData && Date.now() - scheduleFetchTime < 1000 * 60 * 20) {
    return cachedScheduleData;
  }
  try {
    const res = await axios.get('https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-schedule.json', {
      timeout: 5000
    });
    if (Array.isArray(res.data)) {
      cachedScheduleData = res.data;
      scheduleFetchTime = Date.now();
      return res.data;
    }
  } catch (err: any) {
    console.warn("AniSchedule feed fetch error:", err.message);
  }
  return cachedScheduleData || [];
}

async function getAniEpisodeFeed(): Promise<any[]> {
  if (cachedEpisodeFeed && Date.now() - episodeFeedFetchTime < 1000 * 60 * 10) {
    return cachedEpisodeFeed;
  }
  try {
    const res = await axios.get('https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-episode-feed.json', {
      timeout: 5000
    });
    if (Array.isArray(res.data)) {
      cachedEpisodeFeed = res.data;
      episodeFeedFetchTime = Date.now();
      return res.data;
    }
  } catch (err: any) {
    console.warn("AniEpisode feed fetch error:", err.message);
  }
  return cachedEpisodeFeed || [];
}

// Preload both feeds
getAniScheduleFeed().catch(() => {});
getAniEpisodeFeed().catch(() => {});

// Fast Server-Side Latest Updates Endpoint
app.get("/api/animeschedule/latest", async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const perPage = parseInt(req.query.perPage as string, 10) || 24;
  const isAdult = req.query.isAdult === 'true';

  try {
    const [feed, schedule] = await Promise.all([
      getAniEpisodeFeed(),
      getAniScheduleFeed()
    ]);

    const scheduleMap = new Map<number, any>();
    for (const anime of schedule) {
      scheduleMap.set(anime.id, anime);
    }

    const uniqueAnimeIds = new Set<number>();
    const latestAnime: any[] = [];

    for (const item of feed) {
      if (uniqueAnimeIds.has(item.id)) continue;
      const details = scheduleMap.get(item.id);
      if (details && (isAdult ? details.isAdult : !details.isAdult)) {
        uniqueAnimeIds.add(item.id);
        latestAnime.push({
          id: details.id,
          idMal: details.idMal,
          title: details.title,
          coverImage: {
            large: details.coverImage?.extraLarge || details.coverImage?.medium || "",
            extraLarge: details.coverImage?.extraLarge || details.coverImage?.medium || "",
            color: details.coverImage?.color || "#e49335"
          },
          bannerImage: details.bannerImage || null,
          format: details.format || "TV",
          genres: details.genres || [],
          seasonYear: details.seasonYear,
          isAdult: Boolean(details.isAdult),
          episodes: item.episode?.aired || 1,
          nextAiringEpisode: {
            episode: (item.episode?.aired || 0) + 1,
            airingAt: Math.floor(new Date(item.episode?.airedAt || Date.now()).getTime() / 1000)
          }
        });
      }
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginated = latestAnime.slice(start, end);
    const hasNextPage = end < latestAnime.length;

    return res.json({
      media: paginated,
      pageInfo: { hasNextPage }
    });
  } catch (err: any) {
    console.error("Error in /api/animeschedule/latest:", err.message);
    return res.status(500).json({ error: "Failed to load latest updates" });
  }
});

// -----------------------------------------------------------------------------
// GraphQL Schema Transformers (Converts Kitsu / AniSchedule into AniList Format)
// -----------------------------------------------------------------------------
function mapKitsuToAniListMedia(kitsuItem: any): any {
  if (!kitsuItem || !kitsuItem.attributes) return null;
  const attr = kitsuItem.attributes;
  const kitsuId = parseInt(kitsuItem.id, 10);

  const mapping = kitsuToMapping.get(kitsuId);
  const anilistId = mapping?.anilist_id || kitsuId;
  const malId = mapping?.mal_id || null;

  const categories = Array.isArray(kitsuItem.categories)
    ? kitsuItem.categories
    : [];

  return {
    id: anilistId,
    idMal: malId,
    type: "ANIME",
    format: attr.subtype ? attr.subtype.toUpperCase() : "TV",
    title: {
      romaji: attr.canonicalTitle || attr.titles?.en_jp || "Unknown",
      english: attr.titles?.en || attr.canonicalTitle || "Unknown",
      native: attr.titles?.ja_jp || attr.titles?.ja || ""
    },
    coverImage: {
      extraLarge: attr.posterImage?.original || attr.posterImage?.large || "",
      large: attr.posterImage?.large || attr.posterImage?.medium || "",
      medium: attr.posterImage?.medium || ""
    },
    bannerImage: attr.coverImage?.original || attr.coverImage?.large || null,
    averageScore: attr.averageRating ? Math.round(Number(attr.averageRating)) : 80,
    isAdult: Boolean(attr.ageRatingGuide?.includes("Hentai") || attr.ageRating === "R18"),
    description: attr.synopsis || attr.description || "",
    episodes: attr.episodeCount || null,
    status: attr.status === 'current' ? 'RELEASING' : (attr.status === 'finished' ? 'FINISHED' : 'NOT_YET_RELEASED'),
    genres: categories.length > 0 ? categories : (attr.categories || []),
    tags: [],
    startDate: attr.startDate ? {
      year: new Date(attr.startDate).getFullYear(),
      month: new Date(attr.startDate).getMonth() + 1,
      day: new Date(attr.startDate).getDate()
    } : { year: null, month: null, day: null },
    endDate: attr.endDate ? {
      year: new Date(attr.endDate).getFullYear(),
      month: new Date(attr.endDate).getMonth() + 1,
      day: new Date(attr.endDate).getDate()
    } : { year: null, month: null, day: null },
    studios: { edges: [] },
    trailer: attr.youtubeVideoId ? {
      id: attr.youtubeVideoId,
      site: "youtube",
      thumbnail: `https://img.youtube.com/vi/${attr.youtubeVideoId}/hqdefault.jpg`
    } : null,
    relations: { edges: [] },
    streamingEpisodes: [],
    nextAiringEpisode: attr.status === 'current' ? {
      airingAt: Math.floor(Date.now() / 1000) + 86400 * 3,
      episode: (attr.episodeCount ? attr.episodeCount : 1),
      timeUntilAiring: 86400 * 3
    } : null
  };
}

function mapScheduleItemToAniListMedia(item: any): any {
  if (!item) return null;
  const nextNode = item.airingSchedule?.nodes?.[0];

  return {
    id: item.id,
    idMal: item.idMal || item.id,
    type: "ANIME",
    format: item.format || "TV",
    title: {
      romaji: item.title?.romaji || item.title?.english || "Unknown",
      english: item.title?.english || item.title?.romaji || "Unknown",
      native: item.title?.native || ""
    },
    coverImage: {
      large: item.coverImage?.extraLarge || item.coverImage?.medium || "",
      extraLarge: item.coverImage?.extraLarge || item.coverImage?.medium || "",
      medium: item.coverImage?.medium || ""
    },
    bannerImage: item.bannerImage || null,
    averageScore: 82,
    isAdult: Boolean(item.isAdult),
    description: item.description || "",
    episodes: item.episodes || null,
    status: "RELEASING",
    genres: item.genres || [],
    tags: [],
    nextAiringEpisode: nextNode ? {
      airingAt: nextNode.airingAt,
      episode: nextNode.episode,
      timeUntilAiring: Math.max(0, nextNode.airingAt - Math.floor(Date.now() / 1000))
    } : null,
    studios: { edges: [] },
    relations: { edges: [] }
  };
}

// -----------------------------------------------------------------------------
// Universal Fallback Engine
// -----------------------------------------------------------------------------
async function synthesizeAnilistFallback(body: any): Promise<any> {
  const queryStr = typeof body?.query === 'string' ? body.query : '';
  const variables = body?.variables || {};

  // 1. Details Query (Media(id: $id))
  if (queryStr.includes('Media(id:') || (queryStr.includes('query($id: Int)') && queryStr.includes('Media('))) {
    const rawId = Number(variables.id);
    if (!rawId || isNaN(rawId)) return { data: { Media: null } };

    // A. Check AniSchedule dataset first (instant match for active airing anime)
    const scheduleItems = await getAniScheduleFeed();
    const scheduled = scheduleItems.find(s => s.id === rawId || s.idMal === rawId);
    if (scheduled) {
      const media = mapScheduleItemToAniListMedia(scheduled);
      if (media) return { data: { Media: media } };
    }

    // B. Check ID Mapping to resolve kitsu_id and mal_id
    let mapping = anilistToMapping.get(rawId);
    if (!mapping && anilistToMapping.size === 0) {
      await preloadAnimeMappings();
      mapping = anilistToMapping.get(rawId);
    }

    let kitsuId = mapping?.kitsu_id;
    let malId = mapping?.mal_id || rawId;

    // C. Try Kitsu Details (high reliability & speed)
    try {
      let kitsuUrl = kitsuId ? `https://kitsu.io/api/edge/anime/${kitsuId}?include=categories` : null;

      if (!kitsuUrl && malId) {
        // Resolve via Kitsu MAL mapping
        const kitsuMapRes = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
          timeout: 3000
        });
        const mappedItem = kitsuMapRes.data?.included?.[0];
        if (mappedItem?.id) {
          kitsuId = mappedItem.id;
          kitsuUrl = `https://kitsu.io/api/edge/anime/${kitsuId}?include=categories`;
        }
      }

      if (kitsuUrl) {
        const kitsuRes = await axios.get(kitsuUrl, { timeout: 3500 });
        if (kitsuRes.data?.data) {
          const item = kitsuRes.data.data;
          const categories = (kitsuRes.data.included || [])
            .filter((inc: any) => inc.type === 'categories')
            .map((c: any) => c.attributes?.title)
            .filter(Boolean);

          item.categories = categories;
          const media = mapKitsuToAniListMedia(item);
          if (media) {
            media.id = rawId;
            media.idMal = malId;
            return { data: { Media: media } };
          }
        }
      }
    } catch {}

    // D. Try Jikan details if Kitsu was unavailable
    try {
      const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/full`, {
        timeout: 3000,
        validateStatus: () => true
      });
      if (jikanRes.status === 200 && jikanRes.data?.data) {
        const d = jikanRes.data.data;
        const media = {
          id: rawId,
          idMal: malId,
          type: "ANIME",
          format: d.type ? d.type.toUpperCase() : "TV",
          title: {
            romaji: d.title || d.title_english || "Unknown",
            english: d.title_english || d.title || "Unknown",
            native: d.title_japanese || d.title || "Unknown"
          },
          coverImage: {
            extraLarge: d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url || "",
            large: d.images?.jpg?.large_image_url || "",
            medium: d.images?.jpg?.small_image_url || ""
          },
          bannerImage: d.images?.jpg?.large_image_url || null,
          averageScore: d.score ? Math.round(d.score * 10) : 80,
          isAdult: Boolean(d.rating?.includes("Rx") || d.rating?.includes("Hentai")),
          description: d.synopsis || "",
          episodes: d.episodes || null,
          status: d.airing ? "RELEASING" : "FINISHED",
          genres: Array.isArray(d.genres) ? d.genres.map((g: any) => g.name) : [],
          studios: { edges: [] },
          relations: { edges: [] }
        };
        return { data: { Media: media } };
      }
    } catch {}

    return { data: { Media: null } };
  }

  // 2. Airing Schedule Query (Timetable & Schedule page)
  if (queryStr.includes('airingSchedules(')) {
    const scheduleItems = await getAniScheduleFeed();
    const gte = Number(variables.airingAt_greater) || 0;
    const lte = Number(variables.airingAt_lesser) || Infinity;

    const matchedSchedules: any[] = [];
    for (const anime of scheduleItems) {
      const nodes = anime.airingSchedule?.nodes || [];
      for (const node of nodes) {
        if (node.airingAt >= gte && node.airingAt <= lte) {
          matchedSchedules.push({
            id: Number(anime.id) * 10000 + Number(node.episode),
            airingAt: node.airingAt,
            episode: node.episode,
            media: {
              id: anime.id,
              format: anime.format || "TV",
              countryOfOrigin: anime.countryOfOrigin || "JP",
              isAdult: Boolean(anime.isAdult),
              title: {
                romaji: anime.title?.romaji || anime.title?.english || "Unknown",
                english: anime.title?.english || anime.title?.romaji || "Unknown"
              },
              coverImage: {
                large: anime.coverImage?.extraLarge || anime.coverImage?.medium || "",
                extraLarge: anime.coverImage?.extraLarge || anime.coverImage?.medium || ""
              }
            }
          });
        }
      }
    }

    matchedSchedules.sort((a, b) => a.airingAt - b.airingAt);
    const limit = Math.min(Number(variables.perPage) || 50, 100);

    return {
      data: {
        Page: {
          pageInfo: { hasNextPage: matchedSchedules.length > limit },
          airingSchedules: matchedSchedules.slice(0, limit)
        }
      }
    };
  }

  // 3. Search & Explore Query with Filters
  const isSearchOrFilter = variables.search || variables.genre_in || variables.seasonYear || variables.format_in || queryStr.includes('SEARCH_ANIME_QUERY') || queryStr.includes('search:');

  if (isSearchOrFilter && (variables.search || variables.genre_in || variables.seasonYear)) {
    const page = Math.max(1, Number(variables.page) || 1);
    const limit = Math.min(Number(variables.perPage) || 20, 20);
    const offset = (page - 1) * limit;

    let kitsuQuery = `https://kitsu.io/api/edge/anime?page[limit]=${limit}&page[offset]=${offset}`;
    if (variables.search) {
      kitsuQuery += `&filter[text]=${encodeURIComponent(variables.search)}`;
    }
    if (Array.isArray(variables.genre_in) && variables.genre_in.length > 0) {
      kitsuQuery += `&filter[categories]=${encodeURIComponent(variables.genre_in[0].toLowerCase())}`;
    }
    if (variables.seasonYear) {
      kitsuQuery += `&filter[seasonYear]=${variables.seasonYear}`;
    }

    try {
      const res = await axios.get(kitsuQuery, { timeout: 3500 });
      if (res.status === 200 && Array.isArray(res.data?.data)) {
        const media = res.data.data.map(mapKitsuToAniListMedia).filter(Boolean);
        return {
          data: {
            Page: {
              pageInfo: {
                hasNextPage: res.data.data.length === limit,
                currentPage: page
              },
              media
            }
          }
        };
      }
    } catch {}
  }

  // 4. Trending & Popular Anime List
  const page = Math.max(1, Number(variables.page) || 1);
  const limit = Math.min(Number(variables.perPage) || 20, 24);
  const isAiring = queryStr.includes('TRENDING_DESC') || queryStr.includes('UPDATED_AT_DESC') || queryStr.includes('RELEASING');

  if (isAiring) {
    // Airing/Trending Anime from AniSchedule dataset
    const scheduleItems = await getAniScheduleFeed();
    const filtered = scheduleItems.filter(item => {
      if (variables.countryOfOrigin && item.countryOfOrigin) {
        return item.countryOfOrigin === variables.countryOfOrigin;
      }
      return true;
    });

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    if (paginated.length > 0) {
      const media = paginated.map(mapScheduleItemToAniListMedia).filter(Boolean);
      return {
        data: {
          Page: {
            pageInfo: {
              hasNextPage: start + limit < filtered.length,
              currentPage: page
            },
            media
          }
        }
      };
    }
  }

  // Fallback to Kitsu popular list (Attack on Titan, Death Note, One Piece, etc.)
  try {
    const offset = (page - 1) * 20;
    const sortParam = isAiring ? '-averageRating' : '-userCount';
    const kitsuRes = await axios.get(`https://kitsu.io/api/edge/anime?sort=${sortParam}&page[limit]=20&page[offset]=${offset}`, {
      timeout: 3500
    });

    if (kitsuRes.status === 200 && Array.isArray(kitsuRes.data?.data)) {
      const media = kitsuRes.data.data.map(mapKitsuToAniListMedia).filter(Boolean);
      return {
        data: {
          Page: {
            pageInfo: {
              hasNextPage: kitsuRes.data.data.length === 20,
              currentPage: page
            },
            media
          }
        }
      };
    }
  } catch {}

  return {
    data: {
      Page: {
        pageInfo: { hasNextPage: false, currentPage: page },
        media: []
      }
    }
  };
}

// -----------------------------------------------------------------------------
// POST /api/anilist - High-Speed Resilient Proxy with Automatic Circuit-Breaker
// -----------------------------------------------------------------------------
let anilistCircuitBreakerUntil = 0;

app.post("/api/anilist", async (req, res) => {
  const cacheKey = `anilist_${JSON.stringify(req.body)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  return coalesce(cacheKey, async () => {
    // 1. Try official AniList upstream only if circuit breaker is not active
    let upstreamSuccess = false;
    let upstreamData: any = null;

    if (Date.now() > anilistCircuitBreakerUntil) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify(req.body),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const text = await response.text();
        const json = JSON.parse(text);

        const isTemporarilyDisabled = json?.errors?.some((e: any) =>
          e?.message?.toLowerCase().includes("temporarily disabled") ||
          e?.message?.toLowerCase().includes("stability issues")
        );

        if (response.ok && json && !isTemporarilyDisabled && json.data) {
          upstreamSuccess = true;
          upstreamData = json;
        } else if (isTemporarilyDisabled || response.status === 403) {
          // Engage circuit breaker for 5 minutes to avoid delay on subsequent queries
          anilistCircuitBreakerUntil = Date.now() + 1000 * 60 * 5;
        }
      } catch {
        // Network timeout or error
      }
    }

    if (upstreamSuccess && upstreamData) {
      setCached(cacheKey, upstreamData, 1000 * 60 * 20); // 20 mins
      return res.status(200).json(upstreamData);
    }

    // 2. Synthesize via Fallback Engine (Zero downtime)
    try {
      const fallbackResult = await synthesizeAnilistFallback(req.body);
      if (fallbackResult && fallbackResult.data) {
        setCached(cacheKey, fallbackResult, 1000 * 60 * 30); // 30 mins
        return res.status(200).json(fallbackResult);
      }
    } catch (fallbackErr: any) {
      console.error("AniList fallback error:", fallbackErr?.message || fallbackErr);
    }

    return res.status(500).json({ error: "AniList API temporarily unavailable" });
  });
});

// -----------------------------------------------------------------------------
// GET /api/mal/anime/:malId - High-Speed MAL Metadata (Mapping + Kitsu + Jikan)
// -----------------------------------------------------------------------------
app.get("/api/mal/anime/:malId", async (req, res) => {
  const malId = parseInt(req.params.malId, 10);
  if (isNaN(malId)) return res.status(400).json({ error: "Invalid MAL ID" });

  const cacheKey = `mal_details_${malId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  return coalesce(cacheKey, async () => {
    // 1. Instant Map Lookup
    let mapping = malToMapping.get(malId);
    if (!mapping && malToMapping.size === 0) {
      await preloadAnimeMappings();
      mapping = malToMapping.get(malId);
    }

    let resolvedType = mapping?.type || 'TV';
    let resolvedTitle = '';

    // 2. Try Kitsu Mapping (instant, reliable, no 504)
    try {
      const kitsuRes = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
        timeout: 3000
      });
      const item = kitsuRes.data?.included?.[0];
      if (item && item.attributes) {
        resolvedTitle = item.attributes.canonicalTitle || item.attributes.titles?.en || '';
        if (item.attributes.subtype) {
          resolvedType = item.attributes.subtype.toUpperCase();
        }
      }
    } catch {}

    // 3. Try Jikan if title still missing
    if (!resolvedTitle) {
      try {
        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`, {
          timeout: 2500,
          validateStatus: () => true
        });
        if (jikanRes.status === 200 && jikanRes.data?.data) {
          const d = jikanRes.data.data;
          resolvedTitle = d.title || d.title_english || '';
          if (d.type) resolvedType = d.type.toUpperCase();
        }
      } catch {}
    }

    // 4. Try MAL Scrape fallback if needed
    if (!resolvedTitle) {
      try {
        const malRes = await axios.get(`https://myanimelist.net/anime/${malId}`, {
          timeout: 4000,
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (malRes.status === 200) {
          const $ = cheerio.load(malRes.data);
          resolvedTitle = $('meta[property="og:title"]').attr('content') || $('h1.title-name strong').text().trim();
          $('div.spaceit_pad').each((_, el) => {
            const text = $(el).text();
            if (text.includes('Type:')) {
              resolvedType = $(el).find('a').text().trim() || text.replace('Type:', '').trim();
            }
          });
        }
      } catch {}
    }

    const result = { type: resolvedType, title: resolvedTitle };
    setCached(cacheKey, result, 1000 * 60 * 60 * 12); // 12 hours
    return res.json(result);
  });
});

// -----------------------------------------------------------------------------
// GET /api/mal/anime/:malId/episodes - Triple-Redundant Fast Episodes List
// -----------------------------------------------------------------------------
app.get("/api/mal/anime/:malId/episodes", async (req, res) => {
  const malId = parseInt(req.params.malId, 10);
  if (isNaN(malId)) return res.status(400).json({ error: "Invalid MAL ID" });

  const offset = parseInt(req.query.offset as string, 10) || 0;
  const cacheKey = `mal_episodes_${malId}_${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  return coalesce(cacheKey, async () => {
    // 1. Try Jikan Episodes API (returns 100 clean episodes)
    try {
      const page = Math.floor(offset / 100) + 1;
      const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`, {
        timeout: 2500,
        validateStatus: () => true
      });

      if (jikanRes.status === 200 && Array.isArray(jikanRes.data?.data) && jikanRes.data.data.length > 0) {
        const episodes = jikanRes.data.data.map((ep: any) => {
          let airedStr = '';
          if (ep.aired) {
            try {
              airedStr = new Date(ep.aired).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            } catch {
              airedStr = ep.aired;
            }
          }
          return {
            num: ep.mal_id,
            title: ep.title || ep.title_romanji || `Episode ${ep.mal_id}`,
            aired: airedStr
          };
        });

        const result = { episodes };
        setCached(cacheKey, result, 1000 * 60 * 60 * 4); // 4 hours
        return res.json(result);
      }
    } catch {}

    // 2. Try Kitsu Episodes fallback
    try {
      let mapping = malToMapping.get(malId);
      if (!mapping && malToMapping.size === 0) {
        await preloadAnimeMappings();
        mapping = malToMapping.get(malId);
      }

      let kitsuId = mapping?.kitsu_id;
      if (!kitsuId) {
        const kitsuMapRes = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
          timeout: 3000
        });
        kitsuId = kitsuMapRes.data?.included?.[0]?.id;
      }

      if (kitsuId) {
        const kitsuEpRes = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/episodes?page[limit]=100&page[offset]=${offset}`, {
          timeout: 3000
        });
        if (Array.isArray(kitsuEpRes.data?.data) && kitsuEpRes.data.data.length > 0) {
          const episodes = kitsuEpRes.data.data.map((item: any) => {
            const attr = item.attributes;
            let airedStr = '';
            if (attr.airdate) {
              try {
                airedStr = new Date(attr.airdate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              } catch {
                airedStr = attr.airdate;
              }
            }
            return {
              num: attr.number || 1,
              title: attr.canonicalTitle || `Episode ${attr.number || 1}`,
              aired: airedStr
            };
          });

          const result = { episodes };
          setCached(cacheKey, result, 1000 * 60 * 60 * 4);
          return res.json(result);
        }
      }
    } catch {}

    // 3. Fallback to HTML Scraping
    const url = `https://myanimelist.net/anime/${malId}/a/episode?offset=${offset}`;
    try {
      const response = await axios.get(url, {
        timeout: 4500,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const episodes: any[] = [];

        $('table.episode_list tbody tr.episode-list-data').each((_, element) => {
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
        setCached(cacheKey, result, 1000 * 60 * 60 * 2);
        return res.json(result);
      }
    } catch (error) {
      console.warn("MAL Scrape Error (Episodes):", error);
    }

    const empty = { episodes: [] };
    setCached(cacheKey, empty, 1000 * 60 * 10);
    return res.json(empty);
  });
});

// -----------------------------------------------------------------------------
// Kitsu API Proxies (with Caching & Timeouts)
// -----------------------------------------------------------------------------
app.get("/api/kitsu/mappings/:malId", async (req, res) => {
  try {
    const { malId } = req.params;
    const cacheKey = `kitsu_mapping_${malId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`, {
      timeout: 4000,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data, 1000 * 60 * 60 * 6);
    return res.json(response.data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
      timeout: 4000,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data, 1000 * 60 * 60 * 4);
    return res.json(response.data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/kitsu/anime/:kitsuId", async (req, res) => {
  try {
    const { kitsuId } = req.params;
    const cacheKey = `kitsu_anime_${kitsuId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
      timeout: 4000,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    setCached(cacheKey, response.data, 1000 * 60 * 60 * 6);
    return res.json(response.data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// Filler Episodes API
// -----------------------------------------------------------------------------
app.get("/api/filler/:animeName", async (req, res) => {
  const animeName = req.params.animeName;
  const cacheKey = `filler_${animeName}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const url = `https://www.animefillerlist.com/shows/${animeName}`;
  try {
    const response = await axios.get(url, {
      timeout: 4000,
      validateStatus: () => true
    });

    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);
      const fillerEpisodes: number[] = [];

      $('div.filler span.Label').each((_, element) => {
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

      const result = { fillerEpisodes };
      setCached(cacheKey, result, 1000 * 60 * 60 * 12);
      return res.json(result);
    }
  } catch {}

  const empty = { fillerEpisodes: [] };
  setCached(cacheKey, empty, 1000 * 60 * 60 * 2);
  return res.json(empty);
});

// -----------------------------------------------------------------------------
// NHentai APIs (with Headers & Multi-Level In-Memory Caching)
// -----------------------------------------------------------------------------
const NHENTAI_KEY = process.env.NHENTAI_KEY || 'nhk_fRMH-nP5PSYt3Y3x5o4XZecYQY-19jK6it-5MHjtVONElYxm';
const NHENTAI_HEADERS = {
  'Authorization': `Key ${NHENTAI_KEY}`,
  'User-Agent': 'AniHame/1.0'
};

app.get('/api/nhentai/galleries', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const cacheKey = `nhentai_galleries_${page}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://nhentai.net/api/v2/galleries?page=${page}`, {
      timeout: 5000,
      headers: NHENTAI_HEADERS
    });
    setCached(cacheKey, response.data, 1000 * 60 * 15);
    return res.json(response.data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/nhentai/galleries/popular', async (req, res) => {
  try {
    const cacheKey = `nhentai_galleries_popular`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://nhentai.net/api/v2/galleries/popular`, {
      timeout: 5000,
      headers: NHENTAI_HEADERS
    });
    setCached(cacheKey, response.data, 1000 * 60 * 20);
    return res.json(response.data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/nhentai/galleries/random', async (req, res) => {
  try {
    const response = await axios.get(`https://nhentai.net/api/v2/galleries/random`, {
      timeout: 5000,
      headers: NHENTAI_HEADERS
    });
    return res.json(response.data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/nhentai/galleries/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const cacheKey = `nhentai_gallery_${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get(`https://nhentai.net/api/v2/galleries/${id}`, {
      timeout: 5000,
      headers: NHENTAI_HEADERS
    });
    setCached(cacheKey, response.data, 1000 * 60 * 60 * 2);
    return res.json(response.data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/nhentai/search', async (req, res) => {
  try {
    const query = req.query.query;
    const page = req.query.page || 1;
    const sort = req.query.sort;
    const cacheKey = `nhentai_search_${query}_${page}_${sort}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    let url = `https://nhentai.net/api/v2/search?query=${encodeURIComponent(query as string)}&page=${page}`;
    if (sort) {
      url += `&sort=${sort}`;
    }
    const response = await axios.get(url, {
      timeout: 5000,
      headers: NHENTAI_HEADERS
    });
    setCached(cacheKey, response.data, 1000 * 60 * 15);
    return res.json(response.data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------------------------
// GET /api/zhentube - Smart Search + Direct Probe with Caching
// -----------------------------------------------------------------------------
app.get("/api/zhentube", async (req, res) => {
  const { title, episode } = req.query;
  if (!title || !episode) return res.status(400).json({ error: "Missing title or episode" });

  const cleanEp = String(episode).trim();
  const baseTitle = String(title).toLowerCase();
  const cacheKey = `zhentube_${baseTitle}_${cleanEp}`;
  const cached = getCached(cacheKey);
  if (cached) {
    if (cached.notFound) return res.status(404).json({ error: "Video source not found" });
    return res.json(cached);
  }

  const noAnimation = baseTitle.replace(/the animation/g, '').replace(/\s+/g, ' ').trim();
  const noPunctExceptQuestion = (str: string) => str.replace(/[^\w\s\?-]/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (str: string) => str.replace(/\s+/g, '-').replace(/\?/g, '%3F');

  const slugsToTry = [
    slugify(noPunctExceptQuestion(noAnimation)),
    slugify(noAnimation),
    slugify(noPunctExceptQuestion(baseTitle)),
    baseTitle.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  ];
  const uniqueSlugs = [...new Set(slugsToTry.filter(Boolean))];

  // Build candidate direct URLs including the common suffixes
  const directUrls: string[] = [];
  for (const slug of uniqueSlugs) {
    directUrls.push(`https://zhentube.com/${slug}-episode-${cleanEp}-english-subbed/`);
    directUrls.push(`https://zhentube.com/${slug}-episode-${cleanEp}-subbed/`);
    directUrls.push(`https://zhentube.com/${slug}-episode-${cleanEp}-uncensored/`);
    directUrls.push(`https://zhentube.com/${slug}-episode-${cleanEp}/`);
    directUrls.push(`https://zhentube.com/${slug}-ep-${cleanEp}/`);
  }

  const probeHtmlForVideo = (html: string): string | null => {
    const $ = cheerio.load(html);
    let foundSrc: string | null = null;
    $('iframe').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && !src.includes('xlivrdr.com') && !src.includes('widget') && !src.includes('chaturbate')) {
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
          foundSrc = src.startsWith('//') ? `https:${src}` : src;
          return false; // break each
        }
      }
    });
    return foundSrc;
  };

  const probeUrl = async (url: string): Promise<string> => {
    const response = await axios.get(url, {
      timeout: 3000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (response.status === 200) {
      const src = probeHtmlForVideo(response.data);
      if (src) return src;
    }
    throw new Error('Not found');
  };

  // 1. Try fast direct URLs
  try {
    const foundSrc = await Promise.any(directUrls.map(u => probeUrl(u)));
    setCached(cacheKey, { src: foundSrc }, 1000 * 60 * 60 * 24);
    return res.json({ src: foundSrc });
  } catch {}

  // 2. Try ZhenTube search for the anime title
  try {
    const searchRes = await axios.get(`https://zhentube.com/search/${encodeURIComponent(noAnimation)}/`, {
      timeout: 3500,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (searchRes.status === 200) {
      const $ = cheerio.load(searchRes.data);
      const searchTargetUrls: string[] = [];
      const epRegex = new RegExp(`episode[\\s-_]*${cleanEp}\\b|ep[\\s-_]*${cleanEp}\\b`, 'i');

      $('article a').each((_, el) => {
        const href = $(el).attr('href');
        const titleAttr = $(el).attr('title') || $(el).text() || '';
        if (href && (epRegex.test(href) || epRegex.test(titleAttr))) {
          if (!searchTargetUrls.includes(href)) {
            searchTargetUrls.push(href);
          }
        }
      });

      if (searchTargetUrls.length > 0) {
        const foundSrc = await Promise.any(searchTargetUrls.slice(0, 4).map(u => probeUrl(u)));
        setCached(cacheKey, { src: foundSrc }, 1000 * 60 * 60 * 24);
        return res.json({ src: foundSrc });
      }
    }
  } catch {}

  setCached(cacheKey, { notFound: true }, 1000 * 60 * 5);
  return res.status(404).json({ error: "Video source not found" });
});

export default app;
