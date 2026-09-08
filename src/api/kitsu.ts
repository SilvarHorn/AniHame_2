const kitsuCache = new Map<string, any>();

export interface KitsuEpisode {
  num: number;
  title: string;
  thumbnail?: string;
}

interface KitsuCacheEntry {
  status: 'fetching' | 'complete';
  episodes: KitsuEpisode[];
  episodesMap: Map<number, KitsuEpisode>;
  fetchedOffsets: Set<number>;
  totalCount: number;
  listeners: ((eps: KitsuEpisode[]) => void)[];
}

export const kitsuClient = {
  // Returns Kitsu Anime ID mapped from MAL ID
  async getKitsuIdByMalId(malId: number): Promise<string | null> {
    const cacheKey = `mapping-${malId}`;
    if (kitsuCache.has(cacheKey)) return kitsuCache.get(cacheKey);

    try {
      const res = await fetch(`/api/kitsu/mappings/${malId}`);
      if (!res.ok) return null;
      const data = await res.json();
      
      if (data && data.included && data.included.length > 0) {
        const id = data.included[0].id;
        kitsuCache.set(cacheKey, id);
        return id;
      }
      return null;
    } catch (e) {
      console.error('Kitsu mapping error', e);
      return null;
    }
  },

  // Returns episodes for a Kitsu ID, fetching only the requested priority range
  async getEpisodes(
    kitsuId: string,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: KitsuEpisode[]) => void
  ): Promise<KitsuEpisode[]> {
    const cacheKey = `episodes-state-${kitsuId}`;
    let cacheEntry = kitsuCache.get(cacheKey) as KitsuCacheEntry | undefined;

    if (!cacheEntry) {
      cacheEntry = {
        status: 'fetching',
        episodes: [],
        episodesMap: new Map(),
        fetchedOffsets: new Set(),
        totalCount: 0,
        listeners: onProgress ? [onProgress] : []
      };
      kitsuCache.set(cacheKey, cacheEntry);
    } else if (onProgress) {
      onProgress(cacheEntry.episodes);
      cacheEntry.listeners.push(onProgress);
    }

    const limit = 20; // Kitsu max limit per request

    // Determine target offsets to fetch
    const targetOffsets: number[] = [];
    if (priorityRange) {
      const startOffset = Math.max(0, Math.floor((priorityRange.start - 1) / limit) * limit);
      const endOffset = Math.max(0, Math.floor((priorityRange.end - 1) / limit) * limit);
      for (let o = startOffset; o <= endOffset; o += limit) {
        if (!cacheEntry.fetchedOffsets.has(o)) {
          targetOffsets.push(o);
        }
      }
    } else {
      // Default: fetch first 2 chunks (up to 40 episodes)
      if (!cacheEntry.fetchedOffsets.has(0)) targetOffsets.push(0);
      if (!cacheEntry.fetchedOffsets.has(20)) targetOffsets.push(20);
    }

    if (targetOffsets.length === 0) {
      return cacheEntry.episodes;
    }

    try {
      // Fetch in small batches of at most 3 requests to avoid rate limits
      const chunkSize = 3;
      for (let i = 0; i < targetOffsets.length; i += chunkSize) {
        const chunk = targetOffsets.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async offset => {
            try {
              cacheEntry!.fetchedOffsets.add(offset);
              const res = await fetch(`/api/kitsu/anime/${kitsuId}/episodes?limit=${limit}&offset=${offset}`);
              if (!res.ok) return null;
              return await res.json();
            } catch {
              return null;
            }
          })
        );

        for (const res of results) {
          if (res?.data && Array.isArray(res.data)) {
            for (const ep of res.data) {
              const num = ep.attributes?.number;
              if (num && !cacheEntry.episodesMap.has(num)) {
                const item: KitsuEpisode = {
                  num,
                  title: ep.attributes?.canonicalTitle || `Episode ${num}`,
                  thumbnail: ep.attributes?.thumbnail?.original
                };
                cacheEntry.episodesMap.set(num, item);
              }
            }
          }
        }

        cacheEntry.episodes = Array.from(cacheEntry.episodesMap.values()).sort((a, b) => a.num - b.num);
        cacheEntry.listeners.forEach(fn => fn && fn([...cacheEntry!.episodes]));
      }

      cacheEntry.status = 'complete';
      return cacheEntry.episodes;
    } catch (e) {
      console.error('Kitsu episodes error', e);
      if (cacheEntry) cacheEntry.status = 'complete';
      return cacheEntry ? cacheEntry.episodes : [];
    }
  },
  
  // Gets anime info to get the rating and categories
  async getAnime(kitsuId: string): Promise<any> {
    const cacheKey = `anime-info-${kitsuId}`;
    if (kitsuCache.has(cacheKey)) return kitsuCache.get(cacheKey);

    try {
      const res = await fetch(`/api/kitsu/anime/${kitsuId}`);
      if (!res.ok) return null;
      const data = await res.json();
      const result = { ...(data.data || {}), included: data.included || [] };
      kitsuCache.set(cacheKey, result);
      return result;
    } catch(e) {
      return null;
    }
  }
};
