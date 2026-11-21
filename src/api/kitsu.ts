const kitsuCache = new Map<string, any>();

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
    } catch {
      return null;
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
