const malCache = new Map<string, any>();

export interface MalEpisode {
  num: number;
  title: string;
}

export const malClient = {
  // Returns all episodes for a MAL ID, handling pagination
  async getEpisodes(
    malId: number,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: MalEpisode[]) => void
  ): Promise<MalEpisode[]> {
    const cacheKey = `episodes-state-${malId}`;
    let cacheEntry = malCache.get(cacheKey) as { status: 'fetching' | 'complete', episodes: MalEpisode[], listeners: any[] } | undefined;

    if (cacheEntry) {
      if (onProgress && cacheEntry.status === 'fetching') {
        cacheEntry.listeners.push(onProgress);
      }
      if (onProgress) onProgress(cacheEntry.episodes);
      return cacheEntry.episodes;
    }

    cacheEntry = {
      status: 'fetching',
      episodes: [],
      listeners: onProgress ? [onProgress] : []
    };
    malCache.set(cacheKey, cacheEntry);

    const limit = 100; // MAL limits pagination offset by 100
    
    try {
      const firstOffset = priorityRange ? Math.max(0, Math.floor((priorityRange.start - 1) / limit) * limit) : 0;
      
      const firstRes = await fetch(`/api/mal/anime/${malId}/episodes?offset=${firstOffset}`);
      if (!firstRes.ok) {
        cacheEntry.status = 'complete';
        return cacheEntry.episodes;
      }
      const firstData = await firstRes.json();
      
      if (!firstData.episodes || firstData.episodes.length === 0) {
        cacheEntry.status = 'complete';
        return cacheEntry.episodes;
      }

      let episodesData = [...firstData.episodes];
      
      const updateCacheAndNotify = () => {
        const episodes = [...episodesData];
        episodes.sort((a, b) => a.num - b.num);
        if (cacheEntry) {
          cacheEntry.episodes = episodes;
          cacheEntry.listeners.forEach(fn => fn && fn([...episodes]));
        }
      };

      // Notify UI instantly with the first loaded chunk
      updateCacheAndNotify();

      // For MAL, we don't know totalCount easily without parsing pagination.
      // But we can just fetch offset 0, 100, 200... until we get an empty array.
      // We will do this in the background to not block the initial return.
      const fetchAllOffsets = async () => {
        let currentOffset = 0;
        let hasMore = true;
        
        while (hasMore) {
          if (currentOffset !== firstOffset) {
            const res = await fetch(`/api/mal/anime/${malId}/episodes?offset=${currentOffset}`);
            if (res.ok) {
              const data = await res.json();
              if (data.episodes && data.episodes.length > 0) {
                episodesData = episodesData.concat(data.episodes);
                updateCacheAndNotify();
              } else {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
          currentOffset += limit;
          
          // Failsafe to avoid infinite loop
          if (currentOffset > 5000) hasMore = false;
        }
      };

      fetchAllOffsets().then(() => {
        if (cacheEntry) {
          cacheEntry.status = 'complete';
          cacheEntry.listeners = [];
        }
      });

      return cacheEntry.episodes;
    } catch (e) {
      console.error('MAL episodes error', e);
      if (cacheEntry) cacheEntry.status = 'complete';
      return cacheEntry ? cacheEntry.episodes : [];
    }
  }
};
