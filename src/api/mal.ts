import { jikanClient, JikanEpisode } from './jikan';

const malCache = new Map<string, any>();

export type MalEpisode = JikanEpisode;

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

  // Returns episodes with release dates from Jikan API
  async getEpisodes(
    malId: number,
    priorityRange?: { start: number; end: number },
    onProgress?: (eps: MalEpisode[]) => void
  ): Promise<MalEpisode[]> {
    return jikanClient.getEpisodes(malId, priorityRange, onProgress);
  }
};
