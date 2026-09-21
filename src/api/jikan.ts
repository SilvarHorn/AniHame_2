const jikanCache = new Map<string, JikanEpisode[]>();
const inflightPromises = new Map<string, Promise<JikanEpisode[]>>();
let lastRequestTime = 0;

export interface JikanEpisode {
  num: number;
  title?: string;
  aired?: string;
}

export function formatJikanDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
  } catch {}
  return String(rawDate);
}

// Throttle function to space out requests to Jikan API (max 3 req/sec)
async function throttleJikan(): Promise<void> {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < 350) {
    await new Promise(resolve => setTimeout(resolve, 350 - diff));
  }
  lastRequestTime = Date.now();
}

export const jikanClient = {
  // Fetches episode metadata and release dates from Jikan API v4
  async getEpisodes(
    malId: number,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: JikanEpisode[]) => void
  ): Promise<JikanEpisode[]> {
    const page = priorityRange ? Math.max(1, Math.floor((priorityRange.start - 1) / 100) + 1) : 1;
    const cacheKey = `jikan_eps_${malId}_page_${page}`;

    if (jikanCache.has(cacheKey)) {
      const cached = jikanCache.get(cacheKey)!;
      if (onProgress && cached.length > 0) {
        onProgress(cached);
      }
      return cached;
    }

    if (inflightPromises.has(cacheKey)) {
      return inflightPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      let episodes: JikanEpisode[] = [];

      // 1. Direct fetch from Jikan API v4
      try {
        await throttleJikan();
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            episodes = json.data.map((ep: any) => ({
              num: ep.mal_id,
              title: ep.title || ep.title_romanji || `Episode ${ep.mal_id}`,
              aired: formatJikanDate(ep.aired)
            }));
          }
        }
      } catch (err) {
        console.warn('Direct Jikan episodes fetch error, trying proxy...', err);
      }

      // 2. Fallback to server proxy (/api/mal/anime/:malId/episodes) which also calls Jikan with cache
      if (episodes.length === 0) {
        try {
          const offset = (page - 1) * 100;
          const res = await fetch(`/api/mal/anime/${malId}/episodes?offset=${offset}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.episodes) && data.episodes.length > 0) {
              episodes = data.episodes.map((ep: any) => ({
                num: ep.num,
                title: ep.title,
                aired: formatJikanDate(ep.aired)
              }));
            }
          }
        } catch (err) {
          console.error('Jikan fallback proxy error', err);
        }
      }

      // 3. Fallback for single-episode anime/movies if episode 1 date is still not found
      if (episodes.length === 0 && page === 1) {
        try {
          await throttleJikan();
          const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
          if (res.ok) {
            const json = await res.json();
            const airedData = json?.data?.aired;
            const airedStr = airedData?.string || formatJikanDate(airedData?.from);
            if (airedStr) {
              episodes = [{
                num: 1,
                title: json.data?.title || 'Episode 1',
                aired: airedStr
              }];
            }
          }
        } catch {}
      }

      if (episodes.length > 0) {
        jikanCache.set(cacheKey, episodes);
        if (onProgress) {
          onProgress(episodes);
        }
      }

      return episodes;
    })().finally(() => {
      inflightPromises.delete(cacheKey);
    });

    inflightPromises.set(cacheKey, promise);
    return promise;
  }
};
