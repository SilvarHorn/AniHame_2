export interface JikanEpisodeThumb {
  num: number;
  thumbnail?: string;
  url?: string;
}

interface PageResult {
  ok: boolean;
  episodes: JikanEpisodeThumb[];
  lastVisiblePage: number;
  hasNextPage: boolean;
}

interface AnimeJikanThumbState {
  thumbs: Map<number, JikanEpisodeThumb>;
  videoPagesFetched: Set<number>;
  videoLastPage: number | null;
  videoMaxEpOnPage1: number | null;
  videoPerPage: number;
  noVideosAvailable: boolean;
}

const SESSION_PREFIX = 'jikan_thumb_v4_';
const animeStates = new Map<number, AnimeJikanThumbState>();
const inflightPageRequests = new Map<string, Promise<PageResult>>();

// Serialized queue so concurrent Jikan thumbnail requests never burst past rate limits
let queueTail: Promise<void> = Promise.resolve();
let lastDispatchTime = 0;
const MIN_REQUEST_INTERVAL_MS = 380;

function enqueueJikan<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastDispatchTime));
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    lastDispatchTime = Date.now();
    return task();
  });
  queueTail = run.then(() => undefined, () => undefined);
  return run;
}

function extractEpisodeNumber(ep: any): number {
  const rawMalId = Number(ep?.mal_id);
  if (Number.isFinite(rawMalId) && rawMalId > 0) {
    return rawMalId;
  }
  if (typeof ep?.episode === 'string') {
    const match = ep.episode.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
  }
  return 0;
}

function extractValidThumbnail(ep: any): string {
  const candidates = [
    ep?.images?.jpg?.large_image_url,
    ep?.images?.jpg?.image_url,
    ep?.images?.webp?.large_image_url,
    ep?.images?.webp?.image_url,
    ep?.image_url,
    ep?.thumbnail,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const url = raw.trim().replace(/^http:\/\//i, 'https://');
      if (
        url.includes('questionmark') ||
        url.includes('qm_50') ||
        url.includes('apple-touch-icon') ||
        url.includes('icon-banned')
      ) {
        continue;
      }
      return url;
    }
  }
  return '';
}

function getOrCreateState(malId: number): AnimeJikanThumbState {
  let state = animeStates.get(malId);
  if (state) return state;

  state = {
    thumbs: new Map<number, JikanEpisodeThumb>(),
    videoPagesFetched: new Set<number>(),
    videoLastPage: null,
    videoMaxEpOnPage1: null,
    videoPerPage: 100,
    noVideosAvailable: false,
  };

  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${malId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.thumbs)) {
        for (const ep of parsed.thumbs) {
          if (ep && typeof ep.num === 'number') {
            state.thumbs.set(ep.num, ep);
          }
        }
      }
      if (Array.isArray(parsed.videoPagesFetched)) {
        parsed.videoPagesFetched.forEach((p: number) => state!.videoPagesFetched.add(p));
      }
      if (typeof parsed.videoLastPage === 'number') state.videoLastPage = parsed.videoLastPage;
      if (typeof parsed.videoMaxEpOnPage1 === 'number') state.videoMaxEpOnPage1 = parsed.videoMaxEpOnPage1;
      if (typeof parsed.videoPerPage === 'number' && parsed.videoPerPage > 0) state.videoPerPage = parsed.videoPerPage;
      if (typeof parsed.noVideosAvailable === 'boolean') state.noVideosAvailable = parsed.noVideosAvailable;
    }
  } catch {}

  animeStates.set(malId, state);
  return state;
}

function saveStateToSession(malId: number, state: AnimeJikanThumbState): void {
  try {
    const payload = {
      thumbs: Array.from(state.thumbs.values()),
      videoPagesFetched: Array.from(state.videoPagesFetched),
      videoLastPage: state.videoLastPage,
      videoMaxEpOnPage1: state.videoMaxEpOnPage1,
      videoPerPage: state.videoPerPage,
      noVideosAvailable: state.noVideosAvailable,
    };
    sessionStorage.setItem(`${SESSION_PREFIX}${malId}`, JSON.stringify(payload));
  } catch {}
}

function mergeThumbsIntoState(state: AnimeJikanThumbState, incoming: JikanEpisodeThumb[]): void {
  for (const ep of incoming) {
    if (!ep.num || ep.num <= 0) continue;
    const existing = state.thumbs.get(ep.num);
    if (!existing) {
      state.thumbs.set(ep.num, { ...ep });
      continue;
    }
    state.thumbs.set(ep.num, {
      num: ep.num,
      thumbnail: ep.thumbnail || existing.thumbnail || undefined,
      url: ep.url || existing.url,
    });
  }
}

function getSortedThumbs(state: AnimeJikanThumbState): JikanEpisodeThumb[] {
  return Array.from(state.thumbs.values()).sort((a, b) => a.num - b.num);
}

async function fetchJikanJson(url: string): Promise<{ ok: boolean; status: number; json: any | null }> {
  const attempt = async () => {
    const res = await fetch(url);
    if (res.status === 429) {
      return { ok: false, status: 429, json: null };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, json: null };
    }
    const json = await res.json();
    return { ok: true, status: res.status, json };
  };

  try {
    const first = await enqueueJikan(attempt);
    if (first.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1100));
      return await enqueueJikan(attempt);
    }
    return first;
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

function parseVideoThumbList(rawList: any[]): JikanEpisodeThumb[] {
  if (!Array.isArray(rawList)) return [];
  const results: JikanEpisodeThumb[] = [];
  for (const ep of rawList) {
    const num = extractEpisodeNumber(ep);
    if (!num) continue;
    const thumbnail = extractValidThumbnail(ep);
    results.push({
      num,
      thumbnail: thumbnail || undefined,
      url: ep?.url || undefined,
    });
  }
  return results;
}

async function fetchVideoThumbsPage(malId: number, page: number): Promise<PageResult> {
  const key = `vid_${malId}_${page}`;
  if (inflightPageRequests.has(key)) {
    return inflightPageRequests.get(key)!;
  }

  const promise = (async (): Promise<PageResult> => {
    // 1. Direct Jikan v4 /anime/{id}/videos/episodes?page={page} (thumbnails ONLY)
    const direct = await fetchJikanJson(`https://api.jikan.moe/v4/anime/${malId}/videos/episodes?page=${page}`);
    if (direct.ok && direct.json) {
      const episodes = parseVideoThumbList(direct.json.data);
      const lastVisiblePage = Number(direct.json.pagination?.last_visible_page) || page;
      const hasNextPage = Boolean(direct.json.pagination?.has_next_page);
      return {
        ok: true,
        episodes,
        lastVisiblePage: Math.max(page, lastVisiblePage),
        hasNextPage,
      };
    }

    // 2. Fallback to server proxy ONLY if direct Jikan failed
    try {
      const proxyRes = await fetch(`/api/mal/anime/${malId}/videos?page=${page}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        const episodes = parseVideoThumbList(json?.episodes || []);
        const lastVisiblePage = Number(json?.pagination?.last_visible_page) || page;
        const hasNextPage = Boolean(json?.pagination?.has_next_page);
        return {
          ok: true,
          episodes,
          lastVisiblePage: Math.max(page, lastVisiblePage),
          hasNextPage,
        };
      }
    } catch {}

    return { ok: false, episodes: [], lastVisiblePage: page, hasNextPage: false };
  })().finally(() => {
    inflightPageRequests.delete(key);
  });

  inflightPageRequests.set(key, promise);
  return promise;
}

function rangeHasAllThumbnails(state: AnimeJikanThumbState, start: number, end: number): boolean {
  for (let ep = start; ep <= end; ep++) {
    if (!state.thumbs.get(ep)?.thumbnail) {
      return false;
    }
  }
  return true;
}

export const jikanClient = {
  /**
   * Fetches episode thumbnails ONLY from Jikan /videos/episodes for the visible range.
   * Episode titles and air dates are NOT fetched from Jikan.
   */
  async getThumbnailsForRange(
    malId: number,
    range: { start: number; end: number },
    onUpdate?: (thumbs: JikanEpisodeThumb[]) => void
  ): Promise<JikanEpisodeThumb[]> {
    const state = getOrCreateState(malId);
    const start = Math.max(1, Math.floor(range.start));
    const end = Math.max(start, Math.floor(range.end));

    if (state.thumbs.size > 0 && onUpdate) {
      onUpdate(getSortedThumbs(state));
    }

    const emit = () => {
      saveStateToSession(malId, state);
      if (onUpdate) {
        onUpdate(getSortedThumbs(state));
      }
    };

    if (!state.noVideosAvailable && !rangeHasAllThumbnails(state, start, end)) {
      if (!state.videoPagesFetched.has(1)) {
        const page1 = await fetchVideoThumbsPage(malId, 1);
        if (page1.ok) {
          state.videoPagesFetched.add(1);
          if (page1.episodes.length === 0) {
            state.noVideosAvailable = true;
            state.videoLastPage = 1;
          } else {
            mergeThumbsIntoState(state, page1.episodes);
            const nums = page1.episodes.map(e => e.num);
            const maxEp1 = Math.max(...nums);
            state.videoMaxEpOnPage1 = maxEp1;
            if (page1.hasNextPage && page1.episodes.length > 0) {
              state.videoPerPage = page1.episodes.length;
            }
            const inferredTotalPages = page1.hasNextPage
              ? Math.max(page1.lastVisiblePage, Math.ceil(maxEp1 / (state.videoPerPage || 100)), 2)
              : page1.lastVisiblePage;
            state.videoLastPage = inferredTotalPages;
          }
          emit();
        }
      }

      if (
        !state.noVideosAvailable &&
        state.videoLastPage !== null &&
        state.videoLastPage > 1 &&
        !rangeHasAllThumbnails(state, start, end)
      ) {
        const perPage = state.videoPerPage || 100;
        const maxEp = state.videoMaxEpOnPage1 || state.videoLastPage * perPage;
        const targetMid = Math.floor((start + end) / 2);
        const isAscending = state.thumbs.has(1) && maxEp <= perPage + 5;
        const rawEstimatedPage = isAscending
          ? Math.floor((targetMid - 1) / perPage) + 1
          : Math.floor((maxEp - targetMid) / perPage) + 1;
        const estimatedPage = Math.max(1, Math.min(state.videoLastPage, rawEstimatedPage));

        let pageMin = Infinity;
        let pageMax = -Infinity;

        if (!state.videoPagesFetched.has(estimatedPage)) {
          const targetRes = await fetchVideoThumbsPage(malId, estimatedPage);
          if (targetRes.ok) {
            state.videoPagesFetched.add(estimatedPage);
            if (targetRes.episodes.length > 0) {
              mergeThumbsIntoState(state, targetRes.episodes);
              const nums = targetRes.episodes.map(e => e.num);
              pageMin = Math.min(...nums);
              pageMax = Math.max(...nums);
            }
            emit();
          }
        }

        if (!rangeHasAllThumbnails(state, start, end) && Number.isFinite(pageMin)) {
          let neighborPage: number | null = null;
          if (isAscending) {
            if (end > pageMax && estimatedPage < state.videoLastPage) {
              neighborPage = estimatedPage + 1;
            } else if (start < pageMin && estimatedPage > 1) {
              neighborPage = estimatedPage - 1;
            }
          } else {
            if (start < pageMin && estimatedPage < state.videoLastPage) {
              neighborPage = estimatedPage + 1;
            } else if (end > pageMax && estimatedPage > 1) {
              neighborPage = estimatedPage - 1;
            }
          }
          if (neighborPage && !state.videoPagesFetched.has(neighborPage)) {
            const neighborRes = await fetchVideoThumbsPage(malId, neighborPage);
            if (neighborRes.ok) {
              state.videoPagesFetched.add(neighborPage);
              if (neighborRes.episodes.length > 0) {
                mergeThumbsIntoState(state, neighborRes.episodes);
              }
              emit();
            }
          }
        }
      }
    }

    return getSortedThumbs(state);
  },
};
