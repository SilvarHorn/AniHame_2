export interface MalScrapedEpisode {
  num: number;
  title?: string;
  jpTitle?: string;
  aired?: string; // Formatted strictly as DD/MM/YYYY
}

interface MalScrapedState {
  episodes: Map<number, MalScrapedEpisode>;
  offsetsFetched: Set<number>;
  noMoreAfterOffset: number | null;
}

const SESSION_PREFIX = 'mal_scraped_ep_v1_';
const malTypeCache = new Map<string, string | null>();
const malEpisodeStates = new Map<number, MalScrapedState>();
const inflightRequests = new Map<string, Promise<{ ok: boolean; episodes: MalScrapedEpisode[]; hasNextPage: boolean }>>();

function getOrCreateState(malId: number): MalScrapedState {
  let state = malEpisodeStates.get(malId);
  if (state) return state;

  state = {
    episodes: new Map<number, MalScrapedEpisode>(),
    offsetsFetched: new Set<number>(),
    noMoreAfterOffset: null,
  };

  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${malId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.episodes)) {
        for (const ep of parsed.episodes) {
          if (ep && typeof ep.num === 'number') {
            state.episodes.set(ep.num, ep);
          }
        }
      }
      if (Array.isArray(parsed.offsetsFetched)) {
        parsed.offsetsFetched.forEach((o: number) => state!.offsetsFetched.add(o));
      }
      if (typeof parsed.noMoreAfterOffset === 'number') {
        state.noMoreAfterOffset = parsed.noMoreAfterOffset;
      }
    }
  } catch {}

  malEpisodeStates.set(malId, state);
  return state;
}

function saveStateToSession(malId: number, state: MalScrapedState): void {
  try {
    const payload = {
      episodes: Array.from(state.episodes.values()),
      offsetsFetched: Array.from(state.offsetsFetched),
      noMoreAfterOffset: state.noMoreAfterOffset,
    };
    sessionStorage.setItem(`${SESSION_PREFIX}${malId}`, JSON.stringify(payload));
  } catch {}
}

function getSortedEpisodes(state: MalScrapedState): MalScrapedEpisode[] {
  return Array.from(state.episodes.values()).sort((a, b) => a.num - b.num);
}

async function fetchScrapedOffsetPage(
  malId: number,
  romajiTitle: string,
  offset: number
): Promise<{ ok: boolean; episodes: MalScrapedEpisode[]; hasNextPage: boolean }> {
  const key = `mal_ep_${malId}_${offset}`;
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const params = new URLSearchParams();
      if (romajiTitle) params.set('title', romajiTitle);
      if (offset > 0) params.set('offset', String(offset));
      const qs = params.toString();
      const url = `/api/mal/anime/${malId}/episodes${qs ? `?${qs}` : ''}`;

      const res = await fetch(url);
      if (!res.ok) {
        return { ok: false, episodes: [], hasNextPage: false };
      }
      const json = await res.json();
      const rawList = Array.isArray(json?.episodes) ? json.episodes : [];
      const episodes: MalScrapedEpisode[] = rawList
        .map((ep: any) => ({
          num: Number(ep.num),
          title: typeof ep.title === 'string' && ep.title.trim() ? ep.title.trim() : undefined,
          jpTitle: typeof ep.jpTitle === 'string' && ep.jpTitle.trim() ? ep.jpTitle.trim() : undefined,
          aired: typeof ep.aired === 'string' && ep.aired.trim() ? ep.aired.trim() : undefined,
        }))
        .filter((ep: MalScrapedEpisode) => Number.isFinite(ep.num) && ep.num > 0);

      const hasNextPage = Boolean(json?.pagination?.has_next_page);
      return { ok: true, episodes, hasNextPage };
    } catch {
      return { ok: false, episodes: [], hasNextPage: false };
    }
  })().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

export const malClient = {
  async getAnimeType(malId: number): Promise<string | null> {
    const cacheKey = `anime-type-${malId}`;
    if (malTypeCache.has(cacheKey)) return malTypeCache.get(cacheKey) ?? null;

    try {
      const res = await fetch(`/api/mal/anime/${malId}`);
      if (!res.ok) return null;
      const data = await res.json();
      const type = data.type || null;
      malTypeCache.set(cacheKey, type);
      return type;
    } catch {
      return null;
    }
  },

  /**
   * Scrapes episode English title, Romaji/Japanese title, and DD/MM/YYYY air date
   * directly from https://myanimelist.net/anime/{malId}/{romaji_slug}/episode
   */
  async getEpisodesForRange(
    malId: number,
    romajiTitle: string,
    range: { start: number; end: number },
    onUpdate?: (eps: MalScrapedEpisode[]) => void
  ): Promise<MalScrapedEpisode[]> {
    const state = getOrCreateState(malId);
    const start = Math.max(1, Math.floor(range.start));
    const end = Math.max(start, Math.floor(range.end));

    if (state.episodes.size > 0 && onUpdate) {
      onUpdate(getSortedEpisodes(state));
    }

    const startOffset = Math.floor((start - 1) / 100) * 100;
    const endOffset = Math.floor((end - 1) / 100) * 100;
    const offsetsToFetch: number[] = [];
    for (let o = startOffset; o <= endOffset; o += 100) {
      offsetsToFetch.push(o);
    }

    for (const offset of offsetsToFetch) {
      if (state.offsetsFetched.has(offset)) continue;
      if (state.noMoreAfterOffset !== null && offset > state.noMoreAfterOffset) continue;

      const res = await fetchScrapedOffsetPage(malId, romajiTitle, offset);
      if (res.ok) {
        state.offsetsFetched.add(offset);
        for (const ep of res.episodes) {
          state.episodes.set(ep.num, ep);
        }
        if (!res.hasNextPage) {
          state.noMoreAfterOffset = offset;
        }
        saveStateToSession(malId, state);
        if (onUpdate) {
          onUpdate(getSortedEpisodes(state));
        }
      }
    }

    return getSortedEpisodes(state);
  },
};
