export interface TmdbEpisodeThumb {
  num: number;
  thumbnail?: string;
  runtime?: string;
}

interface TmdbEpisodesResponse {
  tmdbId: number | null;
  mediaType: 'tv' | 'movie' | null;
  season: number | null;
  episodeOffset: number;
  episodes: TmdbEpisodeThumb[];
}

interface ThumbCacheEntry {
  byNum: Map<number, TmdbEpisodeThumb>;
  fetchedRanges: Array<{ start: number; end: number }>;
  timestamp: number;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const SESSION_PREFIX = 'tmdb_ep_v3_';

const thumbCache = new Map<string, ThumbCacheEntry>();
const inflightRangeRequests = new Map<string, Promise<void>>();

function isValidTmdbUrl(url: unknown): url is string {
  return (
    typeof url === 'string' &&
    (/^\/api\/tmdb\/image\?(?:src=(?:tmdb|tvdb)&)?path=%2F[A-Za-z0-9%._-]+$/i.test(url) ||
      url.startsWith('https://media.themoviedb.org/') ||
      url.startsWith('https://image.tmdb.org/'))
  );
}

function buildAnimeKey(anilistId?: number | null, malId?: number | null): string {
  return `a${anilistId || 0}_m${malId || 0}`;
}

function isRangeCovered(ranges: Array<{ start: number; end: number }>, start: number, end: number): boolean {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let coveredUntil = start - 1;
  for (const r of sorted) {
    if (r.start <= coveredUntil + 1) {
      coveredUntil = Math.max(coveredUntil, r.end);
      if (coveredUntil >= end) return true;
    }
  }
  return false;
}

function addRange(ranges: Array<{ start: number; end: number }>, start: number, end: number): void {
  ranges.push({ start, end });
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + 1) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  ranges.length = 0;
  ranges.push(...merged);
}

function getSortedThumbs(entry: ThumbCacheEntry): TmdbEpisodeThumb[] {
  return Array.from(entry.byNum.values()).sort((a, b) => a.num - b.num);
}

function loadEntry(key: string): ThumbCacheEntry | null {
  const mem = thumbCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem;
  }

  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.timestamp >= CACHE_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
      return null;
    }
    const byNum = new Map<number, TmdbEpisodeThumb>();
    if (Array.isArray(parsed.episodes)) {
      for (const ep of parsed.episodes) {
        if (ep && typeof ep.num === 'number' && ep.num > 0) {
          const item: TmdbEpisodeThumb = { num: ep.num };
          if (isValidTmdbUrl(ep.thumbnail)) item.thumbnail = ep.thumbnail;
          if (typeof ep.runtime === 'string' && ep.runtime.trim()) item.runtime = ep.runtime.trim();
          if (item.thumbnail || item.runtime) {
            byNum.set(ep.num, item);
          }
        }
      }
    }
    const entry: ThumbCacheEntry = {
      byNum,
      fetchedRanges: Array.isArray(parsed.fetchedRanges) ? parsed.fetchedRanges : [],
      timestamp: parsed.timestamp
    };
    thumbCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function persistEntry(key: string, entry: ThumbCacheEntry): void {
  try {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      JSON.stringify({
        episodes: getSortedThumbs(entry),
        fetchedRanges: entry.fetchedRanges,
        timestamp: entry.timestamp
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export const tmdbClient = {
  async getThumbnailsForRange(
    ids: { anilistId?: number | null; malId?: number | null },
    range: { start: number; end: number },
    onUpdate?: (thumbs: TmdbEpisodeThumb[]) => void
  ): Promise<TmdbEpisodeThumb[]> {
    const anilistId = ids.anilistId && ids.anilistId > 0 ? ids.anilistId : null;
    const malId = ids.malId && ids.malId > 0 ? ids.malId : null;
    if (!anilistId && !malId) return [];

    const start = Math.max(1, Math.floor(range.start || 1));
    const end = Math.max(start, Math.floor(range.end || start));
    const cacheKey = buildAnimeKey(anilistId, malId);

    let entry = loadEntry(cacheKey);
    if (!entry) {
      entry = {
        byNum: new Map<number, TmdbEpisodeThumb>(),
        fetchedRanges: [],
        timestamp: Date.now()
      };
      thumbCache.set(cacheKey, entry);
    }

    if (entry.byNum.size > 0 && onUpdate) {
      onUpdate(getSortedThumbs(entry));
    }

    if (isRangeCovered(entry.fetchedRanges, start, end)) {
      return getSortedThumbs(entry);
    }

    const reqKey = `${cacheKey}_${start}_${end}`;
    let inflight = inflightRangeRequests.get(reqKey);
    if (!inflight) {
      inflight = (async () => {
        try {
          const params = new URLSearchParams();
          if (anilistId) params.set('anilistId', String(anilistId));
          if (malId) params.set('malId', String(malId));
          params.set('start', String(start));
          params.set('end', String(end));

          const res = await fetch(`/api/tmdb/episodes?${params.toString()}`);
          if (!res.ok) return;

          const data: TmdbEpisodesResponse = await res.json();
          entry!.timestamp = Date.now();

          if (Array.isArray(data.episodes)) {
            for (const ep of data.episodes) {
              if (!ep || typeof ep.num !== 'number' || ep.num <= 0) continue;
              const existing = entry!.byNum.get(ep.num) || { num: ep.num };
              const updated: TmdbEpisodeThumb = { ...existing };
              if (isValidTmdbUrl(ep.thumbnail)) updated.thumbnail = ep.thumbnail;
              if (typeof ep.runtime === 'string' && ep.runtime.trim()) updated.runtime = ep.runtime.trim();
              if (updated.thumbnail || updated.runtime) {
                entry!.byNum.set(ep.num, updated);
              }
            }
          }

          addRange(entry!.fetchedRanges, start, end);
          persistEntry(cacheKey, entry!);
        } catch {
          // Silently fall back to default cover/banner and default duration
        }
      })().finally(() => {
        inflightRangeRequests.delete(reqKey);
      });
      inflightRangeRequests.set(reqKey, inflight);
    }

    await inflight;

    const result = getSortedThumbs(entry);
    if (onUpdate) {
      onUpdate(result);
    }
    return result;
  }
};
