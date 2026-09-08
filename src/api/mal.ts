const malCache = new Map<string, any>();

export interface MalEpisode {
  num: number;
  title: string;
  aired?: string;
}

export const malClient = {
  async getAnimeType(malId: number): Promise<string | null> {
    const cacheKey = `anime-type-${malId}`;
    if (malCache.has(cacheKey)) return malCache.get(cacheKey);

    try {
      const res = await fetch(`/api/mal/anime/${malId}`);
      if (!res.ok) return null;
      const data = await res.json();
      const type = data.type || null;
      malCache.set(cacheKey, type);
      return type;
    } catch (e) {
      console.error('MAL type fetch error', e);
      return null;
    }
  },

  // Returns episodes for a MAL ID without background spamming
  async getEpisodes(
    malId: number,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: MalEpisode[]) => void
  ): Promise<MalEpisode[]> {
    const cacheKey = `episodes-state-${malId}`;
    let cacheEntry = malCache.get(cacheKey) as {
      status: 'fetching' | 'complete';
      episodes: MalEpisode[];
      episodesMap: Map<number, MalEpisode>;
      fetchedOffsets: Set<number>;
      listeners: ((eps: MalEpisode[]) => void)[];
    } | undefined;

    if (!cacheEntry) {
      cacheEntry = {
        status: 'fetching',
        episodes: [],
        episodesMap: new Map(),
        fetchedOffsets: new Set(),
        listeners: onProgress ? [onProgress] : []
      };
      malCache.set(cacheKey, cacheEntry);
    } else if (onProgress) {
      onProgress(cacheEntry.episodes);
      cacheEntry.listeners.push(onProgress);
    }

    const limit = 100; // MAL limits pagination offset by 100
    const neededOffset = priorityRange ? Math.max(0, Math.floor((priorityRange.start - 1) / limit) * limit) : 0;

    if (cacheEntry.fetchedOffsets.has(neededOffset)) {
      return cacheEntry.episodes;
    }
    
    try {
      cacheEntry.fetchedOffsets.add(neededOffset);
      const res = await fetch(`/api/mal/anime/${malId}/episodes?offset=${neededOffset}`);
      if (!res.ok) {
        cacheEntry.status = 'complete';
        return cacheEntry.episodes;
      }
      const data = await res.json();
      
      if (data.episodes && Array.isArray(data.episodes)) {
        for (const ep of data.episodes) {
          if (ep.num && !cacheEntry.episodesMap.has(ep.num)) {
            cacheEntry.episodesMap.set(ep.num, ep);
          }
        }
      }

      cacheEntry.episodes = Array.from(cacheEntry.episodesMap.values()).sort((a, b) => a.num - b.num);
      cacheEntry.listeners.forEach(fn => fn && fn([...cacheEntry!.episodes]));
      cacheEntry.status = 'complete';
      return cacheEntry.episodes;
    } catch (e) {
      console.error('MAL episodes error', e);
      if (cacheEntry) cacheEntry.status = 'complete';
      return cacheEntry ? cacheEntry.episodes : [];
    }
  }
};
