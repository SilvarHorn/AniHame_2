const kitsuCache = new Map<string, any>();

export interface KitsuEpisode {
  num: number;
  title: string;
  thumbnail?: string;
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

  // Returns all episodes for a Kitsu ID, handling pagination in parallel with priority range support
  async getEpisodes(
    kitsuId: string,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: KitsuEpisode[]) => void
  ): Promise<KitsuEpisode[]> {
    const cacheKey = `episodes-state-${kitsuId}`;
    let cacheEntry = kitsuCache.get(cacheKey) as { status: 'fetching' | 'complete', episodes: KitsuEpisode[], listeners: any[] } | undefined;

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
    kitsuCache.set(cacheKey, cacheEntry);

    const limit = 20; // max limit
    
    try {
      const firstOffset = priorityRange ? Math.max(0, Math.floor((priorityRange.start - 1) / limit) * limit) : 0;
      
      // 1. Fetch first chunk of priority
      const firstRes = await fetch(`/api/kitsu/anime/${kitsuId}/episodes?limit=${limit}&offset=${firstOffset}`);
      if (!firstRes.ok) {
        cacheEntry.status = 'complete';
        return cacheEntry.episodes;
      }
      const firstData = await firstRes.json();
      
      if (!firstData.data || firstData.data.length === 0) {
        cacheEntry.status = 'complete';
        return cacheEntry.episodes;
      }

      let episodesData = [...firstData.data];
      const totalCount = firstData.meta?.count || 0;
      
      const updateCacheAndNotify = () => {
        const episodes: KitsuEpisode[] = [];
        for (const ep of episodesData) {
          if (ep.attributes && ep.attributes.number) {
            episodes.push({
              num: ep.attributes.number,
              title: ep.attributes.canonicalTitle || `Episode ${ep.attributes.number}`,
              thumbnail: ep.attributes.thumbnail?.original
            });
          }
        }
        episodes.sort((a, b) => a.num - b.num);
        if (cacheEntry) {
          cacheEntry.episodes = episodes;
          cacheEntry.listeners.forEach(fn => fn && fn([...episodes]));
        }
      };

      // Notify UI instantly with the first loaded chunk
      updateCacheAndNotify();

      // 2. Calculate remaining chunks
      const totalPages = Math.ceil(totalCount / limit);
      const allOffsets = Array.from({ length: totalPages }, (_, i) => i * limit);
      const remainingAllOffsets = allOffsets.filter(o => o !== firstOffset);

      const priorityOffsets: number[] = [];
      const backgroundOffsets: number[] = [];

      if (priorityRange) {
        for (const offset of remainingAllOffsets) {
          const pageStart = offset + 1;
          const pageEnd = offset + limit;
          if (pageStart <= priorityRange.end && pageEnd >= priorityRange.start) {
            priorityOffsets.push(offset);
          } else {
            backgroundOffsets.push(offset);
          }
        }
      } else {
        priorityOffsets.push(...remainingAllOffsets);
      }

      const fetchOffsets = async (offsets: number[]) => {
        const chunkSize = 5;
        for (let i = 0; i < offsets.length; i += chunkSize) {
          const chunk = offsets.slice(i, i + chunkSize);
          const results = await Promise.all(chunk.map(offset => 
            fetch(`/api/kitsu/anime/${kitsuId}/episodes?limit=${limit}&offset=${offset}`)
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          ));
          
          for (const res of results) {
            if (res && res.data) {
              episodesData = episodesData.concat(res.data);
            }
          }
        }
      };

      // 3. Fetch the rest of the priority chunk first (blocks return so UI gets it fast)
      if (priorityOffsets.length > 0) {
        await fetchOffsets(priorityOffsets);
        updateCacheAndNotify();
      }

      // 4. Fetch background chunks silently without blocking
      if (backgroundOffsets.length > 0) {
        fetchOffsets(backgroundOffsets).then(() => {
          updateCacheAndNotify();
          if (cacheEntry) {
            cacheEntry.status = 'complete';
            cacheEntry.listeners = []; // Cleanup memory
          }
        });
      } else {
        if (cacheEntry) {
          cacheEntry.status = 'complete';
          cacheEntry.listeners = [];
        }
      }

      return cacheEntry.episodes;
    } catch (e) {
      console.error('Kitsu episodes error', e);
      if (cacheEntry) cacheEntry.status = 'complete';
      return cacheEntry ? cacheEntry.episodes : [];
    }
  },
  
  // Gets anime info to get the rating
  async getAnime(kitsuId: string): Promise<any> {
    const cacheKey = `anime-info-${kitsuId}`;
    if (kitsuCache.has(cacheKey)) return kitsuCache.get(cacheKey);

    try {
      const res = await fetch(`/api/kitsu/anime/${kitsuId}`);
      if (!res.ok) return null;
      const data = await res.json();
      kitsuCache.set(cacheKey, data.data);
      return data.data;
    } catch(e) {
      return null;
    }
  }
};
